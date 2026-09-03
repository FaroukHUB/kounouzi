# 0012 — Hypothèses provisoires du moteur (Phase 2), à confirmer

**Statut** : provisoire — chaque point est configurable ou isolé, aucun n'est une règle de Kounouzi

## Contexte
Pour qu'une partie complète soit simulable, certains comportements devaient
exister sans que la règle fonctionnelle soit encore décidée. Ils sont listés
ici pour être tranchés explicitement, pas découverts plus tard.

## Hypothèses
1. **Montants** (`tests/fixtures/game/rules.fixture.ts`) — argent de départ
   1000, bonus de passage par le départ 100, gains 50/25/0, ×2 de maîtrise,
   prix de test 300–650. Valeurs de test uniquement.
2. **Solde négatif interdit** (`rules.allowNegativeBalance = false`) — une
   perte est plafonnée à ce que le joueur possède. Configurable.
3. **Tour sauté non compté** — un `skip_turn` n'incrémente pas
   `turnsPlayed` (le joueur n'a pas joué). À confirmer.
4. **Déplacement de scénario sans résolution de la case d'arrivée** par
   défaut (`resolveDestination: false`). Un scénario peut demander la
   résolution explicitement.
5. **Offre d'achat même si le solde est insuffisant** — l'offre est faite
   (`affordable: false`), l'achat est refusé, le joueur passe. L'interface
   pourra griser le bouton.
6. **Tour supplémentaire** — repris immédiatement par le même joueur ; un
   `skip_turn` en attente est consommé à l'ouverture du tour.
7. **Multiplicateur de récompense** — consommé à la première récompense
   effectivement versée (une réponse incorrecte ne le consomme pas).
8. **Classement** — score = argent × poids + valeur patrimoniale × poids
   (poids 1/1 en test) ; égalité départagée par l'argent, puis le siège.
9. **Scénario tiré au hasard** parmi ceux du type de la case (RNG à graine),
   uniformément.

## Conséquences
- Tout est modifiable sans toucher aux règles du moteur, sauf 3, 6 et 7 qui
  sont des décisions de séquence à confirmer avant la Phase 4.
