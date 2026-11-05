// Manifeste de l'application, personnalisé : l'application installée s'ouvre sur le lien personnel de la famille.
// Utile surtout sur iPhone et iPad, où l'application de l'écran d'accueil ne partage pas les cookies de Safari.
import { codeValide, formater } from './_lib.js';

export async function GET(request) {
  const c = new URL(request.url).searchParams.get('c') || '';
  let start = '/jouer?app=1'; try { if (codeValide(c)) start = '/j/' + formater(c); } catch {}
  const m = {
    name: 'Kounouzi — le jeu de la famille', short_name: 'Kounouzi',
    description: 'Le jeu de questions qui rassemble toute la famille : plateau 3D, défis, Hassanāt et Zakat.',
    lang: 'fr', dir: 'ltr', id: '/jouer', start_url: start, scope: '/', display: 'standalone', display_override: ['standalone', 'minimal-ui'],
    orientation: 'any', background_color: '#0c1626', theme_color: '#0c1626', categories: ['games', 'education', 'kids'],
    icons: [
      { src: '/img/app/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { src: '/img/app/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
      { src: '/img/app/maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  };
  return new Response(JSON.stringify(m), { headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'private, no-cache' } });
}
