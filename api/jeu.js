// Sert le jeu (/jouer) et ses questions (/data.json) seulement aux appareils qui ont un code valide.
// Les questions et réglages viennent de la base (modifiables dans le tableau de bord) ; le fichier private/data.json sert de secours.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { accesValide, appareil, db, dbActive, evenementsContenu, langueDe, lieu, noter } from './_lib.js';
import { questionsPourJeu } from '../public/trad.js';

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
        // Les défis viennent toujours du fichier déployé (ils ne se modifient pas dans le tableau de bord) : une nouvelle version
        // des défis arrive donc avec le déploiement, sans toucher à la base.
        const f = await fichier();
        // Événements : le jeu décide lui-même (date de l'appareil) si l'un d'eux est en cours. Les questions et défis d'un
        // événement ne sortent que pendant ses dates ; en dehors, ils restent de côté.
        const E = await evenementsContenu();
        const evenements = (E.evenements || []).filter(e => e.actif).map(e => ({ id: e.id, nom: e.nom, debut: e.debut, fin: e.fin, accueil: e.accueil || {}, plateau: e.plateau ? `/api/media?id=${e.plateau}` : null }));
        body = JSON.stringify(pourJeu({ questions: c.questions, defis: [...f.defis, ...(E.defis || [])], hassanat: c.hassanat || f.hassanat, sourates: c.sourates || f.sourates, cells: c.cells || f.cells, reglages: c.reglages || null,
          evenements, evq: E.tags || {} }, await annexes()));
      }
    } catch (e) { console.error('contenu', e.message); }
  }
  if (!body) body = JSON.stringify(pourJeu(await fichier(), await annexes()));
  CACHE = { t: Date.now(), body };
  return body;
}

export async function GET(request) {
  const f = new URL(request.url).searchParams.get('f');
  if (f === 'ping') { // vérification technique (sans rien montrer du contenu). La base n'est plus jamais remplie
    // automatiquement depuis le fichier : les questions s'importent uniquement depuis le tableau de bord.
    const ok = await Promise.all(['jeu.html', 'data.json'].map(n => stat(path.join(DIR, n)).then(() => true, () => false)));
    let base = dbActive() ? 'configurée' : 'absente';
    // TEMPORAIRE (relecture V42 Religion 5-8 du 7 nov. 2026) : aligne la base sur le fichier (mise à jour par identifiant). Retiré ensuite.
    if (dbActive() && new URL(request.url).searchParams.get('sync') === 'v42') {
      try { const f = await fichier(), ex = JSON.parse(await readFile(path.join(DIR, 'exclus.json'), 'utf8'));
        const r = await db('import_maj', { questions: f.questions, exclus: ex.ids_exclus }, { timeout: 55000 }); base = `alignée (${r?.questions} questions, ${r?.publiees} publiées)`; } catch (e) { base = 'erreur : ' + e.message; }
    }
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
  // Pays de connexion transmis au jeu : il choisit la langue de départ tant que la famille n'en a pas choisi une.
  const pays = /^[A-Z]{2}$/.test(lieu(request).pays || '') ? lieu(request).pays : '';
  // Manifeste personnalisé : l'application installée s'ouvrira sur le lien de la famille (/j/CODE).
  return new Response((await readFile(path.join(DIR, 'jeu.html'), 'utf8')).replace('<html lang="fr">', `<html lang="fr" data-pays="${pays}" data-lien="/j/${code}">`)
    .replace('<link rel="manifest" href="/manifest.webmanifest">', `<link rel="manifest" href="/api/manifest?c=${encodeURIComponent(code)}">`), { headers });
}
