// Sert le jeu (/jouer) et ses questions (/data.json) seulement aux appareils qui ont un code valide.
// Les questions et réglages viennent de la base (modifiables dans le tableau de bord) ; le fichier private/data.json sert de secours.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { accesValide, appareil, db, dbActive, lieu, noter } from './_lib.js';

const DIR = path.join(process.cwd(), 'private');
let CACHE = null; // { t, body }
async function fichier() { return JSON.parse(await readFile(path.join(DIR, 'data.json'), 'utf8')); }
async function donnees() {
  if (CACHE && Date.now() - CACHE.t < 60000) return CACHE.body;
  let body = null;
  if (dbActive()) {
    try {
      const c = await db('contenu', {}, { timeout: 6000 });
      if (c && Array.isArray(c.questions) && c.questions.length) {
        const f = (c.defis && c.cells) ? null : await fichier();
        body = JSON.stringify({ questions: c.questions, defis: c.defis || f.defis, hassanat: c.hassanat || f.hassanat, sourates: c.sourates || f.sourates, cells: c.cells || f.cells, reglages: c.reglages || null });
      }
    } catch (e) { console.error('contenu', e.message); }
  }
  if (!body) body = JSON.stringify(await fichier());
  CACHE = { t: Date.now(), body };
  return body;
}
async function amorcer() { // première fois : copie les questions du fichier dans la base
  const f = await fichier();
  return db('import', f, { timeout: 25000 });
}
export async function GET(request) {
  const f = new URL(request.url).searchParams.get('f');
  if (f === 'ping') { // vérification technique (sans rien montrer du contenu) + amorçage de la base si elle est vide
    const ok = await Promise.all(['jeu.html', 'data.json'].map(n => stat(path.join(DIR, n)).then(() => true, () => false)));
    let base = dbActive() ? 'configurée' : 'absente';
    if (dbActive()) { try { const r = await amorcer(); base = r?.deja ? 'prête' : `importée (${r?.questions} questions)`; } catch (e) { base = 'erreur : ' + e.message; } }
    return new Response(JSON.stringify({ jeu: ok[0], donnees: ok[1], base }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  const code = await accesValide(request, { essaiFiniOk: f === 'data' });
  if (!code) {
    if (f !== 'data' && await accesValide(request, { essaiFiniOk: true })) return new Response(null, { status: 302, headers: { location: '/?essai=fini#offre', 'cache-control': 'no-store' } });
    if (f === 'data') return new Response('Accès réservé', { status: 401 });
    return new Response(null, { status: 302, headers: { location: '/?acces=1#acceder', 'cache-control': 'no-store' } });
  }
  if (f === 'data') return new Response(await donnees(), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-cache' } });
  const dev = appareil(request);
  await noter('event', { kind: 'ouverture', code, device: dev.id, pays: lieu(request).pays });
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-cache' };
  if (dev.cookie) headers['set-cookie'] = dev.cookie;
  return new Response(await readFile(path.join(DIR, 'jeu.html'), 'utf8'), { headers });
}
