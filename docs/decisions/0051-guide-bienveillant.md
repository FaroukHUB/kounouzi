# 0051 — Le guide de Kounouzi : encourager, pas commenter

Date : 2026-10-01
Statut : acceptée

## Contexte

Retour de l'auteur : « ce n'est pas motivant, ce n'est pas encourageant ».
Deux choses se cachaient derrière.

1. **La voix elle-même** : la voix en ligne ne parlait pas (configuration du
   serveur), donc c'était la synthèse de l'appareil — plate par nature. Traité
   à part (affichage de la raison, ADR du même jour).
2. **Les mots et les moments** : le script de narration commentait la MÉCANIQUE.
   « C'est au tour de Maryam », « Tu es arrivé sur une case Savoir », « Bonne
   réponse ». Jamais de prénom dans les félicitations, jamais de variation, et
   un commentaire pour chaque arrivée alors que la carte s'ouvre juste après en
   disant la même chose, en grand et en image. Pendant ce temps, un
   établissement acquis ou une bonne action offerte passaient en silence.

## Décision

**Qui parle** : un guide bienveillant. Il s'adresse aux joueurs par leur
PRÉNOM, il félicite, il rassure quand on se trompe (aucune phrase ne gronde :
ni « faux », ni « perdu »), et il relance le groupe.

**Ce qu'il souligne** : les moments forts. Deux d'entre eux étaient muets et
parlent désormais — un établissement qui rejoint le patrimoine, une bonne action
offerte (Hassanāt). La générosité, la Zakat, le trésor, le Duel, le dernier tour
gardent leur phrase, réécrite plus chaleureuse.

**Ce qu'il tait** : l'arrivée sur une case. La carte qui s'ouvre juste après le
dit déjà. Ces dix phrases sortent aussi de la liste pré-générée : on ne fabrique
plus un fichier audio pour rien.

**Comment il varie** : ZÉRO HASARD, comme partout. Trois formulations existent
pour le tour, le Chemin et chacun des trois résultats ; la variante est choisie
par un rang CALCULÉ : tour de table compté double, plus la place dans ce tour.
Un même joueur avance de deux formulations d'un tour de table à l'autre — ce qui
change à tous les coups, de deux à six joueurs — et deux joueurs voisins
n'entendent pas la même phrase. Prendre le numéro de tour seul ne marchait pas :
avec trois joueurs et trois formulations, chacun aurait toujours entendu la même
phrase. Une partie rejouée dit donc exactement les mêmes mots, et la voix
pré-générée reste utilisable.

**Le ton de la voix** : `voiceSettings` entre dans les données
(`voice.v1.json`, validé par Zod) et part tel quel au fournisseur — stabilité
0,35, style 0,45. Une voix très « stable » lit à plat : c'est ce qui fait dire
« on dirait un robot ». Les changer ne demande aucun code.

## Conséquences

- Mesuré sur une partie entière simulée : chaque joueur entend bien les trois
  formulations à tour de rôle, les félicitations portent son prénom, et la bande
  son ne contient plus une seule phrase d'arrivée.
- Les clés remplacées (`narration.turn`, `narration.journey`,
  `narration.result.*`, `narration.arrived.*`) sont retirées des deux
  dictionnaires : rien d'orphelin.
- Les tests qui figeaient l'ancienne formulation ont été réécrits : ils
  vérifient maintenant l'INTENTION — le prénom est dit, l'arrivée est tue, les
  moments forts parlent, aucune phrase d'échec ne gronde, et la variation est
  déterministe pour deux à six joueurs.
- Arabe fourni pour chaque phrase, au même niveau que le français.
