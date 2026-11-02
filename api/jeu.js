// Sert le jeu (/jouer) et ses questions (/data.json) seulement aux appareils qui ont un code valide.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { aAcces } from './_lib.js';

const DIR = path.join(process.cwd(), 'private');
export async function GET(request) {
  const f = new URL(request.url).searchParams.get('f');
  if (!aAcces(request)) {
    if (f === 'data') return new Response('Accès réservé', { status: 401 });
    return new Response(null, { status: 302, headers: { location: '/?acces=1#acceder', 'cache-control': 'no-store' } });
  }
  if (f === 'data') {
    return new Response(await readFile(path.join(DIR, 'data.json')), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-cache' } });
  }
  return new Response(await readFile(path.join(DIR, 'jeu.html'), 'utf8'), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-cache' } });
}
