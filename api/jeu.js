// Sert le jeu (/jouer) et ses questions (/data.json) seulement aux appareils qui ont un code valide.
// Les questions et réglages viennent de la base (modifiables dans le tableau de bord) ; le fichier private/data.json sert de secours.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { accesValide, appareil, db, dbActive, langueDe, lieu, noter } from './_lib.js';
import { questionsPourJeu, analyserImport, lots } from '../public/trad.js';
import { createHash } from 'node:crypto';

const DIR = path.join(process.cwd(), 'private');
let CACHE = null; // { t, body }
async function fichier() { return JSON.parse(await readFile(path.join(DIR, 'data.json'), 'utf8')); }
// Textes anglais des défis, cartes Hassanāt et établissements (les questions anglaises, elles, viennent de la base).
async function annexes() { try { return { en: JSON.parse(await readFile(path.join(DIR, 'contenu-en.json'), 'utf8')) }; } catch { return {}; } }
// Ce que reçoit le jeu : arabe seulement en Religion, traductions validées seulement, français toujours présent.
const pourJeu = (d, tr) => ({ ...d, questions: questionsPourJeu(d.questions, { relire: !!(d.reglages && d.reglages.tradRelire) }), traductions: tr });
async function donnees() {
  if (CACHE && Date.now() - CACHE.t < 60000) return CACHE.body;
  let body = null;
  if (dbActive()) {
    try {
      const c = await db('contenu', {}, { timeout: 6000 });
      if (c && Array.isArray(c.questions) && c.questions.length) {
        const f = (c.defis && c.cells) ? null : await fichier();
        body = JSON.stringify(pourJeu({ questions: c.questions, defis: c.defis || f.defis, hassanat: c.hassanat || f.hassanat, sourates: c.sourates || f.sourates, cells: c.cells || f.cells, reglages: c.reglages || null }, await annexes()));
      }
    } catch (e) { console.error('contenu', e.message); }
  }
  if (!body) body = JSON.stringify(pourJeu(await fichier(), await annexes()));
  CACHE = { t: Date.now(), body };
  return body;
}
async function amorcer() { // première fois : copie les questions du fichier dans la base
  const f = await fichier();
  return db('import', f, { timeout: 25000 });
}
export async function GET(request) {
  const f = new URL(request.url).searchParams.get('f');
  // Import unique des traductions anglaises (fichier private/trad-en-1764.json), protégé par une clé à usage unique.
  // Retiré juste après l'import. Écrit seulement l'anglais, statut « à relire ». ?lot=0..3 (500 lignes par lot), ?simuler=1.
  if (f === 'import-en') {
    const u = new URL(request.url), k = u.searchParams.get('k') || '';
    if (createHash('sha256').update(k).digest('hex') !== 'ccd4d6c219af70891740fe2eb741b88cbdebd5b6ed0dce94133fdafbbe8f6495') return new Response('Refusé', { status: 403 });
    const fichier = JSON.parse(await readFile(path.join(DIR, 'trad-en-1764.json'), 'utf8'));
    const base = await db('questions_liste', {}, { timeout: 20000 });
    const r = analyserImport(fichier, base);
    const lot = Number(u.searchParams.get('lot') || 0), morceau = lots(r.aEcrire, 500)[lot] || [];
    let ecrites = 0;
    if (r.ok && !u.searchParams.has('simuler') && morceau.length) ecrites = (await db('trad_import', { langue: 'en', lignes: morceau }, { timeout: 25000 }))?.ecrites || 0;
    return new Response(JSON.stringify({ ok: r.ok, stats: r.stats, aEcrire: r.aEcrire.length, lot, taille: morceau.length, ecrites, erreurs: r.erreurs.slice(0, 5) }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  if (f === 'ping') { // vérification technique (sans rien montrer du contenu) + amorçage de la base si elle est vide
    const ok = await Promise.all(['jeu.html', 'data.json'].map(n => stat(path.join(DIR, n)).then(() => true, () => false)));
    let base = dbActive() ? 'configurée' : 'absente';
    if (dbActive()) { try { const r = await amorcer(); base = r?.deja ? 'prête' : `importée (${r?.questions} questions)`; } catch (e) { base = 'erreur : ' + e.message; } }
    return new Response(JSON.stringify({ jeu: ok[0], donnees: ok[1], base }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  const code = await accesValide(request, { essaiFiniOk: f === 'data' });
  const site = langueDe(request) === 'en' ? '/en/' : '/';
  if (!code) {
    if (f !== 'data' && await accesValide(request, { essaiFiniOk: true })) return new Response(null, { status: 302, headers: { location: site + '?essai=fini#offre', 'cache-control': 'no-store' } });
    if (f === 'data') return new Response('Accès réservé', { status: 401 });
    return new Response(null, { status: 302, headers: { location: site + '?acces=1#acceder', 'cache-control': 'no-store' } });
  }
  if (f === 'data') return new Response(await donnees(), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-cache' } });
  const dev = appareil(request);
  await noter('event', { kind: 'ouverture', code, device: dev.id, pays: lieu(request).pays });
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-cache' };
  if (dev.cookie) headers['set-cookie'] = dev.cookie;
  return new Response(await readFile(path.join(DIR, 'jeu.html'), 'utf8'), { headers });
}
