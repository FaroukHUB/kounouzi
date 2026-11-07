// Kounouzi — tranches d'âge : source unique, utilisée par le jeu, le tableau de bord et le serveur.
// Une seule classification pour toutes les matières, maths comprises (décision du 7 novembre 2026, fichier V39) :
//   5-8 · 9-12 · 13-17 · 18+
// Chaque question a aussi un âge minimum recommandé (champ « am ») : un enfant ne reçoit jamais une question
// dont l'âge minimum dépasse son âge réel. Priorité à la tranche du joueur ; tranches plus jeunes seulement en complément.
// Aucun accès au DOM ni au réseau ici : ce fichier se teste tel quel avec node.

export const TRANCHES = Object.freeze([
  Object.freeze({ id: '5-8', min: 5, max: 8 }), Object.freeze({ id: '9-12', min: 9, max: 12 }),
  Object.freeze({ id: '13-17', min: 13, max: 17 }), Object.freeze({ id: '18+', min: 18, max: null }),
]);
export const IDS_TRANCHES = TRANCHES.map(t => t.id);
export const THEMES = ['religion', 'invocations', 'geography', 'sciences', 'maths', 'logic', 'management'];

/** Les identifiants de tranche d'un thème (les mêmes pour tous les thèmes). */
export const tranchesDuTheme = () => IDS_TRANCHES.slice();

/** Écriture tolérante → identifiant officiel ('9–12 ans' → '9-12', '18 +' → '18+'), ou null si inconnue. */
export function normaliserTranche(a) {
  if (a == null) return null;
  const s = String(a).trim().toLowerCase().replace(/ans?\b/g, '').replace(/\bet\b|\s/g, '').replace(/plus/g, '+').replace(/[‐-―−]/g, '-').replace(/\s+/g, '');
  return IDS_TRANCHES.includes(s) ? s : null;
}
/** Une question doit toujours avoir une tranche connue, quel que soit son thème (maths comprises). */
export const trancheValidePour = (_theme, a) => !!normaliserTranche(a);

/** Tranche qui contient un âge (avant 5 ans → 5-8 ; 18 ans et plus → 18+). */
export function trancheDeLAge(age) {
  const a = Math.floor(Number(age) || 0);
  return (TRANCHES.find(t => a >= t.min && (t.max == null || a <= t.max)) || (a < 5 ? TRANCHES[0] : TRANCHES[TRANCHES.length - 1])).id;
}

/**
 * Tranches qu'un joueur peut recevoir, dans l'ordre de priorité (décision du 7 nov. 2026, V41) :
 * d'abord sa propre tranche, puis les tranches plus jeunes, de la plus proche à la plus éloignée. Jamais une tranche plus âgée.
 * Les tranches plus jeunes ne servent que lorsqu'il ne reste plus de question non vue dans sa tranche (voir paliers / le jeu).
 * Adulte : 18+, puis 13-17, 9-12, 5-8 (« découverte » : 13-17 d'abord, puis 18+).
 */
export function tranchesPourJoueur(_theme, joueur) {
  const ids = IDS_TRANCHES;
  if (!joueur || !joueur.child) return joueur && joueur.level === 'decouverte' ? ['13-17', '18+', '9-12', '5-8'] : ['18+', '13-17', '9-12', '5-8'];
  const k = ids.indexOf(trancheDeLAge(joueur.age));
  return ids.slice(0, k + 1).reverse();
}

/** Une question est-elle permise pour ce joueur (tranche, âge minimum, règle Histoire des prophètes 5-8) ? */
function permise(q, theme, joueur, age) {
  if (q.t !== theme) return false;
  const a = normaliserTranche(q.a); if (!a) return false;
  if (age != null && Number(q.am) > age) return false;
  // Histoire des prophètes chez un enfant de 5 à 8 ans : uniquement les questions écrites pour eux (p58), jamais les anciennes variantes.
  if (theme === 'geography' && joueur && joueur.child && trancheDeLAge(joueur.age) === '5-8' && !q.p58) return false;
  return true;
}

/**
 * Questions d'un thème pour un joueur, rangées par palier de priorité : [sa tranche, tranche plus jeune, …].
 * Une question sans tranche ou avec une tranche inconnue n'est jamais proposée. Enfant : âge minimum ≤ son âge.
 */
export function paliers(questions, theme, joueur) {
  const ordre = tranchesPourJoueur(theme, joueur);
  const age = joueur && joueur.child ? Math.max(5, Math.floor(Number(joueur.age) || 5)) : null;
  const P = ordre.map(() => []);
  for (const q of questions) { if (!permise(q, theme, joueur, age)) continue; const i = ordre.indexOf(normaliserTranche(q.a)); if (i >= 0) P[i].push(q); }
  return P;
}
/** Toutes les questions qu'un joueur peut recevoir dans un thème (tous paliers). Vide = le jeu passe au thème suivant. */
export const questionsEligibles = (questions, theme, joueur) => paliers(questions, theme, joueur).flat();

// ---------- Tableau de bord ----------
export const libelleTranche = (id) => id.endsWith('+') ? `${id.slice(0, -1)} ans et +` : `${id.replace('-', '–')} ans`;
/** Options du filtre d'âge (les mêmes pour tous les thèmes). */
export function optionsFiltreAge() {
  return [{ label: 'Tranches d’âge', options: TRANCHES.map(t => ({ value: t.id, label: libelleTranche(t.id) })) }];
}
export const filtreAgeCompatible = (_theme, cle) => !cle || IDS_TRANCHES.includes(cle);
/** Filtre combiné de la liste des questions (thème + âge + statut + recherche). */
export function filtrerQuestions(liste, { theme = '', age = '', statut = '', recherche = '' } = {}) {
  const s = recherche.trim().toLowerCase();
  return liste.filter(q =>
    (!theme || q.t === theme) &&
    (!age || normaliserTranche(q.a) === age) &&
    (!statut || q.statut === statut) &&
    (!s || [q.q?.fr, q.q?.ar, q.q?.en, q.r?.fr, q.id].some(x => (x || '').toLowerCase().includes(s))));
}
