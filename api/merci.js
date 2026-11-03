// Après paiement : vérifie auprès de Stripe ou Chargily que c'est bien payé, puis donne le code et ouvre l'accès.
import { envoyerCode } from './_courriel.js';
import { appareil, chargilyBase, origine, codePourPaiement, cookieAcces, json, langueDe, lieu, lireCookie, noter, resume, verifier } from './_lib.js';

// Messages en anglais quand l'acheteur vient de la version anglaise (le français reste la référence).
const EN = {
  'Référence de paiement inconnue.': 'Unknown payment reference.',
  'Le paiement n’est pas encore confirmé.': 'The payment is not confirmed yet.',
  'Paiement introuvable sur cet appareil. Écris-nous avec ton reçu.': 'Payment not found on this device. Write to us with your receipt.',
  'Paiement introuvable.': 'Payment not found.',
  'Vérification impossible pour le moment. Réessaie dans un instant.': 'Cannot check right now. Please try again in a moment.',
};

export async function GET(request) {
  const q = new URL(request.url).searchParams, en = langueDe(request) === 'en', tx = (m) => (en && EN[m]) || m;
  try {
    let ref = null, email = null, montant = null, devise = null, moyen = null, intention = null;
    if (q.get('moyen') === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      const id = q.get('session_id') || '';
      if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json(400, { ok: false, erreur: tx('Référence de paiement inconnue.') });
      const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
      const s = await r.json();
      if (!r.ok) return json(400, { ok: false, erreur: tx('Référence de paiement inconnue.') });
      if (s.payment_status !== 'paid') return json(402, { ok: false, erreur: tx('Le paiement n’est pas encore confirmé.') });
      ref = 'stripe:' + s.id; email = s.customer_details?.email || null; montant = s.amount_total; devise = (s.currency || 'eur').toUpperCase(); moyen = 'stripe'; intention = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id || null;
    } else if (q.get('moyen') === 'chargily' && process.env.CHARGILY_SECRET_KEY) {
      const id = verifier(lireCookie(request, 'kz_chk'));
      if (!id) return json(400, { ok: false, erreur: tx('Paiement introuvable sur cet appareil. Écris-nous avec ton reçu.') });
      const r = await fetch(`${chargilyBase()}/checkouts/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`, accept: 'application/json' } });
      const c = await r.json();
      if (!r.ok) return json(400, { ok: false, erreur: tx('Paiement introuvable.') });
      if (c.status !== 'paid') return json(402, { ok: false, erreur: tx('Le paiement n’est pas encore confirmé.') });
      ref = 'chargily:' + c.id; montant = c.amount; devise = 'DZD'; moyen = 'chargily';
    } else return json(400, { ok: false, erreur: tx('Référence de paiement inconnue.') });
    const code = codePourPaiement(ref), dev = appareil(request), l = lieu(request);
    // montant : centimes pour l'euro, dinars entiers pour le DA
    await noter('achat', { code, moyen, ref, montant, devise, email, device: dev.id, pays: l.pays });
    await noter('activation', { code, kind: 'achat', device: dev.id, ua: resume(request.headers.get('user-agent') || ''), pays: l.pays, ville: l.ville });
    // Code envoyé par e-mail une seule fois par paiement (repère gardé dans les métadonnées du paiement Stripe).
    if (moyen === 'stripe' && email && intention) await envoyerUneFois({ intention, email, code, lang: en ? 'en' : 'fr', base: origine(request) });
    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    headers.append('set-cookie', cookieAcces(code)); if (dev.cookie) headers.append('set-cookie', dev.cookie);
    return new Response(JSON.stringify({ ok: true, code, email, achat: { ref: ref.split(':')[1], valeur: devise === 'DZD' ? montant : montant / 100, devise } }), { status: 200, headers });
  } catch (e) { console.error(e); return json(500, { ok: false, erreur: tx('Vérification impossible pour le moment. Réessaie dans un instant.') }); }
}

async function envoyerUneFois({ intention, email, code, lang, base }) {
  try {
    const auth = { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` };
    const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(intention)}`, { headers: auth });
    const pi = await r.json();
    if (!r.ok || pi.metadata?.kz_mail) return;
    if (await envoyerCode({ email, code, lang, base }))
      await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(intention)}`, { method: 'POST', headers: { ...auth, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ 'metadata[kz_mail]': new Date().toISOString() }) });
  } catch (e) { console.error('courriel', e?.message); }
}
