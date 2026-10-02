# 0052 — La voix dit ce qui est à l'écran MAINTENANT (complète l'ADR 0048)

Date : 2026-10-02
Statut : acceptée

## Contexte

L'ADR 0048 avait réglé un symptôme : le bandeau du plateau s'effaçait avant la
fin de sa phrase. Retour de l'auteur après une partie : « la voix n'est pas en
phase avec le jeu ». Le défaut restant est structurel, et plus large.

**Deux choses font parler le jeu, et elles ne se connaissaient pas :**

1. la file d'animation, qui raconte le plateau (tour, Chemin, transferts…) ;
2. la carte ouverte, qui raconte son étape (énoncé, réponse, explication,
   résultat, récompense).

Deux conséquences, toutes deux visibles en partie :

- **La tablée avance, la voix non.** On appuie sur « Voir la réponse » : la
  carte montre la réponse, mais la voix lit encore « Réponse B… » de la
  question. L'écart ne se rattrape jamais : la voix reste en retard d'une étape
  jusqu'à la fin du tour.
- **La file avance, la voix non.** Les étapes de carte pilotées par la file —
  résultat, récompense, fermeture — défilaient sur des durées FIXES (1 s, 1,5 s)
  alors qu'une phrase d'encouragement dure trois secondes. Seuls les bandeaux
  attendaient leur phrase ; les cartes, non.

## Décision

Une seule règle, deux applications symétriques : **la voix dit ce qui est à
l'écran maintenant.**

1. **Côté CARTE, une étape REMPLACE ce qui se disait** (`annonce`, couche
   expérience : coupe puis dit). Quand la tablée avance, la voix avance avec
   elle, quitte à couper une phrase — c'est exactement ce qu'il faut, puisque
   l'écran ne montre déjà plus ce dont elle parlait. Appliqué à toutes les
   cartes qui parlent.
2. **Côté PLATEAU, la file n'avance pas plus vite que la voix.** L'attente
   bornée de l'ADR 0048 ne s'appliquait qu'aux bandeaux ; elle s'applique
   désormais à CHAQUE événement rejoué. Une annonce du plateau ne coupe donc
   jamais la précédente, et une étape de carte pilotée par la file ne défile
   plus devant sa phrase.

## Conséquences

- Le rythme du jeu suit la voix quand elle parle, et reste exactement celui
  d'avant quand elle est coupée, muette ou absente (`isSpeaking()` est alors
  faux, l'attente est un no-op). Le jeu ne dépend jamais de la narration.
- Les deux attentes d'un même événement (bandeau, puis file) sont bornées
  séparément. Dans la vraie vie la seconde est instantanée — la phrase est déjà
  dite ; avec une voix qui ne finirait jamais, les deux plafonds s'appliquent et
  c'est tout.
- Le noyau n'est pas touché : tout vit dans l'animation et l'expérience.
- Tests : une étape de carte coupe AVANT de dire (jamais d'empilement), la file
  attend la voix même pour un événement sans bandeau, le bandeau reste tant que
  la phrase dure, et rien n'attend sans voix.
