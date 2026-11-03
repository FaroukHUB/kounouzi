// GET : cet appareil a-t-il accès ? + prix et moyens de paiement (et compte la visite de la page).
// POST {code} : active un code (cadeau ou achat) sur cet appareil.
import { accesValide, appareil, codeValide, cookieAcces, formater, json, langueDe, lieu, moyens, noter, PRIX, resume, revoqueEnBase } from './_lib.js';

const MSG = {
  fr: { indispo: 'Service indisponible.', desactive: 'Ce code a été désactivé.', faux: 'Ce code ne marche pas. Vérifie les lettres et les chiffres.' },
  en: { indispo: 'Service unavailable.', desactive: 'This code has been deactivated.', faux: 'This code does not work. Check the letters and numbers.' },
};

function source(u) {
  const utm = u.searchParams.get('utm'); if (utm) return utm.slice(0, 40).toLowerCase();
  const ref = u.searchParams.get('ref'); if (!ref) return 'direct';
  try { const h = new URL(ref).hostname.replace(/^www\./, ''); return h === u.hostname ? 'direct' : h.slice(0, 60); } catch { return 'direct'; }
}
export async function GET(request) {
  const u = new URL(request.url), dev = appareil(request), code = await accesValide(request);
  if (u.searchParams.has('v')) await noter('event', { kind: 'visite', code, device: dev.id, pays: lieu(request).pays, data: { source: source(u) } });
  const h = dev.cookie ? { 'set-cookie': dev.cookie } : {};
  return json(200, { acces: !!code, prix: PRIX, moyens: moyens(), contact: process.env.KZ_CONTACT || null, pays: lieu(request).pays || null }, h);
}
export async function POST(request) {
  let code = '', corps = {};
  try { corps = await request.json(); code = corps.code; } catch {}
  const m = MSG[langueDe(request, corps)];
  let ok = false;
  try { ok = codeValide(code); } catch (e) { console.error(e.message); return json(500, { ok: false, erreur: m.indispo }); }
  if (ok && await revoqueEnBase(code)) return json(403, { ok: false, erreur: m.desactive });
  if (!ok) { await new Promise(r => setTimeout(r, 600)); return json(400, { ok: false, erreur: m.faux }); }
  const dev = appareil(request), l = lieu(request);
  await noter('activation', { code: formater(code), device: dev.id, ua: resume(request.headers.get('user-agent') || ''), pays: l.pays, ville: l.ville });
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  headers.append('set-cookie', cookieAcces(code)); if (dev.cookie) headers.append('set-cookie', dev.cookie);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
