# 0045 — Histoire et Géographie n'en font qu'une, centrée sur la carte du plateau

Date : 2026-09-27
Statut : acceptée

## Contexte

L'Histoire manquait au Savoir. Une catégorie Histoire séparée aurait ajouté une
sixième matière, donc dilué chaque catégorie dans la rotation, pour un découpage
que rien n'impose : un lieu n'est pas d'abord de la géographie ou de l'histoire,
il est les deux.

La carte illustrée du plateau porte déjà neuf lieux : Al-Andalus (Cordoue),
Maroc (Marrakech), Algérie (Alger), Tunisie (Kairouan et Carthage), Égypte
(Le Caire), Jérusalem, Istanbul, Samarcande.

## Décision

1. **La catégorie `geography` devient « Histoire & Géographie »** — le libellé
   change, l'identifiant NON. Les parties enregistrées, la mémoire pédagogique
   et les références de questions restent lisibles.
2. **La banque Géographie seule est remplacée** par 30 cartes
   `HISTGEO-001 … HISTGEO-030` écrites par l'auteur, centrées sur les lieux de
   la carte du plateau : ce que l'enfant voit au centre du plateau devient le
   contenu de ses questions, pas un décor.
3. **Progression par tranche**, six cartes chacune : 5-8 ans « où est-ce ? »,
   9-12 ans « que s'est-il passé ? », 13 ans et plus « pourquoi ce lieu
   a-t-il compté ? ». Des dates apprises par cœur ne sont demandées nulle part.
4. **32 cartes, aucune notion à carte unique.** Le Caire et Jérusalem, d'abord
   portés par une seule carte, en reçoivent une seconde (HISTGEO-031 et 032,
   fournies par l'auteur avec leur arabe et leur source) : réviser une notion
   ne revient jamais à reposer la même carte. La carte du Dôme du Rocher
   rejoint la notion `histgeo.jerusalem` pour que les deux cartes de Jérusalem
   partagent bien la même notion.
5. **L'arabe est une traduction fidèle du français**, sans ajout ni retrait, et
   reste `arReview: "provisional"` sur les 32 cartes : aucune traduction n'est
   tenue pour relue humainement à ce stade.
6. **Le catalogue de sources ne contient que des sources officielles** vérifiées
   par l'auteur : la classification des pays de l'ONU (UNSD M49) pour situer un
   lieu, les fiches du patrimoine mondial de l'UNESCO pour les neuf lieux
   historiques. Une même source couvre plusieurs cartes. Les URL ne figurent
   que là où l'auteur les a données explicitement (UNSD M49, Le Caire
   historique, Vieille ville de Jérusalem) : l'environnement de développement
   n'atteint pas `whc.unesco.org`, donc les numéros de fiche des sept autres
   sites n'ont pas pu être vérifiés et ces entrées portent leur titre et leur
   éditeur SANS URL. Le schéma l'autorise — une URL peut être absente, jamais
   fictive.
7. **Une carte n'est publiée que si la garde ne remonte plus rien.** Dix-neuf
   cartes sont désormais `validated` et servies. Treize restent `draft` : leur
   auteur ne leur a donné AUCUNE explication, et une explication ne s'invente
   pas ici.

## Conséquences

- La banque Géographie précédente (30 cartes `GEO-…`, jamais servies faute de
  sources) disparaît du dépôt ; son contenu reste dans l'histoire Git.
- **La catégorie entre en production** : cinq catégories sont désormais servies
  — religion, mathématiques, Histoire & Géographie, logique, gestion — et le
  Learning Engine n'a pas changé d'une ligne pour autant.
- Les treize explications manquantes sont le seul travail restant sur cette
  banque ; un test simule leur arrivée et vérifie que les 32 cartes deviennent
  alors jouables.
