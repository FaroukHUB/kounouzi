// Le jeu demande ici l'autorisation avant chaque nouvelle partie.
// Un code d'essai limité (ex. 1 partie) est refusé quand toutes ses parties ont été jouées.
import { accesValide, appareil, db, dbActive, json, lieu, oublierRevocation } from './_lib.js';

const propre = (o, cles) => Object.fromEntries(cles.filter(k => o && o[k] !== undefined).map(k => [k, o[k]]));
export async function POST(request) {
  const code = await accesValide(request, { essaiFiniOk: true });
  if (!code) return json(401, { ok: false, erreur: 'Accès réservé.' });
  let b = {}; try { b = JSON.parse(await request.text()); } catch {}
  const data = propre(b.data, ['joueurs', 'mode', 'ages', 'partie']);
  if (Array.isArray(data.ages)) data.ages = data.ages.slice(0, 6).map(a => String(a).slice(0, 8));
  if (!dbActive()) return json(200, { ok: true });
  try {
    const r = await db('partie', { code, device: appareil(request).id, pays: lieu(request).pays, data }, { timeout: 4000 });
    oublierRevocation(code);
    return json(200, r || { ok: true });
  } catch (e) { console.error('partie', e.message); return json(200, { ok: true }); } // la base ne répond pas : on ne bloque pas la famille
}
