// Kounouzi — tranches d'âge : source unique, utilisée par le jeu, le tableau de bord et le serveur.
// Deux classifications distinctes (décision définitive) :
//   « générale » : Histoire des prophètes, Sciences, Gestion, Invocations  → 5-6, 7-8, 9-10, 11-12, 13+
//   « religion » : Religion                                      → 5-8, 8-10, 10-12, 12-14, 14+
// Les Mathématiques n'ont pas de tranche : elles sont choisies par niveau de difficulté selon l'âge (niveauxMaths).
// Aucun accès au DOM ni au réseau ici : ce fichier se teste tel quel avec node.

export const TRANCHES = Object.freeze({
  generale: Object.freeze([
    { id: '5-6', min: 5, max: 6 }, { id: '7-8', min: 7, max: 8 }, { id: '9-10', min: 9, max: 10 },
    { id: '11-12', min: 11, max: 12 }, { id: '13+', min: 13, max: null },
  ]),
  religion: Object.freeze([
    { id: '5-8', min: 5, max: 8 }, { id: '8-10', min: 8, max: 10 }, { id: '10-12', min: 10, max: 12 },
    { id: '12-14', min: 12, max: 14 }, { id: '14+', min: 14, max: null },
  ]),
});
export const LIBELLE_SYSTEME = { generale: 'Âges généraux', religion: 'Âges religion' };
const SYSTEME_DU_THEME = { religion: 'religion', geography: 'generale', sciences: 'generale', logic: 'generale', management: 'generale', invocations: 'generale', maths: null };
export const THEMES = Object.keys(SYSTEME_DU_THEME);

/** Classification d'un thème : 'religion', 'generale', ou null (maths, thème inconnu). */
export const systemeDe = (theme) => SYSTEME_DU_THEME[theme] ?? null;
/** Les identifiants de tranche d'un thème (vide pour les maths). */
export const tranchesDuTheme = (theme) => (TRANCHES[systemeDe(theme)] || []).map(t => t.id);

/** Écriture tolérante → identifiant officiel ('10–12 ans' → '10-12', '13 +' → '13+'), ou null si inconnue. */
export function normaliserTranche(a) {
  if (a == null) return null;
  const s = String(a).trim().toLowerCase().replace(/ans?\b/g, '').replace(/[‐-―−]/g, '-').replace(/\s+/g, '');
  const tous = [...TRANCHES.generale, ...TRANCHES.religion].map(t => t.id);
  return tous.includes(s) ? s : null;
}
/** La tranche est-elle permise pour ce thème ? (les maths n'en acceptent aucune : null) */
export function trancheValidePour(theme, a) {
  const sys = systemeDe(theme);
  if (!sys) return a == null || a === '';
  const n = normaliserTranche(a);
  return !!n && TRANCHES[sys].some(t => t.id === n);
}

/**
 * Tranches qu'un joueur peut recevoir pour un thème.
 * Enfant : toutes les tranches qui contiennent son âge réel. En religion, aux âges charnières
 *   (8, 10, 12, 14 ans) les deux tranches voisines sont ouvertes ; le niveau de difficulté du joueur
 *   oriente ensuite le tirage (aucune question n'est imposée).
 *   Avant 5 ans → première tranche ; au-delà de la dernière borne → tranche « + ».
 * Adulte : les deux tranches les plus hautes (règle existante, conservée) ; « découverte » = un cran plus bas d'abord.
 * Maths ou thème sans classification : [] (voir niveauxMaths).
 */
export function tranchesPourJoueur(theme, joueur) {
  const sys = systemeDe(theme); if (!sys) return [];
  const T = TRANCHES[sys];
  if (!joueur || !joueur.child) {
    const [avantDerniere, derniere] = T.slice(-2).map(t => t.id);
    return joueur && joueur.level === 'decouverte' ? [avantDerniere, derniere] : [derniere, avantDerniere];
  }
  const age = Math.max(T[0].min, Math.floor(Number(joueur.age) || T[0].min));
  return T.filter(t => age >= t.min && (t.max == null || age <= t.max)).map(t => t.id);
}

/** Maths : niveaux de difficulté permis selon l'âge (règle existante, inchangée). */
export function niveauxMaths(joueur) {
  if (!joueur || !joueur.child) return joueur && joueur.level === 'decouverte' ? [3, 4] : [4, 5];
  const a = Number(joueur.age) || 5;
  return a <= 6 ? [1] : a <= 8 ? [1, 2] : a <= 10 ? [2, 3] : a <= 12 ? [3, 4] : [4, 5];
}

/**
 * Questions qu'un joueur peut recevoir dans un thème (sans tenir compte de l'historique).
 * Une question sans tranche, ou avec une tranche inconnue, n'est jamais proposée à la place
 * (elle reste visible et corrigeable dans le tableau de bord). Résultat vide = aucune question
 * adaptée : c'est au jeu de passer à un autre thème, jamais de piocher dans une autre tranche.
 */
export function questionsEligibles(questions, theme, joueur) {
  if (theme === 'maths') { const ds = niveauxMaths(joueur); return questions.filter(q => q.t === 'maths' && ds.includes(q.d)); }
  const ok = new Set(tranchesPourJoueur(theme, joueur));
  return questions.filter(q => q.t === theme && ok.has(normaliserTranche(q.a)));
}

// ---------- Tableau de bord ----------
/** Valeur de filtre sans ambiguïté : 'generale:7-8', 'religion:10-12'. */
export const cleFiltre = (sys, id) => `${sys}:${id}`;
/** Options du filtre d'âge selon le thème choisi ('' = tous les thèmes). */
export function optionsFiltreAge(theme) {
  const grp = (sys) => ({ label: LIBELLE_SYSTEME[sys], options: TRANCHES[sys].map(t => ({ value: cleFiltre(sys, t.id), label: libelleTranche(t.id) })) });
  if (!theme) return [grp('generale'), grp('religion')];
  const sys = systemeDe(theme);
  return sys ? [grp(sys)] : [];
}
export const libelleTranche = (id) => id.endsWith('+') ? `${id.slice(0, -1)} ans et +` : `${id.replace('-', '–')} ans`;
/** Le filtre d'âge choisi reste-t-il valable après un changement de thème ? Sinon revenir à « Tous les âges ». */
export function filtreAgeCompatible(theme, cle) {
  if (!cle) return true;
  return optionsFiltreAge(theme).some(g => g.options.some(o => o.value === cle));
}
/** Filtre combiné de la liste des questions (thème + âge + statut + recherche). */
export function filtrerQuestions(liste, { theme = '', age = '', statut = '', recherche = '' } = {}) {
  const s = recherche.trim().toLowerCase();
  let sys = null, tr = null;
  if (age) { const i = age.indexOf(':'); sys = age.slice(0, i); tr = age.slice(i + 1); }
  return liste.filter(q =>
    (!theme || q.t === theme) &&
    (!age || (systemeDe(q.t) === sys && normaliserTranche(q.a) === tr)) &&
    (!statut || q.statut === statut) &&
    (!s || [q.q?.fr, q.q?.ar, q.q?.en, q.r?.fr, q.id].some(x => (x || '').toLowerCase().includes(s))));
}
