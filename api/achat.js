// /api/achat?moyen=stripe|chargily&renonce=1 : crée la page de paiement et y envoie l'acheteur.
// renonce=1 : l'acheteur a coché, sur le site, la demande d'accès immédiat avec renonciation au droit de rétractation
// (contenu numérique). Sans cet accord, il est renvoyé vers la fenêtre de confirmation du site.
import { chargilyBase, dinarsActifs, json, langueDe, origine, PRIX, signer } from './_lib.js';

const PRODUIT = 'Kounouzi — accès famille';
// Page de paiement dans la langue du visiteur. Prix, devise et produit restent identiques.
const TXT = {
  fr: { produit: PRODUIT, desc: 'Le jeu complet pour toute la famille. Paiement unique, sans abonnement, mises à jour incluses.', retour: '/#offre', indispo: 'Paiement indisponible pour le moment.', ferme: 'Ce moyen de paiement n’est pas encore ouvert.', rappel: 'Accès immédiat au jeu : vous avez demandé à jouer tout de suite et reconnu perdre votre droit de rétractation de 14 jours.' },
  en: { produit: 'Kounouzi — family access', desc: 'The full game for the whole family. One-time payment, no subscription, updates included.', retour: '/en/#offre', indispo: 'Payment unavailable for now.', ferme: 'This payment method is not open yet.', rappel: 'Immediate access to the game: you asked to play right away and acknowledged losing your 14-day right of withdrawal.' },
};
export async function GET(request) {
  const q = new URL(request.url).searchParams, moyen = q.get('moyen');
  const base = origine(request), lang = langueDe(request), T = TXT[lang];
  if (q.get('renonce') !== '1') return new Response(null, { status: 303, headers: { location: `${base}${lang === 'en' ? '/en/' : '/'}#acheter`, 'cache-control': 'no-store' } });
  const accord = new Date().toISOString();
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
        // preuve de l'accord donné sur le site (accès immédiat et renonciation au droit de rétractation)
        'payment_intent_data[metadata][renonciation_retractation]': `oui ${accord} v1`,
        'metadata[renonciation_retractation]': `oui ${accord} v1`,
        'custom_text[submit][message]': T.rappel,
      });
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' }, body: f });
      const s = await r.json();
      if (!r.ok) { console.error('Stripe', r.status, s?.error?.message); return json(502, { erreur: T.indispo }); }
      return new Response(null, { status: 303, headers: { location: s.url, 'cache-control': 'no-store' } });
    }
    if (moyen === 'chargily' && dinarsActifs()) {
      const r = await fetch(`${chargilyBase()}/checkouts`, { method: 'POST', headers: { authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ amount: PRIX.dzd, currency: 'dzd', locale: 'fr', description: PRODUIT, success_url: `${base}/merci.html?moyen=chargily`, failure_url: `${base}/#offre` }) });
      const c = await r.json();
      if (!r.ok || !c.checkout_url) { console.error('Chargily', r.status, JSON.stringify(c).slice(0, 300)); return json(502, { erreur: 'Paiement indisponible pour le moment.' }); }
      return new Response(null, { status: 303, headers: { location: c.checkout_url, 'cache-control': 'no-store',
        'set-cookie': `kz_chk=${encodeURIComponent(signer(c.id))}; Path=/; Max-Age=7200; HttpOnly; Secure; SameSite=Lax` } });
    }
    return json(400, { erreur: T.ferme });
  } catch (e) { console.error(e); return json(500, { erreur: T.indispo }); }
}
