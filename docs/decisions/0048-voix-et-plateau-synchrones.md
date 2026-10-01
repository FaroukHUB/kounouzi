# 0048 — Le plateau n'écrit jamais autre chose que ce que la voix dit

Date : 2026-10-01
Statut : acceptée

## Contexte

Constaté en partie réelle, sur une case Don : « la voix dit bien *Assia donne
20 Kounouz à Adam* mais le plateau écrit autre chose ».

Le texte n'était pas en cause : le bandeau et la phrase sont construits à partir
du MÊME événement (`MoneyTransferred`), avec les mêmes prénoms et le même
montant. C'est leur rythme qui divergeait :

- la narration est demandée au moment où le bandeau apparaît, mais la voix en
  ligne doit d'abord télécharger sa phrase (`/api/voix`) puis la dire ; elle
  finit donc APRÈS le bandeau, dont la durée est fixe (2,6 s pour un
  transfert) ;
- la file d'animation n'attendait pas la voix : elle enchaînait l'événement
  suivant et remplaçait le bandeau ;
- le narrateur empilait les phrases en retard, donc le décalage GRANDISSAIT au
  fil de la partie. Après quelques tours, la voix commentait un bandeau déjà
  remplacé deux fois.

## Décision

1. **Le bandeau attend sa phrase.** `NarrationService` expose `isSpeaking()`
   (une phrase est dite ou attend son tour) et la couche expérience fournit
   `voiceHold(narrator, maxMs)` à la file d'animation. Un bandeau ne s'efface
   plus avant la fin de la phrase qui l'accompagne.
2. **L'attente est bornée et facultative.** Plafond `voiceHoldMaxMs` = 4 s,
   compris dans le délai de sécurité de l'événement. Voix coupée, muette,
   absente ou animations réduites (`voiceHoldMaxMs` = 0) : aucune attente, donc
   le jeu ne dépend jamais de la narration (ADR 0036 inchangé).
3. **La voix ne prend pas de retard.** Quand une nouvelle phrase arrive, le
   narrateur en ligne ne garde qu'UNE phrase en attente (`maxQueued`) : les plus
   anciennes sont abandonnées. Une phrase abandonnée n'est pas une perte — tout
   ce qui est dit est aussi écrit. Une SÉQUENCE demandée (une question lue en
   plusieurs phrases) n'est jamais tronquée.

## Conséquences

- Le rythme du jeu suit la voix quand elle est active, et reste exactement celui
  d'avant quand elle est coupée.
- Le noyau n'est pas touché : tout ceci vit dans l'animation et l'expérience.
- Tests (`voixEtPlateau`) : le bandeau reste tant que la phrase dure, l'attente
  s'arrête dès qu'elle est dite, elle est plafonnée si la voix ne finit jamais,
  elle n'existe pas sans voix ni en animations réduites, et le narrateur
  abandonne bien la phrase en attente la plus ancienne sans tronquer une
  séquence.
- `isSpeaking()` entre dans l'interface `NarrationService` : les trois
  narrateurs (en ligne, appareil, muet) l'implémentent.
