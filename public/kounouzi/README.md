# Assets visuels Kounouzi

Structure : `board/` (plateau, centre, cases), `monuments/` (une illustration
par monument), `icons/`, `cards/` (bandeaux d'en-tête des cartes),
`backgrounds/` (textures), `effects/` (lueurs, éclats), `audio/voix/` (phrases
fixes de la voix Kounouzi pré-générées par `pnpm voice:generate`, avec leur
`manifest.json` ; ADR 0036).

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


## Modèles 3D du plateau (`models/`)

Le plateau 3D sert des **visuels provisoires** tant qu'aucun fichier n'est
fourni : un pion de jeu de plateau dessiné dans le code, et la carte illustrée
de chaque établissement dressée sur sa case. Pour les remplacer, déposer le
fichier dans `models/` puis déclarer son chemin dans
`src/config/visuals/visuals.v1.json`. Rien n'est deviné d'après le contenu du
dossier : un modèle existe pour le jeu parce qu'il est **déclaré**. Un test
vérifie que chaque chemin déclaré pointe vers un fichier présent — une
illustration manquante devient une erreur de construction, pas un trou
découvert en pleine partie.

### Format exigé

| Point | Valeur |
| --- | --- |
| Format | **`.glb`** (glTF binaire), **textures embarquées dans le fichier** |
| Axe | **Y vers le haut**, modèle **debout** |
| Origine | **Aux pieds**, pas au centre du corps |
| Orientation | Face tournée vers **+Z** |
| Hauteur | 1 unité si possible (sinon elle est normalisée) |
| Obligatoire | **Normales** et **coordonnées de texture (UV)** |

Sous Blender : `Exporter → glTF 2.0`, format **glTF Binary (.glb)**, cocher
**+Y Up**, **Normals**, **UVs**, **Materials**, **Images : Automatic**.

L'ancien `models/pion-fille.glb` ne contenait **que des positions** : ni
normales, ni UV, ni couleur, ni matériau. Recoloré en aplat à la taille d'une
case, il ne donnait pas un personnage mais une silhouette informe, et aucun
réglage d'éclairage n'y change quoi que ce soit — il n'y a rien à éclairer.
C'est le cas type à éviter.

### Budget, parce que c'est un téléphone

| Élément | Triangles | Texture | Poids |
| --- | --- | --- | --- |
| Un pion | ≤ 4 000 | une seule, 512 × 512 | ≤ 300 Ko |
| Un établissement | ≤ 8 000 | une seule, 1024 × 1024 | ≤ 600 Ko |

Pas d'animation, pas de squelette, pas de transparence, pas d'effet miroir.
Au-delà de ces budgets le jeu fonctionne encore, mais les images par seconde
chutent — et c'est précisément le cas où la bascule automatique en 2D se
déclenche.

### Couleurs

Un **seul** modèle de pion en gris ou blanc neutre suffit : le jeu le teinte à
la couleur de chaque joueur, qui reste la seule clé de lecture du plateau.
Si les six pions sont livrés **déjà colorés**, passer `pawns.tint` à `false`
dans le manifeste et les déclarer dans `pawns.bySeat` (sièges `0` à `5`).
Même principe pour les établissements avec `establishments.tint`.
