// Aide du site (bulle en bas de page), sans IA.
// GET ?quiz=1&lang=fr|en&t=<thème> : une question du jeu, tirée d'une petite sélection fixe (environ 1 question publiée sur 12),
//   pour donner un avant-goût sans dévoiler tout le contenu. Réponse : { t, q, r, s, choix?, bonne? }.
// POST { q, lang, page } : enregistre une question restée sans réponse (onglet Avis du tableau de bord, type « aide »).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { avis, db, dbActive, json, langueDe, lireCookie, signer, verifier } from './_lib.js';
import { questionsPourJeu } from '../public/trad.js';

const THEMES = ['religion', 'invocations', 'geography', 'maths', 'sciences', 'management'];
// Questions qui n'ont de sens que dans la partie (elles renvoient à une carte, une case ou une rubrique) : jamais proposées ici.
const HORS_CONTEXTE = /cette (chronologie|période|periode|sīrah|sirah|rubrique|carte|case|liste|frise)|coffre|placée? au début|ci-dessus|ci-dessous|this (timeline|period|card|square|list)|above|below/i;
let POOL = null; // { t, liste }
const h = (s) => { let x = 2166136261; for (const c of String(s)) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0; return x; };

async function contenu() {
  if (dbActive()) {
    try { const c = await db('contenu', {}, { timeout: 6000 }); if (c && Array.isArray(c.questions) && c.questions.length) return c; } catch (e) { console.error('aide contenu', e.message); }
  }
  return JSON.parse(await readFile(path.join(process.cwd(), 'private', 'data.json'), 'utf8'));
}
async function pool() {
  if (POOL && Date.now() - POOL.t < 600e3) return POOL.liste;
  const c = await contenu();
  const actifs = new Set(c.reglages && Array.isArray(c.reglages.themes) && c.reglages.themes.length ? c.reglages.themes : THEMES);
  const qs = questionsPourJeu(c.questions, { relire: !!(c.reglages && c.reglages.tradRelire) });
  const liste = qs.filter(q => actifs.has(q.t) && h(q.id) % 12 === 0 && !HORS_CONTEXTE.test((q.q && q.q.fr) || ''));
  POOL = { t: Date.now(), liste };
  return liste;
}
// « Question ? A. … B. … C. … » → énoncé + choix ; la réponse « B. … » donne l'indice du bon choix.
function decouper(q, r) {
  const m = q.match(/^(.*?)\s+A[.)]\s+(.+)$/s);
  if (!m) return { q };
  const choix = m[2].split(/\s+[B-F][.)]\s+/).map(s => s.trim()).filter(Boolean);
  const l = String(r).trim().match(/^([A-F])[.)]/);
  if (choix.length < 2 || !l) return { q };
  const bonne = l[1].charCodeAt(0) - 65;
  return bonne < choix.length ? { q: m[1].trim(), choix, bonne } : { q };
}

export async function GET(request) {
  const u = new URL(request.url), en = langueDe(request, { lang: u.searchParams.get('lang') }) === 'en', l = en ? 'en' : 'fr';
  if (!u.searchParams.has('quiz')) return json(400, { ok: false });
  const t = u.searchParams.get('t');
  try {
    let liste = (await pool()).filter(q => q.q[l] && q.r[l] && q.q[l].length <= 260);
    if (THEMES.includes(t)) liste = liste.filter(q => q.t === t);
    if (!liste.length) return json(404, { ok: false });
    const q = liste[Math.floor(Math.random() * liste.length)];
    return json(200, { ok: true, t: q.t, r: q.r[l], s: q.s || '', ...decouper(q.q[l], q.r[l]) });
  } catch (e) {
    console.error('aide', e.message);
    return json(500, { ok: false });
  }
}

export async function POST(request) {
  let b = {}; try { b = await request.json(); } catch {}
  const q = String(b.q || '').trim().slice(0, 300);
  if (q.length < 3 || !dbActive()) return json(200, { ok: true });
  // Limite par appareil : 20 questions notées par heure.
  const [n0, t0] = String(verifier(decodeURIComponent(lireCookie(request, 'kz_aide') || '')) || '').split('-');
  const debut = Number(t0) > Date.now() - 3600e3 ? Number(t0) : Date.now(), n = debut === Number(t0) ? Number(n0) || 0 : 0;
  if (n >= 20) return json(200, { ok: true });
  try {
    await avis('avis_ajout', { type: 'aide', message: q, nom: '', email: '', lang: langueDe(request, b) === 'en' ? 'en' : 'fr', page: String(b.page || '').slice(0, 200), appareil: '' }, { timeout: 5000 });
  } catch (e) { console.error('aide noter', e.message); }
  return json(200, { ok: true }, { 'set-cookie': `kz_aide=${encodeURIComponent(signer(`${n + 1}-${debut}`))}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax` });
}
