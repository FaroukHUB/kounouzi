// Images envoyées depuis le tableau de bord (décor des événements). Le nom est l'empreinte du contenu :
// une image ne change jamais sous le même nom, elle peut donc être gardée en cache très longtemps.
import { dbActive, evdb } from './_lib.js';

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-f0-9]{24}$/.test(id) || !dbActive()) return new Response('Introuvable', { status: 404 });
  try {
    const m = await evdb('media', { id }, { timeout: 8000 });
    if (!m || !m.data) return new Response('Introuvable', { status: 404 });
    return new Response(Buffer.from(m.data, 'base64'), { headers: { 'content-type': m.mime, 'cache-control': 'public, max-age=31536000, immutable' } });
  } catch (e) { console.error('media', e.message); return new Response('Erreur', { status: 502 }); }
}
