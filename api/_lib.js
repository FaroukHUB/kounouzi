// Accès Kounouzi : codes signés, sans base de données.
// Un code = KZ-XXXX-XXXX-XXXX : 6 caractères d'identifiant + 6 caractères de signature (HMAC, secret KZ_SECRET).
// Un achat donne toujours le même code (l'identifiant vient de la référence du paiement) : rien ne se perd.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans O/0, I/1, L : pas de confusion à la lecture
export const PRIX = {
  eur: Number(process.env.KZ_PRIX_EUR_CENTIMES || 990),   // 9,90 €
  dzd: Number(process.env.KZ_PRIX_DZD || 1000),           // 1 000 DA
};

function secret() {
  const s = process.env.KZ_SECRET;
  if (!s || s.length < 24) throw new Error('KZ_SECRET manquant');
  return s;
}
const chars = (buf, n) => Array.from(buf.subarray(0, n), b => ALPHA[b % ALPHA.length]).join('');
const mac = (txt) => createHmac('sha256', secret()).update(txt).digest();
const sig = (id) => chars(mac('sig:' + id), 6);
const format = (body) => `KZ-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;

export function normaliser(code) {
  let s = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.startsWith('KZ')) s = s.slice(2);
  return s.split('').filter(c => ALPHA.includes(c)).join('');
}
// Code d'un achat : toujours le même pour une même référence de paiement.
export function codePourPaiement(ref) { const id = chars(mac('id:' + ref), 6); return format(id + sig(id)); }
// Code cadeau : identifiant au hasard.
export function codeCadeau() { const id = chars(randomBytes(6), 6); return format(id + sig(id)); }

export function codeValide(code) {
  const b = normaliser(code);
  if (b.length !== 12) return false;
  const a = Buffer.from(b.slice(6)), e = Buffer.from(sig(b.slice(0, 6)));
  if (!timingSafeEqual(a, e)) return false;
  const revoques = (process.env.KZ_REVOQUES || '').split(',').map(normaliser).filter(Boolean);
  return !revoques.includes(b);
}
export const formater = (code) => format(normaliser(code));

// Cookies
export function lireCookie(request, nom) {
  const h = request.headers.get('cookie') || '';
  for (const p of h.split(/;\s*/)) { const i = p.indexOf('='); if (i > 0 && p.slice(0, i) === nom) return decodeURIComponent(p.slice(i + 1)); }
  return null;
}
export const cookieAcces = (code) => `kz=${encodeURIComponent(formater(code))}; Path=/; Max-Age=${60 * 60 * 24 * 365 * 5}; HttpOnly; Secure; SameSite=Lax`;
export const aAcces = (request) => { try { return codeValide(lireCookie(request, 'kz')); } catch { return false; } };

// Petite signature pour un cookie temporaire (référence du paiement Chargily)
export const signer = (v) => v + '.' + chars(mac('c:' + v), 10);
export const verifier = (s) => { if (!s) return null; const i = s.lastIndexOf('.'); const v = s.slice(0, i); return v && signer(v) === s ? v : null; };

export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
export const origine = (request) => { const u = new URL(request.url); return `${u.protocol}//${u.host}`; };
export const moyens = () => ({ stripe: !!process.env.STRIPE_SECRET_KEY, chargily: !!process.env.CHARGILY_SECRET_KEY });
export const chargilyBase = () => (process.env.CHARGILY_SECRET_KEY || '').startsWith('test_') ? 'https://pay.chargily.net/test/api/v2' : 'https://pay.chargily.net/api/v2';
