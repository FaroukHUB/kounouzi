# 0029 — Phase 5.4 : âge au lieu de la classe, progression plus lente, anti-répétition par partie, panneaux et paiement lisibles

**Statut** : acceptée (retours du premier playtest familial)

## Contexte
Premier vrai playtest : la classe scolaire n'a pas de sens commun (un enfant
en France et un enfant en Algérie du même âge sont dans des classes
différentes) ; les questions ne collaient pas à l'année ; les mêmes questions
revenaient trop souvent ; les gains et le patrimoine étaient trop petits à
l'écran ; un paiement vers un autre joueur n'était pas assez explicite.

## Décision
- **Âge, jamais la classe.** Le profil enfant ne porte plus que l'année de
  naissance ; l'âge (année civile − année de naissance, horloge injectée)
  amorce le niveau via des bandes PAR ÂGE (`bands.v1.json` : ≤ 6 → 1-2,
  ≤ 8 → 1-3, ≤ 10 → 2-3, ≤ 12 → 2-4, au-delà → 3-5 ; âge inconnu = la plus
  jeune). L'adulte garde son niveau initial. La classe disparaît du formulaire
  et des données.
- **Progression plus lente** (`learning.v1.json`) : six essais informatifs
  minimum avant tout palier, fenêtre de huit, seuil de montée 0,85. Jamais +1
  sur une bonne réponse.
- **Anti-répétition par partie** : chaque essai portant déjà l'identifiant de
  partie, le Learning Engine pénalise fortement une formulation déjà posée
  dans la partie en cours (`repeatInGame`) et, hors révision due, une notion
  déjà vue dans la partie (`repeatNodeInGame`). Fenêtres générales relevées
  (formulation : 20 essais, notion : 5). Une nouvelle partie repart sans ce
  handicap. Aucun hasard : rien ne change au départage stable.
- **Panneaux autour du plateau** : jusqu'à 4 joueurs, une tuile par joueur
  encadre le plateau (coins début/fin, haut/bas, propriétés logiques), grille
  2 × 2 au-dessus du plateau sur petit écran ; les Kounouz s'affichent en
  grand. Au-delà de 4, liste latérale avec les mêmes tuiles.
- **Paiement explicite** : le bandeau d'un transfert dit « X paie N Kounouz
  à Y — monument de Y » (ou « X donne N Kounouz à Y »), en grand, plus
  longtemps (`transferMs`).
- **Modèle de banque de questions** (`docs/import/MODELE_QUESTIONS.md`) pour
  les autres matières : même format que les banques religieuses, catégorie
  déduite du nœud, source facultative hors religion, animation facultative,
  tout en brouillon. L'importeur est généralisé en conséquence (les quatre
  banques religieuses ressortent strictement identiques).

## Conséquences
- Les profils déjà enregistrés gardent leur année de naissance ; l'ancien
  champ de classe est simplement ignoré.
- Montants DEMO inchangés ; formule de score non décidée ; FamilyAssist non
  implémenté ; rien de Phase 6.
