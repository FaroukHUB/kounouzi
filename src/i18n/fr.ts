/**
 * Dictionnaire français — langue de référence de l'interface en V1.
 * Les clés de ce fichier définissent le contrat (`Dictionary`) que chaque
 * autre langue doit remplir intégralement.
 */
export const fr = {
  "app.name": "Kounouzi",
  "app.tagline": "Joue. Apprends. Gère.",
  "language.fr": "Français",
  "language.ar": "العربية",
} as const satisfies Record<string, string>;
