# 0050 — Une carte dessinée pour UN établissement

Date : 2026-10-01
Statut : acceptée

## Contexte

L'auteur a fourni les deux premières cartes d'établissement : « Casbah
d'Alger » et « Restaurant Marocain », chacune en planche dos + face, comme les
jeux de cartes existants. Mais contrairement aux autres, ces cartes ne servent
pas une FAMILLE (Défi, Don, Maths…) : chacune est la carte d'UN établissement
précis, son nom peint sur l'illustration.

Le choix d'un jeu de cartes se faisait par catégorie de Savoir ou par famille
de case. Il manquait la clé la plus précise.

## Décision

1. **Un jeu de cartes peut viser des ÉTABLISSEMENTS** (`sites` dans
   `decks.v1.json`, absent = aucun). `deckFor` choisit du plus précis au plus
   général : établissement, puis catégorie, puis famille de case.
2. **La carte illustrée remplace la vignette.** Quand l'établissement a sa
   carte, l'ancienne illustration en vignette disparaît — l'illustration, c'est
   la carte entière — et le nom comme le mot « Établissement », déjà peints,
   ne sont pas redessinés. Le prix, les Kounouz du joueur, le nom arabe et les
   boutons vivent dans le parchemin.
3. **La même carte sert à l'achat ET au service.** On arrive chez le
   propriétaire avec la carte qu'on avait vue à l'achat.
4. **Le nom en données suit le nom peint.** `est-restaurant-algerie` devient
   « Casbah d'Alger » (قصبة الجزائر) et `est-restaurant-maroc` « Restaurant
   Marocain » (مطعم مغربي), au lieu de « Saveurs d'Algérie » et « Saveurs du
   Maroc ». Sinon le plateau, les bandeaux, les tuiles et la voix diraient un
   nom que la carte sous les yeux de l'enfant contredit.
5. **Les dix autres établissements ne changent pas** : sans carte dessinée, ils
   gardent l'habillage historique. Rien ne casse tant que la série n'est pas
   complète.

6. **La case du plateau EST la carte, bord à bord.** La case est carrée et la
   carte deux tiers plus haute que large : les deux ne peuvent pas être vraies
   en même temps. L'auteur a tranché — la carte REMPLIT la case, donc elle est
   recadrée. Le cadrage n'est pas deviné : essayé sur les deux cartes, il est
   fixé à 55 % de la hauteur, ce qui garde le cartouche du nom en entier et
   toute l'illustration ; seule l'arche décorative du haut sort du cadre.
   Cadrer par le bas, le réflexe, coupait le nom. Le ruban du nom disparaît sur
   ces cases — la carte porte déjà le sien, en ajouter un était une redite. Un
   établissement sans carte dessinée garde son emoji et son ruban.

7. **Une carte peut servir PLUSIEURS établissements.** Les deux hôtels d'une
   même ville partagent la carte de leur ville (`sites` en contient deux) : il
   n'y a qu'un dessin par ville, et les deux cases le portent. Le nom en
   données garde son suffixe A/B pour qu'on sache lequel on achète.

8. **Où couper est une DONNÉE de la carte** (`cellFocus`, fraction de la
   hauteur, 0,3 par défaut). La case est carrée, la carte deux tiers plus
   haute : il faut couper quelque part, et le bon endroit dépend du dessin.
   Mesuré sur chaque illustration — les six cartes de la série gardent leur
   cartouche entier à 0,30, là où la première carte le perdait.

## Conséquences

- La zone d'écriture de ces deux cartes a été MESURÉE sur l'illustration (cadre
  doré à 0,08–0,872 en largeur, 0,323–0,725 en hauteur) puis resserrée pour que
  le texte ne touche pas le liseré : 0,11 / 0,355 / 0,84 / 0,70. Vérifié dans
  le navigateur : contenu entier, aucun débordement, boutons dans le cadre.
- Le découpage des planches a d'abord rendu le fond transparent par
  remplissage depuis les bords. Mauvaise idée : le blanc de la carte est à
  quelques points du fond de la planche, le remplissage a traversé le liseré et
  vidé l'intérieur — à l'écran, le plateau apparaissait à travers la carte. Les
  cartes sont donc enregistrées en RGB, comme les autres ; l'affichage arrondit
  déjà les coins.
- Tests : la carte d'un établissement passe avant sa famille, un établissement
  sans carte garde l'habillage historique, chaque jeu vise un établissement qui
  existe, les quatre images sont présentes sur le disque, et le nom en données
  est bien celui peint sur la carte.
