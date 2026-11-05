// Lien personnel : /j/KZ-XXXX-XXXX-XXXX ouvre directement le jeu avec ce code (l'accès est enregistré sur l'appareil).
// C'est aussi l'adresse de départ de l'application installée sur l'écran d'accueil (voir /api/manifest).
import { appareil, codeValide, cookieAcces, formater, lireCookie, lieu, noter, resume, revoqueEnBase } from './_lib.js';

export async function GET(request) {
  const u = new URL(request.url), brut = String(u.searchParams.get('code') || '').slice(0, 40);
  const en = u.searchParams.get('lang') === 'en';
  let ok = false; try { ok = codeValide(brut) && !(await revoqueEnBase(brut)); } catch { ok = false; }
  if (!ok) return new Response(null, { status: 302, headers: { location: `${en ? '/en/' : '/'}?code=${encodeURIComponent(brut)}#acceder`, 'cache-control': 'no-store' } });
  const code = formater(brut), dev = appareil(request), headers = new Headers({ location: '/jouer?app=1', 'cache-control': 'no-store' });
  // Première ouverture de ce code sur cet appareil : on compte l'activation, comme avec le formulaire du site.
  let deja = false; try { deja = formater(lireCookie(request, 'kz') || '') === code; } catch {}
  if (!deja) { const l = lieu(request); await noter('activation', { code, device: dev.id, ua: resume(request.headers.get('user-agent') || ''), pays: l.pays, ville: l.ville }); }
  headers.append('set-cookie', cookieAcces(code)); if (dev.cookie) headers.append('set-cookie', dev.cookie);
  if (u.searchParams.has('lang')) headers.append('set-cookie', `kz_lang=${en ? 'en' : 'fr'}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return new Response(null, { status: 302, headers });
}
