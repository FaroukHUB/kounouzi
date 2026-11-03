// Kounouzi — traductions des questions : préparation pour le jeu et analyse des fichiers d'import.
// Partagé par le jeu (serveur), le tableau de bord et les tests. Aucun accès au DOM ni au réseau.

export const STATUTS_TRAD = ['a_faire', 'a_relire', 'validee'];
export const LIBELLE_STATUT_TRAD = { a_faire: 'À traduire', a_relire: 'À relire', validee: 'Validée' };
const LANGUES_REFUSEES = ['fr', 'ar']; // le français est la référence, l'arabe n'est jamais importé par ce canal
const MAX = { q: 600, r: 600, e: 1200 };

/** Statut de traduction d'une question pour une langue : 'validee', 'a_relire' ou 'a_faire'. */
export function statutTrad(q, langue = 'en') {
  const s = q?.trad?.[langue] ?? q?.tr?.[langue];
  if (STATUTS_TRAD.includes(s)) return s;
  return q?.q?.[langue] ? 'a_relire' : 'a_faire';
}

/**
 * Questions envoyées au jeu :
 *  - l'arabe n'est gardé que pour la Religion (il reste en base pour les autres thèmes, mais n'est plus montré) ;
 *  - une traduction n'est montrée que si elle est validée (ou « à relire » si le réglage l'autorise) ;
 *  - le français est toujours là : c'est la langue de secours.
 */
export function questionsPourJeu(questions, { relire = false } = {}) {
  return (questions || []).map(q => {
    const montrer = (l) => { const s = statutTrad(q, l); return s === 'validee' || (relire && s === 'a_relire'); };
    const garder = (o) => {
      const r = {};
      for (const [l, v] of Object.entries(o || {})) {
        if (!v) continue;
        if (l === 'fr') r.fr = v;
        else if (l === 'ar') { if (q.t === 'religion') r.ar = v; }
        else if (montrer(l)) r[l] = v;
      }
      return r;
    };
    const { tr, trad, ...reste } = q;
    return { ...reste, q: garder(q.q), r: garder(q.r), e: garder(q.e) };
  });
}

// Comparaison tolérante du français (espaces, apostrophes et guillemets typographiques).
export const normaliser = (s) => String(s ?? '').normalize('NFC').replace(/[’‘ʼ]/g, "'").replace(/[«»“”]/g, '"').replace(/ | /g, ' ').replace(/\s+/g, ' ').trim();
const propre = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();

/**
 * Analyse un fichier de traductions (format « kounouzi-traductions », version 1) face aux questions de la base.
 * Ne modifie rien : renvoie le rapport et la liste des lignes à écrire.
 * options.ignorerFr : accepter une ligne même si son texte français diffère de la base.
 */
export function analyserImport(fichier, base, { ignorerFr = false } = {}) {
  const erreurs = [], avertissements = [], aEcrire = [];
  const stats = { total: 0, nouvelles: 0, remplacees: 0, identiques: 0, incompletes: 0, inconnues: 0, doublons: 0, frDifferent: 0, invalides: 0 };
  const f = fichier || {};
  if (f.format !== 'kounouzi-traductions') erreurs.push({ type: 'format', message: 'Ce fichier n’est pas au format « kounouzi-traductions ».' });
  if (f.version !== 1) erreurs.push({ type: 'format', message: 'Version de format inattendue (attendu : 1).' });
  const langue = String(f.langue || '').toLowerCase();
  if (!/^[a-z]{2}$/.test(langue) || LANGUES_REFUSEES.includes(langue)) erreurs.push({ type: 'format', message: `Langue « ${f.langue ?? ''} » refusée (attendu : en).` });
  if (!Array.isArray(f.questions)) erreurs.push({ type: 'format', message: 'La liste « questions » est absente.' });
  if (erreurs.length) return { ok: false, langue, erreurs, avertissements, aEcrire, stats };

  const parId = new Map((base || []).map(q => [q.id, q]));
  const vus = new Set();
  for (const [i, l] of f.questions.entries()) {
    stats.total++;
    const id = String(l?.id || '').trim(), pos = `ligne ${i + 1}${id ? ' (' + id + ')' : ''}`;
    if (!id) { stats.invalides++; erreurs.push({ type: 'id', id: null, message: `${pos} : identifiant absent.` }); continue; }
    if (vus.has(id)) { stats.doublons++; erreurs.push({ type: 'doublon', id, message: `${pos} : identifiant en double dans le fichier (seule la première occurrence est gardée).` }); continue; }
    vus.add(id);
    const q = parId.get(id);
    if (!q) { stats.inconnues++; erreurs.push({ type: 'inconnue', id, message: `${pos} : aucune question avec cet identifiant dans la base.` }); continue; }
    const t = l[langue] || {};
    const tq = propre(t.q), tr = propre(t.r), te = propre(t.e);
    if (!tq || !tr) { stats.incompletes++; avertissements.push({ type: 'incomplete', id, message: `${pos} : question ou réponse traduite vide, ligne ignorée.` }); continue; }
    if (tq.length > MAX.q || tr.length > MAX.r || te.length > MAX.e) { stats.invalides++; erreurs.push({ type: 'longueur', id, message: `${pos} : texte trop long.` }); continue; }
    const fr = l.fr || {};
    const frOk = normaliser(fr.q) === normaliser(q.q?.fr) && normaliser(fr.r) === normaliser(q.r?.fr);
    if (!frOk) {
      stats.frDifferent++;
      if (!ignorerFr) { erreurs.push({ type: 'fr', id, message: `${pos} : le français du fichier ne correspond plus à la base (question modifiée depuis l’export ?). Ligne ignorée.` }); continue; }
      avertissements.push({ type: 'fr', id, message: `${pos} : français différent de la base, ligne gardée à ta demande.` });
    }
    if (l.theme && q.t && l.theme !== q.t) avertissements.push({ type: 'theme', id, message: `${pos} : thème « ${l.theme} » dans le fichier, « ${q.t} » dans la base.` });
    if (!te && q.e?.fr) avertissements.push({ type: 'explication', id, message: `${pos} : explication non traduite (le français sera montré).` });
    const deja = q.q?.[langue];
    if (deja && normaliser(deja) === normaliser(tq) && normaliser(q.r?.[langue]) === normaliser(tr) && (!te || normaliser(q.e?.[langue]) === normaliser(te))) { stats.identiques++; continue; }
    if (deja) {
      stats.remplacees++;
      avertissements.push({ type: 'remplace', id, message: `${pos} : une traduction existait${statutTrad(q, langue) === 'validee' ? ' (déjà validée)' : ''} ; elle sera remplacée et repassera « à relire ».` });
    } else stats.nouvelles++;
    aEcrire.push({ id, q: tq, r: tr, e: te });
  }
  const manquantes = (base || []).filter(q => !q.q?.[langue] && !aEcrire.some(x => x.id === q.id)).length;
  return { ok: true, langue, erreurs, avertissements, aEcrire, stats, manquantesApres: manquantes };
}

/** Découpe une liste en lots (import par étapes, reprenable : une ligne déjà importée revient « identique »). */
export const lots = (liste, taille = 100) => Array.from({ length: Math.ceil(liste.length / taille) }, (_, i) => liste.slice(i * taille, (i + 1) * taille));

/** Progression de la traduction par thème et au total. */
export function progression(questions, langue = 'en') {
  const out = { total: { n: 0, a_faire: 0, a_relire: 0, validee: 0 } };
  for (const q of questions || []) {
    const s = statutTrad(q, langue);
    (out[q.t] ||= { n: 0, a_faire: 0, a_relire: 0, validee: 0 });
    out[q.t].n++; out[q.t][s]++; out.total.n++; out.total[s]++;
  }
  return out;
}
