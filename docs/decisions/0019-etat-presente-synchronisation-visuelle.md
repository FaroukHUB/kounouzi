# 0019 — État présenté : synchronisation visuelle des panneaux

**Statut** : acceptée (Phase 3.1)

## Contexte
Le moteur acquiert le nouvel état immédiatement (commande → état → sauvegarde
→ événements → animation). Les panneaux affichaient donc « le futur »
(joueur suivant, nouveau solde) pendant que le pion avançait encore.

## Décision
- Le moteur et le `gameStore` restent exactement inchangés (jamais retardés).
- `uiStore.presentedState` est une **projection de présentation** : chaque
  commande dépose ses événements en file avec, sur le dernier, l'état réel à
  « poser ». Quand un événement est rejoué, il est projeté sur l'état
  présenté à partir de son seul payload (`TurnStarted` → joueur actif,
  `MoneyChanged` → `balanceAfter`, `SiteAcquired` → patrimoine) ; à la fin
  du lot, l'état réel est posé. Un lot sans événement (horloge) est posé tout
  de suite si rien n'est en cours, sinon après la file.
- Les panneaux (joueurs, temps, bandeaux, classement, « Au tour de ») lisent
  l'état présenté ; les commandes et le bouton du Chemin utilisent l'état
  réel et la file (bouton masqué tant que la séquence visuelle n'est pas
  terminée). À la reprise, présenté = réel.
- Aucune règle économique n'est recalculée : `projectEvent` ne fait que
  copier des valeurs annoncées par les événements.

## Conséquences
- « Au tour de Yacine » n'apparaît qu'après la fin de la séquence de Maryam.
- Le même mécanisme servira aux animations « +100 » / « achat » de la
  Phase 4.
