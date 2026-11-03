// /api/achat?moyen=stripe|chargily : crée la page de paiement et y envoie l'acheteur.
import { chargilyBase, dinarsActifs, json, langueDe, origine, PRIX, signer } from './_lib.js';

const PRODUIT = 'Kounouzi — accès famille à vie';
// Page de paiement dans la langue du visiteur. Prix, devise et produit restent identiques.
const TXT = {
  fr: { produit: PRODUIT, desc: 'Le jeu complet pour toute la famille, sans abonnement.', retour: '/#acheter', indispo: 'Paiement indisponible pour le moment.', ferme: 'Ce moyen de paiement n’est pas encore ouvert.' },
  en: { produit: 'Kounouzi — lifetime family access', desc: 'The full game for the whole family, no subscription.', retour: '/en/#offre', indispo: 'Payment unavailable for now.', ferme: 'This payment method is not open yet.' },
};
export async function GET(request) {
  const moyen = new URL(request.url).searchParams.get('moyen');
  const base = origine(request), lang = langueDe(request), T = TXT[lang];
  try {
    if (moyen === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      const f = new URLSearchParams({
        mode: 'payment', locale: lang,
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][unit_amount]': String(PRIX.eur),
        'line_items[0][price_data][product_data][name]': T.produit,
        'line_items[0][price_data][product_data][description]': T.desc,
        success_url: `${base}/merci.html?moyen=stripe${lang === 'en' ? '&lang=en' : ''}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}${T.retour}`,
        'payment_intent_data[description]': T.produit,
      });
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' }, body: f });
      const s = await r.json();
      if (!r.ok) { console.error('Stripe', r.status, s?.error?.message); return json(502, { erreur: T.indispo }); }
      return new Response(null, { status: 303, headers: { location: s.url, 'cache-control': 'no-store' } });
    }
    if (moyen === 'chargily' && dinarsActifs()) {
      const r = await fetch(`${chargilyBase()}/checkouts`, { method: 'POST', headers: { authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ amount: PRIX.dzd, currency: 'dzd', locale: 'fr', description: PRODUIT, success_url: `${base}/merci.html?moyen=chargily`, failure_url: `${base}/#acheter` }) });
      const c = await r.json();
      if (!r.ok || !c.checkout_url) { console.error('Chargily', r.status, JSON.stringify(c).slice(0, 300)); return json(502, { erreur: 'Paiement indisponible pour le moment.' }); }
      return new Response(null, { status: 303, headers: { location: c.checkout_url, 'cache-control': 'no-store',
        'set-cookie': `kz_chk=${encodeURIComponent(signer(c.id))}; Path=/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax` } });
    }
    return json(400, { erreur: T.ferme });
  } catch (e) { console.error(e); return json(500, { erreur: T.indispo }); }
}
