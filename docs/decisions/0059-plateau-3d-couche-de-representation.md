# 0059 — Plateau 3D : une couche de représentation, rien de plus

**Statut** : acceptée (Phase 6.1 — modernisation visuelle)

## Contexte

Le jeu fonctionne et ses règles sont stables. La demande est de le moderniser
visuellement — plateau incliné en perspective, pions qui avancent case par
case, caméra qui suit le joueur actif, établissements qui sortent du sol — sans
réécrire le jeu. Le risque est connu et il n'est pas technique : une couche 3D
finit toujours par vouloir décider quelque chose (où est un pion, combien de
cases, quand une carte s'ouvre), et le jour où elle décide, la règle existe en
deux endroits.

## Décision

**La 3D ne produit aucun état. Elle lit, elle montre, et c'est tout.**

- La scène lit `uiStore` (`pawnVisuals`, `highlightedCell`, `arrivalCell`,
  `pathPreview`, `journeyReveal`, `card`) et `presentedState`. Elle ne lit pas
  `gameStore`, n'importe rien de `src/core`, n'émet aucune commande et ne peut
  pas retarder le moteur. Si elle échoue, le jeu continue en 2D.
- **Une seule toile WebGL** pour tout (plateau, pions, établissements,
  révélation du Chemin). Plusieurs contextes sur un téléphone, c'est l'échec
  garanti ; l'essai `PawnLayer3D` créait le sien, il sera absorbé.
- **Rendu à la demande** : la toile ne redessine que quand quelque chose a
  changé. L'essai précédent dessinait 60 images par seconde en permanence,
  partie à l'arrêt comprise.
- **Repli 2D obligatoire**, et le réglage de l'utilisateur a le dernier mot.
  `Plateau : 3D / 2D / Automatique`, persisté. En automatique : pas de WebGL,
  appareil trop faible ou images par seconde durablement trop basses → 2D, et
  l'interface **dit laquelle de ces raisons** s'applique.
- **Le mode « animations réduites » est honoré** : placements instantanés,
  aucun mouvement de caméra. Il ne force pas la 2D pour autant — un plateau 3D
  immobile reste un plateau 3D.
- **Ni dé, ni roue, ni tirage, ni musique.** L'ADR 0013 n'est pas assoupli par
  cette couche : elle ne fait que rendre visible un déplacement déjà décidé.
  La révélation du Chemin lira `MovementAssigned.steps` et ne calculera jamais
  un nombre d'étapes. Le jeu n'a pas de bande-son : les seuls sons sont la voix
  du guide.
- **Les nombres sont des données** (`src/config/scene3d/scene3d.v1.json`,
  validé par Zod) : inclinaison, champ de la caméra, marges, hauteur des
  tuiles, seuils de qualité et de repli. Aucune de ces valeurs n'est codée en
  dur ; les régler ne demande pas de toucher au code.
- **Ce qui reste en DOM reste en DOM** : panneaux des joueurs, bandeaux,
  cartes, bouton du Chemin. Ils sont interactifs et lus par les lecteurs
  d'écran ; du texte dans une toile WebGL ne l'est pas.

## Organisation

`src/ui/scene/` contient la couche. Deux catégories de fichiers, et la
distinction est la condition de la testabilité :

- **Les fichiers purs** (`boardGeometry.ts`, `capability.ts`) n'importent
  **pas** `three`. Ce sont des fonctions de nombres vers des nombres :
  case → coordonnées, plateau → distance de caméra, appareil → mode de rendu,
  images par seconde → repli. Ils sont testés.
- **Les fichiers de scène** (`boardMesh.ts`, `GameCanvas.tsx`) importent
  `three`. Ils ne sont pas testables ici : les tests tournent dans Node, sans
  DOM (`renderToStaticMarkup`), donc sans WebGL. Ils ne doivent donc contenir
  **aucune décision** — seulement la traduction en objets 3D de ce que les
  fichiers purs ont calculé. Tout ce qui mérite un test appartient à la
  première catégorie.

La géométrie de l'anneau n'est pas réécrite : `boardGeometry.ts` s'appuie sur
`gridDims` et `perimeterPosition` de `src/ui/board/layout.ts`, déjà la source
unique du placement des cases en 2D. Deux implémentations de l'anneau
divergeraient, et la divergence serait invisible jusqu'au jour où un pion
s'arrête au mauvais endroit. Le nombre de cases vient toujours du plateau,
jamais d'une constante : 26 et 28 cases fonctionnent, et un plateau futur
aussi.

## Conséquences

- `three` n'entre pas dans le bundle initial : la scène est chargée par
  `next/dynamic`, uniquement quand la 3D est réellement servie.
- Le 2D n'est pas un mode dégradé à maintenir à contrecœur : c'est le chemin
  de secours réel, donc il reste testé et vivant.
- `PAWNS_3D_ENABLED` / `NEXT_PUBLIC_PIONS_3D` disparaîtront avec l'absorption
  de `PawnLayer3D` (étape 2) : un seul réglage de plateau, pas un drapeau
  d'essai en plus.
- Pendant l'étape 1, le plateau 3D ne montre ni pion, ni établissement, ni
  propriétaire : la 2D reste la vue complète. C'est assumé et temporaire.

## Étape 2 — les pions dans la scène

- `PawnLayer3D` et `NEXT_PUBLIC_PIONS_3D` sont supprimés : une seule toile, un
  seul réglage. Les pions lisent exactement les mêmes propriétés que la couche
  2D (`PawnLayerProps`), donc une seule source pour les deux vues.
- Le pion est un **solide de révolution dessiné dans le code**, pas le modèle
  `pion-fille.glb`. Ce fichier ne contient QUE des positions — ni normales, ni
  coordonnées de texture, ni couleur, ni matériau — et recoloré en aplat à la
  taille d'une case il ne donne pas un personnage mais une silhouette informe.
  Il n'est plus référencé nulle part. L'emplacement d'un modèle fourni par
  l'auteur arrive avec le manifeste des illustrations (étape 7).
- Le mouvement est calculé par `pawnMotion.ts`, pur et testé : avancement,
  lissage, hauteur du saut, orientation, et le repli qui fait tourner un pion
  par le plus court chemin. Une durée nulle — mode « animations réduites » —
  pose tout instantanément, sans transition et sans division par zéro.
- Un nouveau pas part d'où le pion EST, pas de sa case précédente : sans cela,
  deux pas enchaînés plus vite que l'animation font reculer le pion avant de
  repartir.
- La boucle de rendu tourne tant qu'un pion bouge, puis s'arrête. Les images par
  seconde se mesurent pendant ces déplacements — le moment où un appareil faible
  souffre réellement.
- **Taille du plateau** : trois leviers, tous mesurés sur capture plutôt que
  supposés. La focale allongée (champ de 38° à 26°) élargit la rangée du fond de
  12 % ; la marge de page neutralisée pour la 3D rend douze pixels de chaque
  côté ; l'inclinaison portée de 56° à 64° ajoute 15 % de surface. Un plateau
  plus redressé occupe plus d'écran, un plateau plus couché est plus
  spectaculaire : c'est un arbitrage, et il tient dans un seul nombre
  (`board.tiltDegrees`).

## Étape 3 — la caméra qui suit le joueur actif

- **Deux plans seulement**, et c'est volontaire : un plan large (tout le
  plateau, centré) et un plan de suivi (penché vers le pion du joueur actif).
  L'inclinaison ne change jamais et la caméra ne tourne jamais autour du
  plateau : une tablée penchée sur un écran doit pouvoir lever les yeux et
  retrouver le plateau là où elle l'a laissé.
- La scène ne décide PAS quand prendre du recul : l'écran de jeu lui dit quel
  plan servir, parce que c'est lui qui sait qu'une carte est ouverte ou que la
  partie est finie.
- **La cible est bornée au plateau** (`clampTarget`). Suivre un pion posté dans
  un coin sans cette borne pointerait la caméra à moitié hors du plateau : la
  moitié de l'écran montrerait le fond de page, et le joueur suivi se
  retrouverait au bord de l'image. La caméra PENCHE vers lui, elle ne le
  poursuit pas.
- La zone suivie fait sept cases de côté sur un plateau de huit : le plateau
  reste lisible en entier, et le mouvement reste perceptible. Plus serré, on
  perd une rangée entière et on ne voit plus d'où vient le pion ; c'est un
  arbitrage, et il tient dans `camera.followSpan`.
- **Le glissement est une DURÉE, pas une fraction par image** : une avance « d'un
  dixième à chaque image » rendrait la caméra deux fois plus rapide sur un écran
  à 120 Hz que sur un téléphone à 60, et le réglage cesserait d'en être un. La
  constante de temps est en millisecondes et le résultat ne dépend que du temps
  écoulé — testé en comparant deux cadences.
- **Animations réduites** : la caméra se place, elle ne glisse pas. Un
  redimensionnement d'écran se replace aussi immédiatement, sinon la vue dérive
  pendant une rotation de téléphone.
- La boucle de rendu tourne tant que les pions OU la caméra bougent. Mesuré sur
  la page réelle : **une image demandée en cinq secondes au repos**, contre
  vingt-quatre pendant un déplacement.

## Étape 4 — les établissements sur leur case

- **La scène ne lit pas les événements.** Elle compare deux listes
  d'établissements : ce qui apparaît depuis la dernière fois se construit, le
  reste est déjà posé. C'est ce qui fait qu'une partie reprise affiche les
  établissements debout sans rejouer une seule animation, sans qu'il ait fallu
  réécrire la règle de reprise ici. Un établissement qui change de main ne
  resurgit pas : il change de couleur.
- La liste est résolue **hors de la scène**, depuis l'état PRÉSENTÉ — donc un
  bâtiment ne se construit qu'au moment où l'achat est rejoué, pas dès que le
  moteur l'a acté.
- **Un panneau illustré, pas une maquette.** La première version était une
  maquette : un volume par famille, hôtel en tour, restaurant bas et large,
  musée à colonnes. À l'écran, ça ne marche pas. Un établissement occupe une
  demi-case sur un téléphone et le plateau se regarde d'en haut : il n'en reste
  qu'une facette de quelques dizaines de pixels, et toute la silhouette censée
  le rendre reconnaissable disparaît. Chaque établissement ayant déjà son
  illustration avec son nom peint dessus (ADR 0050), c'est elle qu'on dresse sur
  la case. Le socle porte la couleur du propriétaire — la seule information que
  l'illustration ne donne pas. Un test exige que les douze établissements aient
  bien la leur ; sans elle, on retombe sur un volume sobre, mais on l'apprend
  au test et pas en partie.
- **Deux erreurs corrigées en regardant l'écran**, pas en relisant le code :
  la couleur du propriétaire avait d'abord été mise sur les MURS, invisibles
  depuis une caméra qui plonge — le bâtiment paraissait crème quel que soit son
  propriétaire ; et la construction se jouait DERRIÈRE la carte « ajouté à ton
  patrimoine », donc personne ne la voyait. Un établissement acheté attend
  désormais que la carte se referme, avec une attente bornée pour qu'un achat
  conclu au dernier tour ne reste pas invisible.
- Bâtiment et pion ne se posent pas au même endroit : le premier du côté
  intérieur de la tuile, le second du côté extérieur. Sans cette séparation, un
  pion seul sur une case construite se retrouvait au milieu du bâtiment.
- **Aucun bâtiment religieux n'est représenté**, et ce n'est pas un oubli : les
  lieux religieux ne sont jamais achetables.

## Étape 5 — la révélation du Chemin

- **Ni dé, ni roue, ni tirage** (ADR 0013). Il n'y a rien à lancer et rien à
  faire tomber sur une face : le nombre d'étapes vient de
  `MovementAssigned.steps` et les cases de `PawnMoved.path`, déposés par la file
  d'animation. Cette couche les montre, elle ne les produit pas — et un test lit
  les sources de la scène pour vérifier qu'aucun vocabulaire de hasard n'y est
  réapparu, en image comme en mot.
- Les cases du chemin s'allument **une par une, dans l'ordre du parcours**, et
  toutes sont allumées avant la fin de la révélation : le pion ne part jamais
  sur un chemin qui se dessine encore. Le temps qui reste laisse le chemin
  complet à l'écran — c'est lui qui permet de compter les cases à voix haute.
- **Elles s'éteignent SOUS le pion**, pas au moment où il s'ébranle. La première
  version les effaçait toutes à son départ, c'est-à-dire précisément quand elles
  servaient le plus. L'extinction suit l'INDICE de l'étape franchie et non la
  seule case courante : le parcours est un anneau, on peut y repasser, et en
  mode « animations réduites » le pion se pose directement à l'arrivée — toutes
  les cases d'avant comptent alors comme franchies et aucun anneau ne reste
  allumé derrière lui.
- Les marqueurs sont en rendu ADDITIF : ils éclairent l'illustration au lieu de
  la recouvrir. Le dessous est un dessin, pas un aplat.
- **Un réglage renommé plutôt qu'un garde-fou assoupli.** La configuration de la
  scène s'appelle `pathReveal` et non `journey` : le motif `config.journey` est
  interdit dans toute l'interface par le garde-fou qui garantit qu'aucun écran
  ne peut lire le cycle du Chemin et donc connaître les déplacements à venir
  (ADR 0018). Mon réglage n'a rien à voir avec ce cycle, mais un garde-fou qui
  protège un secret ne s'assouplit pas pour une commodité de nommage.
