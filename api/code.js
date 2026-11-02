// GET : cet appareil a-t-il accès ? + prix et moyens de paiement disponibles.
// POST {code} : active un code (cadeau ou achat) sur cet appareil.
import { aAcces, codeValide, cookieAcces, json, moyens, PRIX } from './_lib.js';

export async function GET(request) {
  return json(200, { acces: aAcces(request), prix: PRIX, moyens: moyens(), contact: process.env.KZ_CONTACT || null });
}
export async function POST(request) {
  let code = '';
  try { code = (await request.json()).code; } catch {}
  let ok = false;
  try { ok = codeValide(code); } catch (e) { console.error(e.message); return json(500, { ok: false, erreur: 'Service indisponible.' }); }
  if (!ok) { await new Promise(r => setTimeout(r, 600)); return json(400, { ok: false, erreur: 'Ce code ne marche pas. Vérifie les lettres et les chiffres.' }); }
  return json(200, { ok: true }, { 'set-cookie': cookieAcces(code) });
}
