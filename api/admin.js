// Tableau de bord de Farouk : chiffres, codes, questions, réglages du jeu.
// Protégé par le mot de passe KZ_ADMIN (variable Vercel).
import { createHash, timingSafeEqual } from 'node:crypto';
import { IDS_TRANCHES, normaliserTranche, trancheDeLAge } from '../public/ages.js';
import { analyserImport, lots, STATUTS_TRAD } from '../public/trad.js';
import { chevauchements, ID_EV, lignesQuestions, verifierDefi, verifierEvenement } from './_evenements.js';
import { avis, contacts, evdb, viderCacheEvenements, moyens, codeCadeau, codePourPaiement, codeValide, db, dbActive, formater, json, oublierRevocation, PRIX } from './_lib.js';

const THEMES = ['religion', 'maths', 'geography', 'sciences', 'logic', 'management', 'invocations'];
const ROTATION = ['family', 'hassanat', 'duel', 'question'];
export const REGLAGES_DEFAUT = {
  themes: THEMES,
  eco: { qGood: 100, qPartial: 50, startPass: 200, treasure: 200, duelWin: 150, duelTie: 50, familyX: 2, donation: 30, donationHassanat: 10, visitRate: 0.15 },
  defis: ['family', 'duel', 'family', 'family'],
  minuteur: { enfant: 60, adulte: 45 },
  eviter: 15,
  durees: { rapide: 30, classique: 45, grande: 60 },
  essaiMinutes: 10, // durée d'une partie jouée avec un code d'essai
  zakat: { tours: 1.5, nissab: 1000 }, // Zakat al-Māl du jeu : tours de table au-dessus du nissab avant de verser 2,5 %
  explications: ['religion', 'invocations'], // thèmes dont l'explication est proposée après la réponse
  prononciation: [], // [{ e: 'Ishaaq', d: 'إسحاق' }] : comment la voix doit dire certains mots (prénoms arabes…)
  tradRelire: false, // true : les traductions « à relire » sont déjà montrées dans le jeu (sinon seulement les validées)
};

// Dictionnaire de prononciation : 400 entrées au plus, 60 caractères par mot, sans caractère de contrôle ni doublon.
function lirePrononciation(liste) {
  const vus = new Set(), out = [];
  for (const p of Array.isArray(liste) ? liste : []) {
    const e = String(p?.e ?? '').replace(/\s+/g, ' ').trim(), d = String(p?.d ?? '').replace(/\s+/g, ' ').trim();
    if (!e || !d || e.length > 60 || d.length > 60 || /[\u0000-\u001f<>]/.test(e + d) || vus.has(e.toLowerCase())) continue;
    vus.add(e.toLowerCase()); out.push({ e, d });
    if (out.length >= 400) break;
  }
  return out;
}

function autorise(request) {
  const pw = process.env.KZ_ADMIN || '', got = request.headers.get('x-admin') || '';
  if (pw.length < 8 || got.length !== pw.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(pw));
}
const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const txt = (v, max = 600) => (v == null ? '' : String(v)).trim().slice(0, max);

export function verifierQuestion(b) {
  const t = b.t;
  if (!THEMES.includes(t)) return { erreur: 'Thème inconnu.' };
  // Langues gardées : français, arabe, anglais (une traduction déjà présente n'est jamais perdue à la modification).
  const LANGUES = ['fr', 'ar', 'en'];
  const champ = (o, max) => Object.fromEntries(LANGUES.map(l => [l, txt(o?.[l], max)]).filter(([, v]) => v));
  const q = champ(b.q, 600), r = champ(b.r, 600), e = champ(b.e, 1200);
  if (!q.fr || !r.fr) return { erreur: 'La question et la réponse en français sont obligatoires.' };
  const d = num(b.d, 1, 5, 1);
  // Tranche d'âge obligatoire pour toutes les matières, maths comprises (5-8, 9-12, 13-17, 18+) : une question sans tranche
  // ne serait jamais proposée, et ne doit surtout pas tomber chez un joueur d'un autre âge.
  const a = normaliserTranche(b.a);
  if (!a) return { erreur: `Tranche d'âge obligatoire (attendu : ${IDS_TRANCHES.join(', ')}).` };
  // Âge minimum recommandé : dans la tranche ; à défaut, le bas de la tranche.
  const bas = { '5-8': 5, '9-12': 9, '13-17': 13, '18+': 18 }[a];
  const am = b.am == null || b.am === '' ? bas : num(b.am, 3, 99, bas);
  if (trancheDeLAge(am) !== a) return { erreur: `L'âge minimum (${am} ans) doit être dans la tranche ${a}.` };
  // QCM à 3 choix (5-8 ans surtout) : A, B, C en français (anglais facultatif) et la bonne lettre.
  let qcm = null;
  if (b.qcm && typeof b.qcm === 'object' && b.qcm.fr) {
    const choix = (o) => { const r = {}; for (const k of ['A', 'B', 'C']) { const v = txt(o?.[k], 200); if (v) r[k] = v; } return r; };
    const fr = choix(b.qcm.fr), en = choix(b.qcm.en), ok = String(b.qcm.ok || '').toUpperCase();
    if (Object.keys(fr).length !== 3 || !fr[ok]) return { erreur: 'QCM : il faut les trois choix A, B, C en français et la bonne réponse (A, B ou C).' };
    qcm = { fr, ok, ...(Object.keys(en).length === 3 ? { en } : {}) };
  }
  const statut = ['publiee', 'brouillon', 'archivee'].includes(b.statut) ? b.statut : 'brouillon';
  const s = txt(b.s, 300);
  // Contenu religieux : jamais publié sans source ni sans explication en français.
  // L'explication en arabe est facultative en attendant les traductions (décision de Farouk du 7 nov. 2026).
  if (t === 'religion' && statut === 'publiee' && (!s || !e.fr))
    return { erreur: 'Une question de religion ne peut être publiée qu’avec sa source et son explication en français. Enregistre-la en brouillon en attendant.' };
  const id = txt(b.id, 60) || `${t.slice(0, 3).toUpperCase()}-A-${Date.now().toString(36).toUpperCase()}`;
  // p58 : question d'Histoire des prophètes écrite pour les 5-8 ans (seules celles-là leur sont posées dans cette matière).
  const question = { id, t, d, a, am, qcm, p58: t === 'geography' && a === '5-8' && !!b.p58, q, r, e, s, src: txt(b.src, 120), statut, poids: num(b.poids, 0, 5, 1), prio: !!b.prio };
  // Statut de traduction (indépendant de la publication) : envoyé seulement s'il est fourni, sinon la base garde l'actuel.
  if (b.trad && typeof b.trad === 'object') question.trad = Object.fromEntries(Object.entries(b.trad).filter(([l, v]) => /^[a-z]{2}$/.test(l) && !['fr', 'ar'].includes(l) && STATUTS_TRAD.includes(v)));
  return { question };
}
function verifierReglages(b) {
  const D = REGLAGES_DEFAUT, eco = {};
  const themes = (Array.isArray(b.themes) ? b.themes : D.themes).filter((t, i, a) => THEMES.includes(t) && a.indexOf(t) === i);
  if (!themes.length) return { erreur: 'Il faut au moins un thème actif.' };
  for (const [k, v] of Object.entries(D.eco)) eco[k] = num(b.eco?.[k], 0, k === 'visitRate' ? 1 : k === 'familyX' ? 10 : 5000, v);
  const defis = (Array.isArray(b.defis) ? b.defis : D.defis).filter(x => ROTATION.includes(x)).slice(0, 12);
  if (!defis.length) return { erreur: 'La rotation des cases Défi ne peut pas être vide.' };
  return { reglages: {
    themes, eco, defis,
    minuteur: { enfant: num(b.minuteur?.enfant, 15, 180, 60), adulte: num(b.minuteur?.adulte, 15, 180, 45) },
    eviter: num(b.eviter, 0, 100, 15),
    essaiMinutes: num(b.essaiMinutes, 3, 60, 10),
    zakat: { tours: Math.min(12, Math.max(0.5, Math.round((Number(b.zakat?.tours) || 1.5) * 2) / 2)), nissab: num(b.zakat?.nissab, 100, 100000, 1000) },
    durees: { rapide: num(b.durees?.rapide, 10, 120, 30), classique: num(b.durees?.classique, 10, 180, 45), grande: num(b.durees?.grande, 10, 240, 60) },
    tradRelire: !!b.tradRelire,
    explications: (Array.isArray(b.explications) ? b.explications : D.explications).filter((t, i, a) => THEMES.includes(t) && a.indexOf(t) === i),
    prononciation: lirePrononciation(b.prononciation),
  } };
}

// Carte Hassanāt (tableau de bord) : texte FR obligatoire, EN facultatif ; le coût va à la banque ou au joueur aidé.
export function verifierCartesHassanat(liste) {
  const L = Array.isArray(liste) ? liste.slice(0, 60) : [], out = [], ids = new Set();
  for (const [i, c] of L.entries()) {
    const title = txt(c?.title, 60), text = txt(c?.text, 200);
    if (!title || !text) return { erreur: `Carte ${i + 1} : le titre et le texte en français sont obligatoires.` };
    let id = txt(c?.id, 30) || `HS-${String(i + 1).padStart(3, '0')}`; while (ids.has(id)) id += 'b'; ids.add(id);
    out.push({ id, kind: txt(c?.kind, 30) || 'perso', title, text, title_en: txt(c?.title_en, 60), text_en: txt(c?.text_en, 200),
      cost: Math.round(num(c?.cost, 0, 5000, 20)), hassanatReward: Math.round(num(c?.hassanatReward, 0, 1000, 10)), costDestination: c?.costDestination === 'beneficiary' ? 'beneficiary' : 'none',
      animationKey: txt(c?.animationKey, 30) || 'hassanat_meal' });
  }
  if (!out.length) return { erreur: 'Il faut au moins une carte Hassanāt.' };
  return { cartes: out };
}

export async function POST(request) {
  if (!autorise(request)) { await new Promise(r => setTimeout(r, 800)); return json(401, { erreur: 'Mot de passe incorrect.' }); }
  let b = {}; try { b = await request.json(); } catch {}
  const base = dbActive();
  try {
    switch (b.action) {
      case 'entrer': return json(200, { ok: true, base, prix: PRIX, moyens: moyens() });
      case 'stats': return json(200, base ? await db('stats') : {});
      case 'codes': return json(200, { codes: base ? await db('codes_liste') : [] });
      case 'contacts': return json(200, { contacts: base ? await contacts('liste', {}, { timeout: 8000 }) : [] });
      case 'avis': return json(200, { avis: base ? await avis('avis_liste', {}, { timeout: 8000 }) : [] });
      case 'avis_statut': if (base) await avis('avis_statut', { id: Number(b.id), statut: String(b.statut || '') }); return json(200, { ok: true });
      case 'cadeaux': {
        const n = Math.max(1, Math.min(50, Number(b.nombre) || 1));
        const codes = Array.from({ length: n }, codeCadeau);
        const essai = b.essai ? Math.max(1, Math.min(20, Number(b.essai) || 1)) : null;
        if (base) await db('cadeaux', { codes, note: txt(b.note, 120), ...(essai ? { max_parties: essai } : {}) });
        return json(200, { codes });
      }
      case 'code_maj': {
        if (!codeValide(b.code)) return json(400, { erreur: 'Code invalide.' });
        const d = { code: formater(b.code) };
        if ('note' in b) d.note = txt(b.note, 120);
        if ('revoked' in b) d.revoked = !!b.revoked;
        await db('code_maj', d); oublierRevocation(d.code); return json(200, { ok: true });
      }
      case 'verifier': return json(200, { valide: codeValide(b.code), code: formater(b.code) });
      case 'retrouver': {
        const email = String(b.email || '').trim().toLowerCase(), out = [];
        if (process.env.STRIPE_SECRET_KEY && email) {
          let after = null;
          for (let page = 0; page < 10; page++) {
            const u = new URL('https://api.stripe.com/v1/checkout/sessions'); u.searchParams.set('limit', '100'); u.searchParams.set('status', 'complete'); if (after) u.searchParams.set('starting_after', after);
            const r = await fetch(u, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } }); const d = await r.json();
            if (!r.ok) break;
            for (const s of d.data) if ((s.customer_details?.email || '').toLowerCase() === email && s.payment_status === 'paid')
              out.push({ moyen: 'Carte (Stripe)', date: new Date(s.created * 1000).toISOString().slice(0, 10), code: codePourPaiement('stripe:' + s.id) });
            if (!d.has_more || !d.data.length) break; after = d.data[d.data.length - 1].id;
          }
        }
        if (b.chargily) out.push({ moyen: 'Chargily', reference: b.chargily, code: codePourPaiement('chargily:' + String(b.chargily).trim()) });
        return json(200, { resultats: out });
      }
      case 'questions': return json(200, { questions: base ? await db('questions_liste', {}, { timeout: 15000 }) : [] });
      case 'question_maj': {
        const v = verifierQuestion(b.question || {}); if (v.erreur) return json(400, v);
        await db('question_maj', v.question); return json(200, { ok: true, id: v.question.id });
      }
      case 'trad_import': {
        // Un lot du fichier (même en-tête, au plus 500 questions). Le serveur revérifie tout contre la base avant d'écrire.
        const f = b.fichier || {};
        if (!Array.isArray(f.questions) || f.questions.length > 500) return json(400, { erreur: 'Lot de traductions invalide (500 questions au plus).' });
        const r = analyserImport(f, base ? await db('questions_liste', {}, { timeout: 15000 }) : [], { ignorerFr: !!b.ignorerFr });
        if (!r.ok) return json(400, { erreur: r.erreurs.map(e => e.message).join(' '), rapport: r });
        let ecrites = 0;
        if (!b.simuler) for (const l of lots(r.aEcrire, 200)) ecrites += (await db('trad_import', { langue: r.langue, lignes: l }, { timeout: 15000 }))?.ecrites || 0;
        const { aEcrire, ...rapport } = r;
        return json(200, { ok: true, simule: !!b.simuler, ecrites, aEcrire: aEcrire.length, rapport });
      }
      case 'trad_statut': {
        const ids = (Array.isArray(b.ids) ? b.ids : []).map(x => txt(x, 60)).filter(Boolean).slice(0, 2000);
        const langue = txt(b.langue, 2) || 'en';
        if (!STATUTS_TRAD.includes(b.statut) || ['fr', 'ar'].includes(langue)) return json(400, { erreur: 'Statut de traduction invalide.' });
        const r = await db('trad_statut', { ids, langue, statut: b.statut }, { timeout: 15000 });
        return json(200, { ok: true, modifiees: r?.modifiees ?? 0 });
      }
      /* ---------- Cartes Hassanāt ---------- */
      case 'hassanat': return json(200, { cartes: base ? await evdb('hassanat_liste', {}, { timeout: 8000 }) : [] });
      case 'hassanat_maj': {
        const v = verifierCartesHassanat(b.cartes); if (v.erreur) return json(400, v);
        await evdb('hassanat_maj', { liste: v.cartes }, { timeout: 8000 }); return json(200, { ok: true, cartes: v.cartes });
      }
      /* ---------- Événements ---------- */
      case 'evenements': {
        const c = base ? await evdb('contenu', {}, { timeout: 10000 }) : { evenements: [], tags: {}, defis: [] };
        return json(200, { ...c, chevauchements: chevauchements(c.evenements) });
      }
      case 'ev_maj': {
        const v = verifierEvenement(b.evenement || {}); if (v.erreur) return json(400, v);
        await evdb('ev_maj', v.evenement); viderCacheEvenements(); return json(200, { ok: true, evenement: v.evenement });
      }
      case 'ev_suppr': {
        const id = txt(b.id, 40); if (!ID_EV.test(id)) return json(400, { erreur: 'Événement inconnu.' });
        await evdb('ev_suppr', { id }); viderCacheEvenements(); return json(200, { ok: true });
      }
      case 'ev_tag': { // étiquette d'événement sur des questions (ev vide = retirer)
        const ids = (Array.isArray(b.ids) ? b.ids : []).map(x => txt(x, 60)).filter(Boolean).slice(0, 2000);
        const ev = txt(b.ev, 40); if (ev && !ID_EV.test(ev)) return json(400, { erreur: 'Événement inconnu.' });
        const r = await evdb('tag', { ids, ev: ev || null }, { timeout: 15000 }); viderCacheEvenements(); return json(200, r);
      }
      case 'media_ajout': { // image envoyée depuis le tableau de bord (base64), nommée par son empreinte
        const mime = txt(b.mime, 20), data = String(b.data || '');
        if (!['image/webp', 'image/png', 'image/jpeg'].includes(mime)) return json(400, { erreur: 'Image en WebP, PNG ou JPEG uniquement.' });
        if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length * 3 / 4 > 2.5e6) return json(400, { erreur: 'Image trop lourde (2,5 Mo au plus). Réduis-la et réessaie.' });
        const id = createHash('sha256').update(data).digest('hex').slice(0, 24);
        await evdb('media_ajout', { id, mime, data }, { timeout: 20000 }); return json(200, { ok: true, id, url: `/api/media?id=${id}` });
      }
      case 'questions_import': { // simulation (rien n'est écrit) puis import, par lots de 200
        const ev = txt(b.ev, 40); if (ev && !ID_EV.test(ev)) return json(400, { erreur: 'Événement inconnu.' });
        const statut = b.statut === 'publiee' ? 'publiee' : 'brouillon';
        const existants = new Map((base ? await db('questions_liste', {}, { timeout: 15000 }) : []).map(q => [q.id, q]));
        const rapport = [], aEcrire = [];
        for (const l of lignesQuestions(b.lignes, { ev, statut }).slice(0, 200)) {
          if (!l.question.t) { rapport.push({ ligne: l.ligne, id: l.question.id, etat: 'erreur', message: `Thème inconnu : « ${l.theme_lu} ».` }); continue; }
          let v = verifierQuestion(l.question), note = '';
          // Religion sans source ou sans explication en français : jamais publiée, gardée en brouillon pour relecture.
          if (v.erreur && l.question.statut === 'publiee' && /religion/i.test(v.erreur)) { v = verifierQuestion({ ...l.question, statut: 'brouillon' }); note = 'Religion sans source ou sans explication en français : importée en brouillon.'; }
          if (v.erreur) { rapport.push({ ligne: l.ligne, id: l.question.id, etat: 'erreur', message: v.erreur }); continue; }
          const ex = existants.get(v.question.id);
          rapport.push({ ligne: l.ligne, id: v.question.id, etat: ex ? 'modifiee' : 'nouvelle', statut: v.question.statut, question: v.question.q.fr.slice(0, 120), ...(note ? { message: note } : {}) });
          aEcrire.push(v.question);
        }
        // Questions exclues par le fichier (« ids_exclus ») : archivées si elles sont dans la base (jamais supprimées : l'historique reste).
        const exclues = (Array.isArray(b.exclus) ? b.exclus : []).map(x => txt(x, 60)).filter(id => existants.has(id) && existants.get(id).statut !== 'archivee');
        for (const id of exclues) rapport.push({ id, etat: 'exclue', message: 'Exclue par le fichier : sera archivée (plus jamais proposée).' });
        if (!b.importer) return json(200, { simulation: true, rapport });
        for (const q of aEcrire) await db('question_maj', q, { timeout: 8000 });
        for (const id of exclues) { const ex = existants.get(id); await db('question_maj', { ...ex, statut: 'archivee' }, { timeout: 8000 }); }
        if (ev && aEcrire.length) await evdb('tag', { ids: aEcrire.map(q => q.id), ev }, { timeout: 15000 });
        viderCacheEvenements(); return json(200, { ok: true, ecrites: aEcrire.length, rapport });
      }
      case 'defis_import': {
        const ev = txt(b.ev, 40); if (!ID_EV.test(ev)) return json(400, { erreur: 'Choisis l’événement des défis.' });
        const rapport = [], liste = [];
        (Array.isArray(b.liste) ? b.liste : []).slice(0, 300).forEach((l, i) => { const v = verifierDefi(l || {}, { ev, index: i });
          if (v.erreur) rapport.push({ ligne: i + 1, etat: 'erreur', message: v.erreur }); else { liste.push(v.defi); rapport.push({ ligne: i + 1, id: v.defi.id, etat: 'ok', titre: v.defi.defi.ti }); } });
        if (!b.importer) return json(200, { simulation: true, rapport });
        if (liste.length) await evdb('defis_import', { liste }, { timeout: 15000 });
        viderCacheEvenements(); return json(200, { ok: true, ecrits: liste.length, rapport });
      }
      case 'defis_suppr': {
        const ids = (Array.isArray(b.ids) ? b.ids : []).map(x => txt(x, 40)).filter(Boolean).slice(0, 300);
        await evdb('defis_suppr', { ids }); viderCacheEvenements(); return json(200, { ok: true });
      }
      case 'question_suppr': await db('question_suppr', { id: txt(b.id, 60) }); return json(200, { ok: true });
      case 'reglages': {
        const c = base ? await db('contenu', {}, { timeout: 15000 }) : null;
        const lu = c?.reglages || {};
        return json(200, { reglages: { ...REGLAGES_DEFAUT, ...lu, eco: { ...REGLAGES_DEFAUT.eco, ...(lu.eco || {}) } }, defaut: REGLAGES_DEFAUT });
      }
      case 'reglages_maj': {
        const v = verifierReglages(b.reglages || {}); if (v.erreur) return json(400, v);
        await db('reglages_maj', { reglages: v.reglages }); return json(200, { ok: true, reglages: v.reglages });
      }
    }
    return json(400, { erreur: 'Action inconnue.' });
  } catch (e) { console.error(e); return json(500, { erreur: e.message === 'KZ_SECRET manquant' ? 'KZ_SECRET manquant dans Vercel.' : 'Erreur serveur : ' + e.message }); }
}
