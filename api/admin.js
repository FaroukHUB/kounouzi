// Tableau de bord de Farouk : chiffres, codes, questions, réglages du jeu.
// Protégé par le mot de passe KZ_ADMIN (variable Vercel).
import { timingSafeEqual } from 'node:crypto';
import { normaliserTranche, systemeDe, tranchesDuTheme } from '../public/ages.js';
import { moyens, codeCadeau, codePourPaiement, codeValide, db, dbActive, formater, json, oublierRevocation, PRIX } from './_lib.js';

const THEMES = ['religion', 'maths', 'geography', 'sciences', 'logic', 'management'];
const ROTATION = ['family', 'hassanat', 'duel', 'question'];
export const REGLAGES_DEFAUT = {
  themes: THEMES,
  eco: { qGood: 100, qPartial: 50, startPass: 200, treasure: 200, duelWin: 150, duelTie: 50, familyX: 2, donation: 30, donationHassanat: 10, visitRate: 0.15 },
  defis: ['family', 'hassanat', 'family', 'duel', 'family', 'question'],
  minuteur: { enfant: 60, adulte: 45 },
  eviter: 15,
  durees: { rapide: 30, classique: 45, grande: 60 },
};

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
  // Tranche d'âge : celle de la classification du thème (religion ou générale) ; aucune pour les maths.
  let a = null;
  if (systemeDe(t)) {
    const ok = tranchesDuTheme(t); a = normaliserTranche(b.a);
    if (!ok.includes(a)) return { erreur: `Tranche d'âge invalide pour ce thème (attendu : ${ok.join(', ')}).` };
  }
  const statut = ['publiee', 'brouillon', 'archivee'].includes(b.statut) ? b.statut : 'brouillon';
  const s = txt(b.s, 300);
  // Contenu religieux : jamais publié sans source ni sans explication en français ET en arabe.
  if (t === 'religion' && statut === 'publiee' && (!s || !e.fr || !e.ar))
    return { erreur: 'Une question de religion ne peut être publiée qu’avec sa source et son explication en français et en arabe. Enregistre-la en brouillon en attendant.' };
  const id = txt(b.id, 60) || `${t.slice(0, 3).toUpperCase()}-A-${Date.now().toString(36).toUpperCase()}`;
  return { question: { id, t, d, a, q, r, e, s, src: txt(b.src, 120), statut, poids: num(b.poids, 0, 5, 1), prio: !!b.prio } };
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
    durees: { rapide: num(b.durees?.rapide, 10, 120, 30), classique: num(b.durees?.classique, 10, 180, 45), grande: num(b.durees?.grande, 10, 240, 60) },
  } };
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
      case 'question_suppr': await db('question_suppr', { id: txt(b.id, 60) }); return json(200, { ok: true });
      case 'reglages': {
        const c = base ? await db('contenu', {}, { timeout: 15000 }) : null;
        return json(200, { reglages: { ...REGLAGES_DEFAUT, ...(c?.reglages || {}) }, defaut: REGLAGES_DEFAUT });
      }
      case 'reglages_maj': {
        const v = verifierReglages(b.reglages || {}); if (v.erreur) return json(400, v);
        await db('reglages_maj', { reglages: v.reglages }); return json(200, { ok: true, reglages: v.reglages });
      }
    }
    return json(400, { erreur: 'Action inconnue.' });
  } catch (e) { console.error(e); return json(500, { erreur: e.message === 'KZ_SECRET manquant' ? 'KZ_SECRET manquant dans Vercel.' : 'Erreur serveur : ' + e.message }); }
}
