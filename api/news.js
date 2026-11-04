// Après un achat : l'acheteur accepte (ou non) de recevoir les nouveautés de Kounouzi.
// L'adresse vient du paiement Stripe vérifié, jamais d'un champ libre : personne ne peut inscrire l'adresse d'un autre.
import { ajouterListe } from './_courriel.js';
import { contacts, dbActive, json, langueDe } from './_lib.js';

export async function POST(request) {
  let b = {}; try { b = await request.json(); } catch {}
  const en = langueDe(request, b) === 'en';
  const id = String(b.session_id || '');
  if (!/^cs_[A-Za-z0-9_]+$/.test(id) || !process.env.STRIPE_SECRET_KEY || !dbActive()) return json(400, { ok: false });
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
    const s = await r.json();
    const email = s?.customer_details?.email;
    if (!r.ok || s.payment_status !== 'paid' || !email) return json(400, { ok: false });
    const news = !!b.news;
    await contacts('maj', { email, origine: 'achat', lang: en ? 'en' : 'fr', consent: news, ...(news ? { source: 'page merci' } : {}) }, { timeout: 4000 });
    if (news && await ajouterListe(email)) await contacts('brevo_ok', { email }, { timeout: 3000 });
    return json(200, { ok: true, news });
  } catch (e) { console.error('news', e.message); return json(500, { ok: false }); }
}
