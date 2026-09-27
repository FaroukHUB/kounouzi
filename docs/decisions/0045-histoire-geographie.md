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
4. **Rien n'est publié.** Les 30 cartes sont `draft` et la garde les refuse
   toutes, pour deux raisons distinctes, toutes deux assumées plutôt que
   comblées par une invention :
   - la catégorie exige une source pour tout fait, même évident (ADR 0038), et
     aucune n'a été fournie : le catalogue reste vide, aucune URL n'est devinée ;
   - l'auteur a écrit ces cartes en français seulement : l'arabe est absent, et
     l'explication arabe obligatoire (ADR 0004) manque donc partout.

## Conséquences

- La banque Géographie précédente (30 cartes `GEO-…`, elles aussi jamais
  servies faute de sources) disparaît du dépôt ; son contenu reste dans
  l'histoire Git.
- Deux notions ne portent qu'UNE carte — Égypte/Le Caire et Jérusalem. Réviser
  une notion à carte unique revient à reposer la même carte : il faudra soit
  deux cartes de plus, soit regrouper ces lieux avec d'autres. Le manque est
  signalé, pas comblé par des cartes inventées.
- Le nombre de catégories reste à cinq : religion, maths, logique, gestion,
  histoire & géographie.
