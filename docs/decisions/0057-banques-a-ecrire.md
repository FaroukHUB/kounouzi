# 0057 — Quinze banques vides, prêtes à recevoir le contenu manquant

Date : 2026-10-06
Statut : acceptée

## Contexte

« Les réponses sont encore répétitives. » Mesure, et non impression : une fois
la tranche d'âge rendue effective (ADR 0055), voici ce dont dispose un enfant
pour SON âge.

| Catégorie | Questions disponibles par âge |
|---|---|
| Religion | 75 à 150 |
| Géographie | 6 à 7 |
| Logique | 6 |
| Gestion | 6 |
| Mathématiques | généré, illimité |

Une partie sert huit questions par joueur. **Six questions ne peuvent pas
tourner sans se répéter.** Le moteur de sélection n'est pas en cause : il
choisit au mieux dans ce qu'on lui donne, et les garde-fous de variété sont
déjà réglés sur de vraies parties. Ce qui manque, c'est du contenu.

## Décision

1. **Quinze banques VIDES** — trois catégories × cinq tranches d'âge — créées
   et **déjà chargées par le jeu**. Une question y devient jouable dès qu'elle
   passe en `validated`, sans toucher à une ligne de code.
2. **Un gabarit dans chaque fichier** : les champs à remplir, la difficulté
   attendue pour la tranche, la convention d'identifiants.
3. **Des tests qui gardent le remplissage honnête** : la tranche d'une question
   est bien celle de son fichier (sinon on refait le défaut de l'ADR 0055), la
   difficulté est dans les bornes, aucun identifiant n'est en double dans toute
   la banque, et l'explication existe en français ET en arabe.
4. **Aucune question n'est écrite par un assistant.** C'est une règle du projet
   et elle n'est pas négociable ici : 358 questions restent à écrire et à faire
   relire par un humain (`docs/content/a-ecrire.md`).

## Conséquences

- Un fichier vide ne casse rien : la garde de jouabilité ne sert que les
  questions `validated` et complètes. Le remplissage peut se faire en plusieurs
  fois, sans jamais casser une partie en cours de route.
- Tant que ces banques ne sont pas remplies, la répétition demeure dans ces
  trois catégories. Le dire fait partie du travail : la corriger autrement
  voudrait dire soit inventer des questions, soit renvoyer les enfants vers des
  questions qui ne sont pas de leur âge — on a fait le contraire à l'ADR 0055.
- Les mathématiques, seul contenu généré, prennent mécaniquement un peu plus de
  place en attendant. Ce n'est pas un choix, c'est la conséquence du manque.
