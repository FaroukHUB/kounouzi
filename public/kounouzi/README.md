# Assets visuels Kounouzi

Structure : `board/` (plateau, centre, cases), `monuments/` (une illustration
par monument), `icons/`, `cards/` (bandeaux d'en-tête des cartes),
`backgrounds/` (textures), `effects/` (lueurs, éclats).

Les fichiers actuels sont des **placeholders propres** (SVG géométriques
sobres). Chaque fichier se remplace un pour un : même nom, ou nouveau nom
déclaré dans `src/ui/theme/assets.ts` (manifeste unique). Formats conseillés :
WebP (photos / illustrations), SVG (icônes, motifs).

## Images à fournir / générer

| Fichier attendu | Rôle | Format · taille indicative |
| --- | --- | --- |
| `board/01-board-center.webp` | Cœur du plateau (carte stylisée, patrimoine, motifs) — remplace `board/center-placeholder.svg` | WebP 1200×1200, fond transparent ou cercle |
| `board/02-board-frame.webp` | Cadre extérieur du plateau (bois / cuir / marqueterie) | WebP 2048×2048 |
| `backgrounds/03-table.webp` | Fond de page (table, tissu) derrière le plateau | WebP 1920×1280 |
| `cards/04-question.webp` … `cards/12-start.webp` | Bandeaux d'en-tête des cartes : question, monument, événement, gestion, défi, solidarité, trésor, halte, départ — remplacent `cards/*.svg` | WebP 1120×320 |
| `cards/13-duel-bg.webp` | Fond de la carte Duel (face-à-face) | WebP 1120×720 |
| `effects/14-treasure-glow.webp` | Lueur / éclat du trésor — remplace `effects/treasure-glow.svg` | WebP 800×800, fond transparent (PNG si besoin) |
| `board/15-halt.webp` | Illustration de la Halte du voyage (étape, oasis, boussole) | WebP 600×600 |
| `monuments/16-demo-monument-01.webp` … `monuments/23-demo-monument-08.webp` | Une illustration par monument du catalogue (remplace `monuments/placeholder.svg`) ; à renommer avec l'identifiant réel de chaque site validé (ex. `casbah.webp`) | WebP 640×480 |
| `icons/24-cell-*.svg` | Icônes définitives des neuf familles de cases (facultatif : les icônes vectorielles actuelles sont intégrées au code) | SVG 24×24 |

Règles : aucune image lourde inutile (< 200 Ko par fichier hors cadre du
plateau), aucun texte incrusté dans les images (les textes restent dynamiques),
aucun lieu religieux représenté comme monument achetable.
