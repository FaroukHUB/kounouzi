# 0058 — L'illustration du plateau porte son logo, et c'est voulu

Date : 2026-10-13
Statut : acceptée

## Contexte

L'auteur a fourni une nouvelle illustration de plateau : une scène de souk, deux
enfants aux visages sans traits — cohérents avec les avatars du jeu —, des
coupoles, des boutres, et **le logo KOUNOUZI en plein centre**.

La règle écrite jusque-là dans le manifeste des assets disait le contraire :
« tout ce qui porte une information tient dans le carré central, la périphérie
n'est que mer et ciel puisqu'elle passe sous les cases ». Mise en place et
mesurée, la v6 contredit cette règle sur trois points. Chacun a été montré à
l'auteur, capture en main, avant décision.

## Ce qui a été mesuré

1. **Le logo occupe la zone du Chemin.** Une case fait 157 px sur une image de
   1254. La zone centrale réservée au panneau du Chemin (lignes 2 à 7, colonnes
   2 à 7) va donc de 157 à 1097 px. Le logo tient de x 170 à 1090 et de y 770 à
   1105 : il est entièrement dans cette zone, et dépasse même de 8 px sous la
   rangée de cases du bas. Dès que la tablée découvre son chemin, le panneau se
   pose dessus.
2. **Le logo se dédouble.** La même image sert de fond de page sous un voile
   sombre. Comme le logo est centré, il réapparaît en grand derrière le plateau
   — très visible sur téléphone. Les illustrations précédentes ne portaient pas
   de titre, le problème n'existait pas.
3. **Les neuf pays ont disparu.** L'ancienne carte nommait Algérie (Casbah
   d'Alger), Maroc (Palais El Badi), Tunisie (Kairouan), Égypte (Citadelle du
   Caire), Palestine (Jérusalem), Türkiye (Istanbul), Ouzbékistan (Samarcande),
   Al-Andalus (Cordoue) et Arabie saoudite (La Mecque & Médine) — exactement les
   neuf lieux des 141 questions de géographie servies. Le lien visuel est perdu.

## Décision

**L'auteur assume les trois points.** L'image primait ; les questions ne
dépendent pas du plateau pour être justes. Rien n'est retouché : ni le logo
effacé, ni un second fond introduit, ni un retour à l'ancienne carte.

Ces trois propriétés sont désormais **écrites** dans le manifeste des assets et
dans l'architecture, avec la mention « à ne pas corriger ». Un futur lecteur —
humain ou assistant — les prendrait sinon pour des défauts, et la règle d'origine
encore en place dans le commentaire aurait achevé de le convaincre.

## Conséquences

- Le commentaire du manifeste ne décrit plus une règle que l'asset ne suit pas.
- **Un bug latent a été découvert et fermé au passage** : le chemin de
  l'illustration vivait en double, dans `ASSETS.boardCenter` que lit le plateau
  et en dur dans `app/globals.css` que lit le fond de page. Changer l'un sans
  l'autre affichait deux illustrations différentes en même temps — c'est
  exactement ce qui est arrivé à la première capture. Le CSS ne peut pas lire une
  constante TypeScript ; un test vérifie donc que les deux chemins s'accordent,
  que le fichier existe sur le disque et qu'il porte bien une signature WebP.
  Un chemin bien formé mais absent donnerait un plateau nu, sans rien dire.
- Si le logo central devient gênant en partie réelle, deux portes restent
  ouvertes sans rien jeter : effacer le logo de la seule version qui sert de
  tapis, ou donner au fond de page sa propre image.
