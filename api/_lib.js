// Accès Kounouzi : codes signés, sans base de données.
// Un code = KZ-XXXX-XXXX-XXXX : 6 caractères d'identifiant + 6 caractères de signature (HMAC, secret KZ_SECRET).
// Un achat donne toujours le même code (l'identifiant vient de la référence du paiement) : rien ne se perd.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans O/0, I/1, L : pas de confusion à la lecture
export const PRIX = {
  eur: Number(process.env.KZ_PRIX_EUR_CENTIMES || 699),   // 6,99 € (prix de lancement)
  dzd: Number(process.env.KZ_PRIX_DZD || 1000),
  normal: Number(process.env.KZ_PRIX_NORMAL_EUR_CENTIMES || 1299), // prix normal après le lancement (affiché barré tant qu'il est plus élevé)           // 1 000 DA
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
// Le paiement en dinars (Chargily) est en pause : il ne s'ouvre que si KZ_DINARS=1 dans Vercel.
export const dinarsActifs = () => process.env.KZ_DINARS === '1' && !!process.env.CHARGILY_SECRET_KEY;
export const moyens = () => ({ stripe: !!process.env.STRIPE_SECRET_KEY, chargily: dinarsActifs() });
export const chargilyBase = () => (process.env.CHARGILY_SECRET_KEY || '').startsWith('test_') ? 'https://pay.chargily.net/test/api/v2' : 'https://pay.chargily.net/api/v2';

// ---------- Base de données (Supabase, schéma kounouzi, via la fonction kz_api) ----------
export const dbActive = () => !!(process.env.KZ_DB_URL && process.env.KZ_DB_KEY && process.env.KZ_DB_TOKEN);
export async function db(action, data = {}, { timeout = 5000, fn = 'kz_api' } = {}) {
  if (!dbActive()) throw new Error('base non configurée');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(`${process.env.KZ_DB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: process.env.KZ_DB_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ p_token: process.env.KZ_DB_TOKEN, p_action: action, p_data: data }),
    });
    const out = await r.json().catch(() => null);
    if (!r.ok) throw new Error((out && out.message) || `base ${r.status}`);
    return out;
  } finally { clearTimeout(t); }
}
// Enregistrement « au mieux » : ne bloque jamais le joueur si la base est lente ou absente.
// Contacts (e-mails et consentement aux nouveautés) : fonction séparée kz_contacts, même jeton.
export const contacts = (action, data, opts = {}) => db(action, data, { ...opts, fn: 'kz_contacts' });
export const avis = (action, data, opts = {}) => db(action, data, { ...opts, fn: 'kz_avis' });
export async function noter(action, data) { try { if (dbActive()) await db(action, data, { timeout: 1500 }); } catch (e) { console.error('noter', action, e.message); } }

// Appareil : un identifiant au hasard, gardé dans un cookie (aucune donnée personnelle).
export function appareil(request) {
  let id = lireCookie(request, 'kz_dev');
  const nouveau = !id || !/^[A-Za-z0-9_-]{10,40}$/.test(id);
  if (nouveau) id = randomBytes(12).toString('base64url');
  return { id, cookie: nouveau ? `kz_dev=${id}; Path=/; Max-Age=${60 * 60 * 24 * 365 * 5}; HttpOnly; Secure; SameSite=Lax` : null };
}
export const lieu = (request) => {
  const h = request.headers;
  let ville = h.get('x-vercel-ip-city'); try { ville = ville ? decodeURIComponent(ville) : null; } catch {}
  return { pays: h.get('x-vercel-ip-country') || null, ville };
};
export const resume = (ua = '') => /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Autre';

// Code désactivé depuis le tableau de bord, ou code d'essai qui a joué toutes ses parties ?
// (mémoire de 60 s pour ne pas interroger la base à chaque fois)
const REV = new Map();
export const oublierRevocation = (code) => REV.delete(formater(code));
export async function etatCode(code) {
  if (!dbActive()) return { revoque: false, epuise: false };
  const c = formater(code), m = REV.get(c);
  if (m && Date.now() - m.t < 60000) return m.v;
  try { const r = await db('revoque', { code: c }, { timeout: 2000 }); const v = { revoque: !!r?.revoque, epuise: !!r?.epuise }; REV.set(c, { v, t: Date.now() }); return v; }
  catch { return m ? m.v : { revoque: false, epuise: false }; }
}
export const revoqueEnBase = async (code) => (await etatCode(code)).revoque;
export async function accesValide(request, opts = {}) {
  const code = lireCookie(request, 'kz');
  try { if (!codeValide(code)) return null; } catch { return null; }
  const e = await etatCode(code);
  if (e.revoque || (e.epuise && !opts.essaiFiniOk)) return null;
  return formater(code);
}

// Langue de la réponse : ?lang=en, ou le choix gardé par le site et le jeu (cookie kz_lang). Français par défaut.
export function langueDe(request, corps) {
  const u = new URL(request.url); const l = (corps && corps.lang) || u.searchParams.get('lang') || (request.headers.get('cookie') || '').match(/(?:^|;\s*)kz_lang=([a-z]{2})/)?.[1];
  return l === 'en' ? 'en' : 'fr';
}
