// Voix en ligne Kounouzi : le navigateur envoie une phrase, le serveur la fait dire par ElevenLabs.
// La clé reste sur le serveur (variables ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID dans Vercel).
// Le texte voyage dans l'URL : chaque phrase est mise en cache par le CDN et n'est payée qu'une fois.
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MAX_TEXT = 700;
const TONES = {
  pose:       { stability: 0.6,  similarity_boost: 0.8,  style: 0.2,  use_speaker_boost: true },
  chaleureux: { stability: 0.35, similarity_boost: 0.8,  style: 0.45, use_speaker_boost: true },
  enjoue:     { stability: 0.2,  similarity_boost: 0.75, style: 0.7,  use_speaker_boost: true },
  petillant:  { stability: 0.12, similarity_boost: 0.7,  style: 0.9,  use_speaker_boost: true },
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function GET(request) {
  const url = new URL(request.url);
  const key = process.env.ELEVENLABS_API_KEY, voice = process.env.ELEVENLABS_VOICE_ID;
  const missing = [!key && 'ELEVENLABS_API_KEY', !voice && 'ELEVENLABS_VOICE_ID'].filter(Boolean);
  if (url.searchParams.has('probe')) return missing.length ? json(503, { reason: 'unconfigured', missing }) : new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if (missing.length) return json(503, { reason: 'unconfigured', missing });
  const text = (url.searchParams.get('text') || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length > MAX_TEXT || /[\u0000-\u001f]/.test(text)) return json(400, { reason: 'invalid' });
  const tone = TONES[url.searchParams.get('ton')] || TONES.chaleureux;
  try {
    const up = await fetch(`${ELEVENLABS_URL}/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2', voice_settings: tone }),
    });
    if (!up.ok) {
      let detail; try { const b = await up.json(); detail = typeof b.detail === 'string' ? b.detail : b.detail && b.detail.status; } catch {}
      return json(502, { reason: 'upstream', status: up.status, detail: detail ? String(detail).slice(0, 120) : undefined });
    }
    const audio = await up.arrayBuffer();
    return new Response(audio, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable' } });
  } catch {
    return json(502, { reason: 'upstream' });
  }
}
