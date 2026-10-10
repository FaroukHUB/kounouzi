# Questions à écrire — géographie, logique, gestion

## Pourquoi

Mesuré sur quatre parties de huit questions, après que la tranche d'âge a été
rendue effective (ADR 0055) : un enfant ne dispose que de **six à sept
questions pour son âge** en géographie, en logique et en gestion — contre 75 à
150 en religion. Une partie en sert huit par joueur.

Six questions ne peuvent pas tourner sans se répéter. Aucun réglage du moteur
ne corrige cela : **il manque du contenu**, et il n'en sera jamais inventé par
un assistant.

## État : les 358 cartes sont livrées, en attente de relecture

Les quinze fichiers sont remplis. **Rien n'est servi** : toutes les cartes sont
`draft`, et un test vérifie qu'une fois passées en `validated` elles
franchissent la garde de jouabilité — il ne leur manque donc que ta relecture,
ni source, ni explication, ni champ.

| Catégorie | Validées (servies) | Brouillons (en attente) |
|---|---|---|
| Géographie | 32 | 118 |
| Logique | 30 | 120 |
| Gestion | 30 | 120 |

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
