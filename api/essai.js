// Demande d'une partie d'essai depuis le site : un code d'essai (1 partie, durée réglée dans le tableau de bord,
// 10 minutes par défaut) est créé, ouvert sur cet appareil et envoyé par e-mail.
// Une seule demande par adresse e-mail et par appareil. Un appareil qui a déjà un accès complet n'en a pas besoin.
import { envoyerCode } from './_courriel.js';
import { accesValide, codeCadeau, cookieAcces, db, dbActive, json, langueDe, lireCookie, origine, signer, verifier } from './_lib.js';

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

export async function POST(request) {
  let b = {}; try { b = await request.json(); } catch {}
  const en = langueDe(request, b) === 'en', tx = (fr, e) => (en ? e : fr);
  if (b.site) return json(200, { ok: true }); // champ piège rempli : robot
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  if (!EMAIL.test(email)) return json(400, { ok: false, erreur: tx('Adresse e-mail invalide.', 'Invalid e-mail address.') });
  if (await accesValide(request)) return json(200, { ok: true, deja: true });
  if (verifier(lireCookie(request, 'kz_essai'))) return json(409, { ok: false, erreur: tx('Cet appareil a déjà eu sa partie d’essai. Pour continuer à jouer, obtenez l’accès complet.', 'This device has already had its trial game. To keep playing, get full access.') });
  if (!dbActive()) return json(503, { ok: false, erreur: tx('Essai indisponible pour le moment.', 'Trial unavailable right now.') });
  try {
    const note = 'Essai site · ' + email;
    const liste = await db('codes_liste', {}, { timeout: 8000 });
    if ((Array.isArray(liste) ? liste : []).some(c => String(c.note || '').toLowerCase() === note.toLowerCase()))
      return json(409, { ok: false, erreur: tx('Une partie d’essai a déjà été envoyée à cette adresse. Pensez à regarder vos e-mails (et les indésirables).', 'A trial game has already been sent to this address. Check your e-mails (and your spam folder).') });
    const code = codeCadeau();
    await db('cadeaux', { codes: [code], note, max_parties: 1 }, { timeout: 8000 });
    const envoye = await envoyerCode({ email, code, lang: en ? 'en' : 'fr', base: origine(request), essai: true });
    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    headers.append('set-cookie', cookieAcces(code));
    headers.append('set-cookie', `kz_essai=${encodeURIComponent(signer(Date.now().toString(36)))}; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; Secure; SameSite=Lax`);
    return new Response(JSON.stringify({ ok: true, code, envoye }), { status: 200, headers });
  } catch (e) {
    console.error('essai', e.message);
    return json(500, { ok: false, erreur: tx('Impossible de créer l’essai pour le moment. Réessayez dans un instant.', 'Cannot create the trial right now. Please try again in a moment.') });
  }
}
