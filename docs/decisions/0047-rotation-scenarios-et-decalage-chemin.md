# 0047 — Le Défi famille sortait presque jamais, et toutes les parties commençaient pareil

Date : 2026-10-01
Statut : acceptée

## Contexte

Deux défauts constatés en partie réelle, que les tests ne voyaient pas parce
qu'ils jouaient sur un plateau linéaire à UNE case par type :

1. **« Pourquoi le Défi famille n'apparaît pratiquement jamais ? »**
   Le scénario d'une case était choisi par le nombre de visites de CETTE case :
   `candidates[(visite − 1 + décalage) % candidates.length]`. Le plateau compte
   **cinq** cases Défi et la famille Défi compte **quatre** scénarios (Duel,
   Défi famille, question, Hassanāt). Arriver pour la première fois sur
   n'importe laquelle des cinq donnait donc toujours le premier scénario, le
   Duel. Pour voir le Défi famille, il fallait retomber une deuxième fois sur
   la **même** case — et le Hassanāt, une quatrième fois.

2. **« À chaque partie ça commence pareil. »**
   Les six variantes du Chemin tournent bien d'une partie à l'autre (ADR 0018),
   mais cinq d'entre elles commencent par un pas de 1 : le premier joueur
   avançait d'une case au premier tour dans presque toutes les parties.

## Décision

1. **La rotation des scénarios se compte par FAMILLE DE CASE, pas par case.**
   Nouveau compteur d'état `scenarioServed` (par `cellType`), incrémenté à
   chaque scénario servi ; le scénario est
   `candidates[(déjàServis + scenarioOffset) % candidates.length]`. Les
   premières arrivées sur les cases Défi servent donc les quatre scénarios,
   Défi famille compris. Rien n'est tiré au sort : le compteur est dans l'état,
   donc la partie reste rejouable à l'identique.

2. **La partie reçoit un décalage de Chemin, compté en BLOCS**
   (`config.journeyOffset`). Le siège `s` lit le bloc `s + décalage` au lieu du
   bloc `s`. Compté en blocs et non en valeurs, il conserve **exactement**
   toutes les propriétés du cycle : mêmes multiplicités par siège, même
   distance totale après tout multiple de `stepMax` voyages, jamais deux fois
   le même nombre de pas de suite. Un décalage en valeurs les aurait cassées —
   les sièges n'auraient plus parcouru la même distance (vérifié, c'est la
   première version qu'un test a rejetée).

3. **Le décalage vient du même compteur persistant que la variante**
   (`numéro de partie familiale − 1`, fourni par l'interface à la création,
   jamais tiré au sort ni calculé dans le noyau). Sur les six premières
   parties, le premier pas prend cinq valeurs différentes au lieu de deux.

4. **Schéma v9 → v10.** `config.journeyOffset` et `scenarioServed` entrent dans
   l'état sérialisé ; la migration donne `0` et `{}` aux parties enregistrées,
   qui restent donc lisibles et se comportent comme avant pour leur suite.

## Conséquences

- Le `visit` reste dans l'événement `ScenarioTriggered` : il décrit toujours la
  case, il ne choisit plus le scénario.
- Un test de non-régression (`varietePartie`) fixe les deux corrections : les
  premières arrivées sur les cinq cases Défi ne servent plus toutes le même
  scénario, les quatre scénarios sortent dans la partie, le Défi famille sort
  sur le vrai plateau, et le décalage ne touche ni au déterminisme ni à
  l'équité entre sièges.
- Un test de la simulation familiale a été réécrit : il affirmait que, dans
  cette partie précise, le vainqueur n'était pas le plus riche. Changer la
  rotation des scénarios change le déroulé de cette partie, donc ce constat
  d'occasion ne tenait plus. Il vérifie désormais la règle elle-même — le score
  suit exactement la formule, et monter le poids Hassanāt fait passer le plus
  généreux devant — ce qui ne dépend plus du hasard d'un déroulé.
- La période de variation inter-parties reste de six parties (six variantes,
  six blocs) : les six ouvertures sont maintenant distinctes, là où cinq sur
  six étaient identiques.
