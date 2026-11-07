// Kounouzi — tranches d'âge : source unique, utilisée par le jeu, le tableau de bord et le serveur.
// Une seule classification pour toutes les matières, maths comprises (décision du 7 novembre 2026, fichier V39) :
//   5-8 · 9-12 · 13-17 · 18+
// Chaque question a aussi un âge minimum recommandé (champ « am ») : un enfant ne reçoit jamais une question
// dont l'âge minimum dépasse son âge réel, même si elle est dans sa tranche.
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
 * Tranches qu'un joueur peut recevoir.
 * Enfant : uniquement la tranche de son âge réel (jamais une autre « pour combler »).
 * Adulte : 18+ et 13-17 (la tranche 18+ ne couvre pas toutes les matières) ; « découverte » = 13-17 d'abord.
 */
export function tranchesPourJoueur(_theme, joueur) {
  if (!joueur || !joueur.child) return joueur && joueur.level === 'decouverte' ? ['13-17', '18+'] : ['18+', '13-17'];
  return [trancheDeLAge(joueur.age)];
}

/**
 * Questions qu'un joueur peut recevoir dans un thème (sans tenir compte de l'historique).
 * Une question sans tranche, ou avec une tranche inconnue, n'est jamais proposée (elle reste visible et corrigeable
 * dans le tableau de bord). Enfant : âge minimum recommandé ≤ son âge. Résultat vide = aucune question adaptée :
 * c'est au jeu de passer à un autre thème, jamais de piocher dans une autre tranche.
 */
export function questionsEligibles(questions, theme, joueur) {
  const ok = new Set(tranchesPourJoueur(theme, joueur));
  const age = joueur && joueur.child ? Math.max(5, Math.floor(Number(joueur.age) || 5)) : null;
  return questions.filter(q => q.t === theme && ok.has(normaliserTranche(q.a)) && (age == null || !(Number(q.am) > age)));
}

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
