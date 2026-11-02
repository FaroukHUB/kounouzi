// Le jeu envoie ici, sans rien bloquer : début et fin de partie, réponses aux questions. Jamais de prénom.
import { accesValide, appareil, lieu, noter } from './_lib.js';

const KINDS = new Set(['partie_debut', 'partie_fin']);
const propre = (o, cles) => Object.fromEntries(cles.filter(k => o && o[k] !== undefined).map(k => [k, o[k]]));
export async function POST(request) {
  const code = await accesValide(request);
  if (!code) return new Response(null, { status: 401 });
  let b = {}; try { b = JSON.parse(await request.text()); } catch {}
  const dev = appareil(request);
  if (KINDS.has(b.kind)) {
    const data = propre(b.data, ['joueurs', 'mode', 'ages', 'minutes', 'tours', 'partie']);
    if (Array.isArray(data.ages)) data.ages = data.ages.slice(0, 6).map(a => String(a).slice(0, 8));
    await noter('event', { kind: b.kind, code, device: dev.id, pays: lieu(request).pays, data });
  } else if (b.kind === 'reponses' && Array.isArray(b.liste)) {
    const liste = b.liste.slice(0, 60).map(x => propre(x, ['qid', 'theme', 'band', 'd', 'res', 'child']));
    await noter('reponses', { code, liste });
  }
  return new Response(null, { status: 204 });
}
