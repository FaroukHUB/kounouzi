// Formulaire « Votre avis » du site : bug, avis, suggestion, partenariat… Le message est enregistré en base
// (onglet Avis du tableau de bord) et une alerte est envoyée par e-mail à l'adresse de contact, si elle est réglée.
import { envoyerAvis } from './_courriel.js';
import { avis, dbActive, json, langueDe, lireCookie, resume, signer, verifier } from './_lib.js';

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;
export const TYPES_AVIS = ['bug', 'avis', 'suggestion', 'partenariat', 'autre'];

export async function POST(request) {
  let b = {}; try { b = await request.json(); } catch {}
  const en = langueDe(request, b) === 'en', tx = (fr, e) => (en ? e : fr);
  if (b.site) return json(200, { ok: true }); // champ piège rempli : robot
  const type = TYPES_AVIS.includes(b.type) ? b.type : 'avis';
  const message = String(b.message || '').trim().slice(0, 4000);
  const nom = String(b.nom || '').trim().slice(0, 80);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  if (message.length < 3) return json(400, { ok: false, erreur: tx('Écrivez votre message avant d’envoyer.', 'Please write your message before sending.') });
  if (email && !EMAIL.test(email)) return json(400, { ok: false, erreur: tx('Adresse e-mail invalide.', 'Invalid e-mail address.') });
  if (type === 'partenariat' && !email) return json(400, { ok: false, erreur: tx('Indiquez votre e-mail pour qu’on puisse vous répondre.', 'Please give your e-mail so we can reply.') });
  // Limite par appareil : 5 messages par heure.
  const [n0, t0] = String(verifier(decodeURIComponent(lireCookie(request, 'kz_avis') || '')) || '').split('-');
  const debut = Number(t0) > Date.now() - 3600e3 ? Number(t0) : Date.now(), n = debut === Number(t0) ? Number(n0) || 0 : 0;
  if (n >= 5) return json(429, { ok: false, erreur: tx('Merci, nous avons bien reçu vos messages. Réessayez un peu plus tard.', 'Thank you, we have received your messages. Please try again a little later.') });
  if (!dbActive()) return json(503, { ok: false, erreur: tx('Envoi indisponible pour le moment.', 'Sending unavailable right now.') });
  const ua = request.headers.get('user-agent') || '';
  const appareil = `${resume(ua)} · ${String(b.ecran || '').slice(0, 20)} · ${ua.slice(0, 200)}`;
  const page = String(b.page || '').slice(0, 200);
  try {
    await avis('avis_ajout', { type, message, nom, email, lang: en ? 'en' : 'fr', page, appareil }, { timeout: 6000 });
  } catch (e) {
    console.error('avis', e.message);
    return json(500, { ok: false, erreur: tx('Impossible d’envoyer pour le moment. Réessayez dans un instant.', 'Cannot send right now. Please try again in a moment.') });
  }
  await envoyerAvis({ type, message, nom, email, page, appareil: resume(ua) });
  return json(200, { ok: true }, { 'set-cookie': `kz_avis=${encodeURIComponent(signer(`${n + 1}-${debut}`))}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax` });
}
