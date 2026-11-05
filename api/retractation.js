// Fonction de rétractation en ligne (« Se rétracter du contrat ici » → « Confirmer la rétractation »).
// La demande est enregistrée (onglet Avis du tableau de bord, type « retractation »), un accusé de réception daté
// est envoyé par e-mail au client, et une alerte part à l'adresse de contact.
import { envoyerAccuseRetractation, envoyerAvis } from './_courriel.js';
import { avis, dbActive, json, langueDe, lireCookie, resume, signer, verifier } from './_lib.js';

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

export async function POST(request) {
  let b = {}; try { b = await request.json(); } catch {}
  const en = langueDe(request, b) === 'en', tx = (fr, e) => (en ? e : fr);
  if (b.site) return json(200, { ok: true }); // champ piège rempli : robot
  const nom = String(b.nom || '').trim().slice(0, 120);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160);
  const reference = String(b.reference || '').trim().slice(0, 120);
  const motif = String(b.motif || '').trim().slice(0, 2000);
  if (nom.length < 2) return json(400, { ok: false, erreur: tx('Indiquez votre nom.', 'Please give your name.') });
  if (!EMAIL.test(email)) return json(400, { ok: false, erreur: tx('Indiquez l’adresse e-mail utilisée pour l’achat.', 'Please give the e-mail address used for the purchase.') });
  if (b.confirme !== true) return json(400, { ok: false, erreur: tx('Confirmez la rétractation.', 'Please confirm the withdrawal.') });
  const [n0, t0] = String(verifier(decodeURIComponent(lireCookie(request, 'kz_avis') || '')) || '').split('-');
  const debut = Number(t0) > Date.now() - 3600e3 ? Number(t0) : Date.now(), n = debut === Number(t0) ? Number(n0) || 0 : 0;
  if (n >= 5) return json(429, { ok: false, erreur: tx('Votre demande a déjà été envoyée. Réessayez un peu plus tard.', 'Your request has already been sent. Please try again a little later.') });
  if (!dbActive()) return json(503, { ok: false, erreur: tx('Envoi indisponible pour le moment. Écrivez-nous par e-mail.', 'Sending unavailable right now. Please write to us by e-mail.') });
  const quand = new Date();
  const message = `Demande de rétractation du contrat.\nRéférence de l'achat : ${reference || 'non indiquée'}\n${motif ? 'Précisions : ' + motif : ''}`.trim();
  const ua = request.headers.get('user-agent') || '';
  try {
    await avis('avis_ajout', { type: 'retractation', message, nom, email, lang: en ? 'en' : 'fr', page: '/retractation', appareil: `${resume(ua)} · ${ua.slice(0, 200)}` }, { timeout: 6000 });
  } catch (e) {
    console.error('retractation', e.message);
    return json(500, { ok: false, erreur: tx('Impossible d’envoyer pour le moment. Réessayez dans un instant, ou écrivez-nous par e-mail.', 'Cannot send right now. Please try again in a moment, or write to us by e-mail.') });
  }
  const accuse = await envoyerAccuseRetractation({ email, nom, reference, quand, lang: en ? 'en' : 'fr' });
  await envoyerAvis({ type: 'retractation', message, nom, email, page: '/retractation', appareil: resume(ua) });
  return json(200, { ok: true, accuse, quand: quand.toISOString() }, { 'set-cookie': `kz_avis=${encodeURIComponent(signer(`${n + 1}-${debut}`))}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax` });
}
