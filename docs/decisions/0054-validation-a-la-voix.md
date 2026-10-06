# 0054 — Valider à la voix, sans juger la réponse

Date : 2026-10-06
Statut : acceptée

## Contexte

L'enfant répond DÉJÀ oralement : la question est lue, il répond à la table, la
carte révèle la réponse, et quelqu'un appuie sur Correct / Presque / Incorrect.
Il n'y a ni QCM ni saisie clavier. Ce qui manquait n'était donc pas que l'enfant
parle, mais que l'appareil entende — et il fallait d'abord décider CE qu'il
entend.

Deux fonctions très différentes se cachaient derrière la demande :

- **A.** La machine écoute la réponse et la juge. Les réponses sont des phrases
  libres (« En Afrique. »), en FR et en AR ; la reconnaissance vocale est
  nettement plus faible sur les voix d'enfants, plus faible encore en arabe, et
  une tablée bruyante est son pire cas. Déclarer « faux » un enfant qui avait
  juste est pire que de le faire attendre une seconde.
- **B.** La machine entend le VERDICT que la tablée prononce de toute façon
  (« correct », « presque », « faux »). Vocabulaire fixe, aucun sens à deviner,
  et le gain est réel : plus besoin de tendre le bras par-dessus la table.

L'auteur a tranché pour **B**, par le navigateur seul.

## Décision

1. **La machine ne juge JAMAIS la réponse d'un enfant.** Elle appuie sur un
   bouton qui existe déjà, et qui reste utilisable au doigt. Les trois boutons
   et la voix passent par la même fonction de validation : la voix n'a aucun
   pouvoir que le doigt n'a pas, et ne peut pas diverger.
2. **Le micro ne s'ouvre qu'à l'étape « réponse révélée ».** Pendant que
   l'enfant répond, il est FERMÉ : sa réponse n'est jamais écoutée, jamais
   transcrite, jamais envoyée nulle part. La règle est une fonction pure
   (`ecouteAutorisee`) et un test parcourt TOUTES les étapes de la carte.
3. **Tant que la voix off parle, le micro reste fermé.** Sinon le jeu s'entend
   lui-même prononcer la réponse et pourrait y reconnaître un verdict.
4. **Le navigateur, et lui seul.** Aucune clé, aucun service Kounouzi, aucun
   audio envoyé ni enregistré par le jeu. Le navigateur peut, lui, faire appel à
   son propre service de reconnaissance : c'est écrit dans les réglages, en
   toutes lettres, parce qu'il s'agit de la voix d'un enfant.
5. **ÉTEINT par défaut.** Un micro ne s'allume jamais à la place du parent. Le
   réglage est une préférence d'appareil, hors de l'état de la partie.
6. **Un micro ouvert se voit.** Un témoin apparaît sur la carte pendant
   l'écoute, et rappelle les trois mots attendus.
7. **Le vocabulaire est une DONNÉE** (`ecoute.v1.json`), validée par Zod,
   restreinte aux trois issues du moteur : aucune commande ne peut porter sur
   autre chose. L'enrichir ne demande aucun code.
8. **Quand l'appareil ne peut pas écouter, il DIT pourquoi** : navigateur sans
   reconnaissance (Firefox), page non sécurisée, micro refusé. Un réglage qui
   ne fait rien sans l'expliquer est pire que pas de réglage.

### Trois règles de reconnaissance, et elles comptent toutes les trois

- **Mots entiers.** Sinon « injuste » vaudrait « juste ».
- **La phrase la plus LONGUE gagne.** Sinon « pas juste » serait entendu comme
  « juste » : un enfant qui a eu faux serait félicité, et l'inverse.
- **Deux verdicts à égale longueur ne valident RIEN.** On ne devine pas un
  verdict à la place d'un enfant : la tablée redit le mot, ou appuie.

## Conséquences

- Le garde-fou religieux qui interdisait la reconnaissance vocale PARTOUT a été
  rendu PLUS précis, pas plus faible. Ce qu'il protège — aucune récitation du
  Coran jugée par une machine — est maintenant prouvé par trois verrous au lieu
  d'une interdiction en bloc qui ne disait pas ce qu'elle gardait : un SEUL
  fichier touche à l'API du navigateur (interdite partout ailleurs, noyau,
  contenu, cartes et scripts compris), le vocabulaire ne contient que les trois
  verdicts d'une question, et seule la carte Question ouvre le micro — la carte
  Défi, celle qui porte les récitations, ne le fait nulle part.
- L'écoute ne touche pas au moteur : elle n'ajoute aucune commande, n'entre pas
  dans l'état de la partie et ne change rien au déterminisme.
- Ce qui n'a PAS été fait : dicter la réponse, l'afficher transcrite, la noter
  automatiquement. Ce sont des décisions séparées, non prises.
- Vérifié dans le vrai jeu, navigateur piloté, reconnaissance simulée : à
  l'étape « question », aucune reconnaissance n'est créée et aucun témoin ne
  s'affiche ; après la révélation, le micro s'ouvre une fois la voix off tue ;
  « c'est presque ça » valide « Presque » sans toucher l'écran.
