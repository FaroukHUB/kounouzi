// Effets sonores du jeu, générés par ElevenLabs (sound-generation) puis gardés en cache par le CDN :
// chaque son n'est payé qu'une seule fois. Seules les clés ci-dessous sont acceptées.
const SOUNDS = {
  bravo:   { text: "A small group of happy young children cheering 'Yaaay!' and clapping together, joyful celebration, cheerful party", duration_seconds: 3 },
  presque: { text: "A few young children going 'Ooooh!' in an encouraging playful tone, then light clapping", duration_seconds: 2.5 },
  achat:   { text: "Bright magical sparkling chime with a coin cling, cheerful game reward sound", duration_seconds: 1.5 },
  tresor:  { text: "Treasure chest opening with a shower of gold coins and magical sparkles, cheerful game sound", duration_seconds: 2.2 },
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
export async function GET(request) {
  const k = new URL(request.url).searchParams.get('k');
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return json(503, { reason: 'unconfigured' });
  const s = SOUNDS[k]; if (!s) return json(400, { reason: 'invalid' });
  try {
    const up = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST', headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ ...s, prompt_influence: 0.5 }),
    });
    if (!up.ok) { let d; try { d = (await up.json()).detail; } catch {} console.error('ElevenLabs (son) a refusé', up.status, d); return json(502, { reason: 'upstream', status: up.status }); }
    const audio = await up.arrayBuffer();
    return new Response(audio, { status: 200, headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable' } });
  } catch { return json(502, { reason: 'upstream' }); }
}
