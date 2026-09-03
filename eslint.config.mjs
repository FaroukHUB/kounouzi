import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Frontière d'import du noyau (`src/core`).
 *
 * Le noyau est du TypeScript pur : règles du jeu, moteur pédagogique, moteur
 * de contenu. Il ne connaît ni React, ni Next, ni Motion, ni Zustand, ni
 * Supabase, ni aucune autre couche de l'application. Cette règle est ce qui
 * garantit que le moteur reste testable sans navigateur et que les règles
 * métier ne se dispersent jamais dans les composants.
 *
 * Depuis `src/core`, seuls sont autorisés :
 *   - les imports relatifs vers un fichier voisin (`./x`) ;
 *   - les imports `@/core/**`.
 */
const CORE_FORBIDDEN_PACKAGES = [
  "react",
  "react/*",
  "react-dom",
  "react-dom/*",
  "next",
  "next/*",
  "motion",
  "motion/*",
  "framer-motion",
  "zustand",
  "zustand/*",
  "@supabase/*",
  "idb",
  "idb-keyval",
];

const CORE_FORBIDDEN_LAYERS = [
  "@/app/*",
  "@/ui/*",
  "@/state/*",
  "@/animation/*",
  "@/i18n",
  "@/i18n/*",
  "@/config/*",
  "@/data/*",
  "@/lib/*",
];

/**
 * Tailwind : propriétés logiques uniquement.
 *
 * L'interface doit fonctionner en LTR (français) et en RTL (arabe) sans
 * retouche. Les utilitaires directionnels physiques (`ml-`, `pr-`, `left-`,
 * `text-right`, …) sont interdits au profit de leurs équivalents logiques
 * (`ms-`, `pe-`, `start-`, `text-end`, …).
 *
 * Couverture : chaînes littérales et gabarits passés à `className`. Les
 * classes construites dynamiquement ailleurs ne sont pas analysées.
 */
const PHYSICAL_DIRECTION_UTILITY =
  "(^|\\s|:)-?(ml|mr|pl|pr|left|right|inset-x|scroll-ml|scroll-mr|scroll-pl|scroll-pr|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|text-left|text-right|float-left|float-right|clear-left|clear-right)(-[^\\s]+)?(\\s|$)";

const LOGICAL_UTILITIES_MESSAGE =
  "Utilitaire Tailwind directionnel interdit (LTR/RTL). Utiliser les équivalents logiques : ms-/me-, ps-/pe-, start-/end-, border-s/border-e, rounded-s/rounded-e, text-start/text-end.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: CORE_FORBIDDEN_PACKAGES,
              message:
                "Le noyau (src/core) est du TypeScript pur : aucune dépendance UI, framework, état ou persistance n'y est autorisée.",
            },
            {
              group: CORE_FORBIDDEN_LAYERS,
              message:
                "Le noyau (src/core) ne dépend d'aucune autre couche. Seuls les imports `@/core/**` et `./voisin` sont autorisés.",
            },
            {
              group: ["../*"],
              message:
                "Pas d'import relatif remontant (`../`) dans le noyau : utiliser l'alias `@/core/...` pour qu'aucun chemin ne puisse sortir de src/core.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["app/**/*.tsx", "src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name="className"] Literal[value=/${PHYSICAL_DIRECTION_UTILITY}/]`,
          message: LOGICAL_UTILITIES_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${PHYSICAL_DIRECTION_UTILITY}/]`,
          message: LOGICAL_UTILITIES_MESSAGE,
        },
      ],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
