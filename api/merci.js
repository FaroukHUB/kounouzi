// Après paiement : vérifie auprès de Stripe ou Chargily que c'est bien payé, puis donne le code et ouvre l'accès.
import { appareil, chargilyBase, codePourPaiement, cookieAcces, json, lieu, lireCookie, noter, resume, verifier } from './_lib.js';

export async function GET(request) {
  const q = new URL(request.url).searchParams;
  try {
    let ref = null, email = null, montant = null, devise = null, moyen = null;
    if (q.get('moyen') === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      const id = q.get('session_id') || '';
      if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json(400, { ok: false, erreur: 'Référence de paiement inconnue.' });
      const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
      const s = await r.json();
      if (!r.ok) return json(400, { ok: false, erreur: 'Référence de paiement inconnue.' });
      if (s.payment_status !== 'paid') return json(402, { ok: false, erreur: 'Le paiement n’est pas encore confirmé.' });
      ref = 'stripe:' + s.id; email = s.customer_details?.email || null; montant = s.amount_total; devise = (s.currency || 'eur').toUpperCase(); moyen = 'stripe';
    } else if (q.get('moyen') === 'chargily' && process.env.CHARGILY_SECRET_KEY) {
      const id = verifier(lireCookie(request, 'kz_chk'));
      if (!id) return json(400, { ok: false, erreur: 'Paiement introuvable sur cet appareil. Écris-nous avec ton reçu.' });
      const r = await fetch(`${chargilyBase()}/checkouts/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`, accept: 'application/json' } });
      const c = await r.json();
      if (!r.ok) return json(400, { ok: false, erreur: 'Paiement introuvable.' });
      if (c.status !== 'paid') return json(402, { ok: false, erreur: 'Le paiement n’est pas encore confirmé.' });
      ref = 'chargily:' + c.id; montant = c.amount; devise = 'DZD'; moyen = 'chargily';
    } else return json(400, { ok: false, erreur: 'Référence de paiement inconnue.' });
    const code = codePourPaiement(ref), dev = appareil(request), l = lieu(request);
    // montant : centimes pour l'euro, dinars entiers pour le DA
    await noter('achat', { code, moyen, ref, montant, devise, email, device: dev.id, pays: l.pays });
    await noter('activation', { code, kind: 'achat', device: dev.id, ua: resume(request.headers.get('user-agent') || ''), pays: l.pays, ville: l.ville });
    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    headers.append('set-cookie', cookieAcces(code)); if (dev.cookie) headers.append('set-cookie', dev.cookie);
    return new Response(JSON.stringify({ ok: true, code, email }), { status: 200, headers });
  } catch (e) { console.error(e); return json(500, { ok: false, erreur: 'Vérification impossible pour le moment. Réessaie dans un instant.' }); }
}
