# 0049 — Un chronomètre par question, qui mesure sans juger

Date : 2026-10-01
Statut : acceptée

## Contexte

Demande de l'auteur après une partie réelle : « il faut mettre un chronomètre
pour chaque question ».

Deux règles du projet encadrent cette demande :

- une règle métier non définie se rend **configurable**, elle ne s'invente pas ;
- le résultat d'une réponse ne dépend **jamais** de la vitesse (ADR 0024 :
  dans un Duel, « correct > presque > incorrect, jamais la vitesse »).

Or la demande ne dit pas ce qui arrive à zéro : réponse comptée fausse ?
récompense perdue ? tour passé ? Rien de tout cela n'a été décidé.

## Décision

1. **Le chronomètre est affiché, il ne décide de rien.** À zéro il s'arrête et
   l'écrit (« Temps écoulé — réponds quand même ») ; la réponse reste possible
   et la validation reste celle de la tablée.
2. **Les durées sont des données** (`src/config/timer/question-timer.v1.json`,
   validées par Zod) et dépendent du type de profil de CELUI QUI RÉPOND : 60 s
   pour un enfant, 45 s pour un adulte, alerte à 10 s. `enabled: false` éteint
   le chronomètre partout.
3. **`atZero` ne connaît qu'une valeur, `signal`.** Les autres comportements
   imaginables ne sont pas écrits : le champ existe pour qu'une décision de
   l'auteur se branche sans rien réinventer.
4. **Il vit dans l'interface.** Aucune commande, aucune entrée dans l'état,
   donc aucun effet sur le déterminisme du moteur ni sur une partie reprise. Il
   tourne pendant qu'on cherche la réponse (étape « question ») et disparaît à
   la révélation, où il n'y a plus rien à mesurer.
5. **Le texte du Duel est corrigé** : il disait « ni vitesse, ni chrono », ce
   qui devient faux à l'écran. Il dit maintenant que le chronomètre donne le
   rythme et que « la vitesse ne change rien au résultat » — ce qui reste vrai,
   et qui est la vraie promesse.

## Conséquences

- Le fait que la vitesse n'entre dans AUCUN score reste intact : ni le
  classement, ni la récompense, ni la mémoire pédagogique ne voient le temps
  d'une réponse.
- Si l'auteur veut plus tard un effet à zéro, il faudra un ADR : la décision
  passera par le moteur (commande et événement), pas par l'interface.
- Tests (`questionTimer`) : la durée vient des données et suit le profil du
  répondant, le chronomètre apparaît pendant la recherche et pas après la
  révélation, à zéro il le dit sans rien empêcher, le seuil d'alerte se voit,
  et l'état de la partie est identique avec ou sans lui.
- Non fait, faute de demande : interrupteur dans les réglages parents (la
  donnée `enabled` suffit pour l'instant), durée par catégorie ou par difficulté,
  son de fin.
