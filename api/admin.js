// Espace Farouk : créer des codes cadeaux, vérifier un code, retrouver le code d'un acheteur.
// Protégé par le mot de passe KZ_ADMIN (variable Vercel).
import { timingSafeEqual } from 'node:crypto';
import { codeCadeau, codePourPaiement, codeValide, formater, json } from './_lib.js';

function autorise(request) {
  const pw = process.env.KZ_ADMIN || '', got = request.headers.get('x-admin') || '';
  if (pw.length < 8 || got.length !== pw.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(pw));
}
export async function POST(request) {
  if (!autorise(request)) { await new Promise(r => setTimeout(r, 800)); return json(401, { erreur: 'Mot de passe incorrect.' }); }
  let b = {}; try { b = await request.json(); } catch {}
  try {
    if (b.action === 'entrer') return json(200, { ok: true });
    if (b.action === 'cadeaux') {
      const n = Math.max(1, Math.min(50, Number(b.nombre) || 1));
      return json(200, { codes: Array.from({ length: n }, codeCadeau) });
    }
    if (b.action === 'verifier') return json(200, { valide: codeValide(b.code), code: formater(b.code) });
    if (b.action === 'retrouver') {
      const email = String(b.email || '').trim().toLowerCase();
      const out = [];
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
    return json(400, { erreur: 'Action inconnue.' });
  } catch (e) { console.error(e); return json(500, { erreur: e.message === 'KZ_SECRET manquant' ? 'KZ_SECRET manquant dans Vercel.' : 'Erreur serveur.' }); }
}
