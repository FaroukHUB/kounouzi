# Questions à écrire — géographie, logique, gestion

## Pourquoi

Mesuré sur quatre parties de huit questions, après que la tranche d'âge a été
rendue effective (ADR 0055) : un enfant ne dispose que de **six à sept
questions pour son âge** en géographie, en logique et en gestion — contre 75 à
150 en religion. Une partie en sert huit par joueur.

Six questions ne peuvent pas tourner sans se répéter. Aucun réglage du moteur
ne corrige cela : **il manque du contenu**, et il n'en sera jamais inventé par
un assistant.

## État : VALIDÉ par l'auteur — les 349 cartes sont en jeu

L'auteur a relu et validé le 2026-10-13. Les cartes sont **servies en partie**.
Un test vérifie, pour chacune des 349, qu'elle franchit bien la garde de
jouabilité : un `validated` que la garde rejetterait serait un piège silencieux
— la carte serait réputée relue et pourtant jamais distribuée.

| Catégorie | Cartes servies | Brouillons restants |
|---|---|---|
| Géographie | **141** (32 + 109) | 0 |
| Logique | **150** (30 + 120) | 0 |
| Gestion | **150** (30 + 120) | 0 |
| Religion | 375 | 0 |

**`arReview` reste `provisional` sur les 349.** C'est un champ DISTINCT : il
atteste d'une relecture par un **arabophone**, qui n'a pas eu lieu. La
validation de l'auteur ne la remplace pas, et le passage à `reviewed` attendra.

Mesuré sur quatre parties de huit questions, après validation :

| Âge | Questions distinctes | Même carte au plus | Hors de sa tranche |
|---|---|---|---|
| 6 ans | 29 / 32 | 2× | **0** |
| 7 ans | 26 / 32 | 3× | **0** |
| 9 ans | 29 / 32 | 2× | **0** |
| 12 ans | 28 / 32 | 3× | **0** |
| 14 ans | 27 / 32 | 3× | **0** |

Les cinq catégories sont désormais représentées de façon équilibrée dans une
partie (aucune au-delà de 8 questions sur 32). Les reprises qui restent sont la
**révision espacée**, pas un manque de contenu : elle se règle dans
`learning.v1.json` (`variety.revisionShare`).

### Relecture de fond : ce qui a été décidé

Les 358 cartes ont été lues une par une, pas seulement contrôlées sur leur
forme. La logique et la gestion sont sans défaut relevé : les quinze calculs
des explications ont été refaits, ainsi que les énigmes non triviales (le
problème des menteurs n'admet bien qu'une solution). L'arabe est idiomatique et
emploie la bonne terminologie ; une relecture arabophone reste nécessaire.

Trois points ont été soulevés en géographie. L'auteur a tranché :

1. **Neuf cartes RETIRÉES** (`HISTGEO-78-018`, `910-010`, `910-019`,
   `1112-009/010/019`, `13p-009/011/022`). Elles racontaient la Hijra,
   l'émigration du Prophète ﷺ ou la formation de la première communauté
   musulmane, avec pour seule source le portail de présentation du Royaume et
   les pages de villes du ministère du Hajj — qui établissent OÙ sont La Mecque
   et Médine, pas la Hijra. La catégorie géographie ne lit pas l'explication et
   n'affiche aucune source : un récit historico-religieux y serait affirmé sans
   rien pour l'étayer. Ce contenu a sa place en catégorie religion, qui exige
   une source primaire et lit l'explication en FR puis en AR ; il faudra alors
   une référence de Sīra. **Ce qui reste est de la géographie pure** : où est la
   Kaaba, où est la Mosquée du Prophète, les deux villes sont-elles dans le même
   pays, La Mecque est-elle la destination du Hajj.
2. **Les tranches 11-12 et 13+ gardent leurs questions ouvertes**, aux réponses
   attendues longues (72 à 91 caractères, contre 38 dans la banque validée).
   Choix assumé : elles sont faites pour se DISCUTER en famille, pas pour se
   répondre au chronomètre. À ne pas « corriger ».
3. **La tranche 5-6 garde ses questions binaires** (23 sur 24 gagnables une fois
   sur deux au hasard). Choix assumé : reconnaître la bonne réponse entre deux
   est déjà un apprentissage à cet âge. À ne pas « corriger ».

Après retrait, les tranches de géographie 7-8 (29), 9-10 (29), 11-12 (27) et
13+ (28) passent sous la cible de 30 ; 5-6 l'atteint (30).

Ce que la relecture débloque, par âge et par catégorie :

| Âge | Géographie | Logique | Gestion |
|---|---|---|---|
| 6 ans | 6 → **30** | 6 → **30** | 6 → **30** |
| 7 ans | 7 → **30** | 6 → **30** | 6 → **30** |
| 9 ans | 6 → **30** | 6 → **30** | 6 → **30** |
| 12 ans | 7 → **30** | 6 → **30** | 6 → **30** |
| 14 ans | 6 → **30** | 6 → **30** | 6 → **30** |

Sur quatre parties de huit questions, un enfant de 6 ans passe de 25 à **29**
questions distinctes sur 32, et une même carte ne revient plus que deux fois au
lieu de trois. Le reste des reprises n'est pas un manque de contenu : c'est la
**révision espacée** qui fait son travail — elle se règle dans
`learning.v1.json` (`variety.revisionShare`), elle ne s'écrit pas.

## Ce qu'il manquait au départ

Cible : **30 questions par catégorie et par tranche**, soit environ quatre
parties sans qu'une question revienne.

| Catégorie | 5-6 | 7-8 | 9-10 | 11-12 | 13+ | À écrire |
|---|---|---|---|---|---|---|
| Géographie | 6 | 7 | 6 | 7 | 6 | **118** |
| Logique | 6 | 6 | 6 | 6 | 6 | **120** |
| Gestion | 6 | 6 | 6 | 6 | 6 | **120** |

**358 questions** au total. La religion n'a besoin de rien.

## Où écrire

Un fichier par catégorie et par tranche, déjà créé et **déjà chargé par le
jeu** : une question y devient jouable dès qu'elle passe en `validated`, sans
toucher à une ligne de code.

| Tranche | Géographie | Logique | Gestion | Difficulté attendue |
|---|---|---|---|---|
| 5-6 | `history-geography/histoire-geographie-56.v1.json` | `logic/logique-56.v1.json` | `management/gestion-56.v1.json` | 1 ou 2 |
| 7-8 | `…-78.v1.json` | `…-78.v1.json` | `…-78.v1.json` | 2 ou 3 |
| 9-10 | `…-910.v1.json` | `…-910.v1.json` | `…-910.v1.json` | 2 ou 3 |
| 11-12 | `…-1112.v1.json` | `…-1112.v1.json` | `…-1112.v1.json` | 3 ou 4 |
| 13+ | `…-13p.v1.json` | `…-13p.v1.json` | `…-13p.v1.json` | 4 ou 5 |

Tous sous `src/content/questions/`. Chaque fichier porte un `$gabarit` qui
montre les champs à remplir.

## Les règles, qui ne se contournent pas

- **L'explication est obligatoire en français ET en arabe.** Le chargement
  échoue sans les deux (ADR 0004). L'énoncé et la réponse peuvent n'être qu'en
  français ; l'arabe s'ajoute à la relecture.
- **`status` reste `draft` tant qu'un humain n'a pas relu.** Rien n'est servi
  d'ici là : écrire en plusieurs fois ne casse jamais une partie.
- **`ageBand` doit être celle du fichier.** Un test le vérifie — une question
  rangée dans « 5-6 » mais étiquetée « 11-12 » repartirait au mauvais enfant,
  c'est exactement le défaut corrigé par l'ADR 0055.
- **`knowledgeNodeId` est la NOTION travaillée** (`logique.appartenance`,
  `gestion.budget`…), pas l'identifiant de la question. Le moteur évite de
  servir deux questions de la même notion coup sur coup : une notion par
  question bien nommée vaut mieux que trente notions distinctes.
- **Géographie : toute question affirmant un fait doit citer sa source**
  (catalogue `sources` + `sourceKeys`), jamais une URL devinée. Logique et
  gestion n'exigent pas de source : elles énoncent un raisonnement, pas un fait.
- **Identifiants** : `HISTGEO-56-001`, `LOG-78-002`, `GEST-910-003`… Aucun
  doublon dans toute la banque, un test le vérifie.

## Vérifier

`pnpm check` suffit : le chargement valide les données, et les tests contrôlent
la tranche, la difficulté, les doublons et la présence des deux langues.
