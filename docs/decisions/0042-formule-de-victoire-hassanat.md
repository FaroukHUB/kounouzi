# 0042 — Formule de victoire : la générosité compte dans le score

**Statut** : acceptée (décision produit, 2026-09-27) — clôt le point laissé
ouvert par l'ADR 0035

## Contexte
Depuis l'ADR 0035, les points Hassanāt existent comme ressource distincte des
Kounouz : ils sont gagnés, enregistrés dans un grand livre, affichés. Mais
`hassanatWeight` valait **0** dans les règles servies, et le code le disait :
« formule PROVISOIRE, le poids reste 0 tant que la formule de victoire n'est
pas décidée ».

Autrement dit, la partie se terminait, un classement sortait — et la
générosité ne comptait pour rien. C'était la dernière décision de conception
ouverte, et la seule qui empêchait Kounouzi d'être un jeu fini : on ne savait
pas comment on gagne.

Aucun test ne couvrait la formule : la passer de 0 à 5 n'a fait échouer
strictement aucune assertion.

## Décision

### 1. Les points Hassanāt entrent dans le score
`score = argent × moneyWeight + patrimoine × heritageWeight + Hassanāt × hassanatWeight`

Les trois poids restent des **données de règles** validées par Zod, jamais
codées en dur. Un joueur peut désormais gagner sans être le plus riche.

### 2. Le poids est 5, et il est mesuré
Le chiffre ne vient pas d'une intuition mais de la simulation familiale
réelle (quatre joueurs, 14 tours, plateau 28) :

| Poids | Effet observé |
| --- | --- |
| 0 | Hassanāt décoratifs, le classement suit la fortune |
| **5** | **Le classement bouge, un joueur généreux passe devant sans écraser** |
| 10 | Les Hassanāt pèsent le double de l'écart de gestion |
| 20+ | Le meilleur gestionnaire finit **dernier** |

L'écart naturel entre joueurs en fin de partie est de 360 à 530 points
(argent + patrimoine). Les Hassanāt accumulés vont de 0 à 60. À 5, ils
représentent jusqu'à 300 points : le même ordre de grandeur que l'écart de
gestion. Ils départagent, ils n'écrasent pas.

### 3. Le classement reste déterministe et lisible
Score, puis argent, puis ordre de siège. Aucun départage au hasard. Chaque
ligne du classement porte ses trois dimensions (argent, patrimoine,
Hassanāt) pour que la famille voie **d'où vient** le score, et pas seulement
qui gagne.

### 4. Une partie déjà jouée ne change pas de vainqueur
Une sauvegarde antérieure au champ (schéma v8) continue de migrer avec
`hassanatWeight: 0`. Le classement d'une partie terminée ne peut pas se
réécrire après coup parce qu'on a changé une règle.

## Conséquences
- Kounouzi a une condition de victoire. C'est la dernière pièce de
  conception qui manquait.
- Quatre tests verrouillent la décision, sur la partie familiale réelle et
  non sur un état fabriqué : le poids est strictement positif, le vainqueur
  n'est pas le plus riche, remettre le poids à zéro rend le classement à la
  fortune seule, et le classement est déterministe et complet.
- **Point à surveiller** : sur le plateau 28, une carte Hassanāt n'est
  rencontrée qu'au bout d'une vingtaine de tours (diagnostic de la rotation
  des scénarios). En partie rapide de 30 minutes, les Hassanāt peuvent donc
  ne jamais apparaître, et la formule retombe de fait sur la fortune seule.
  Cela se règle côté fréquence des cartes, pas côté score, et demande une
  vraie partie en famille pour être jugé.

## Alternatives écartées
- **Laisser le poids à 0, Hassanāt en simple mention** : le plus simple, mais
  la générosité resterait décorative dans un jeu dont c'est le propos.
- **Deux vainqueurs séparés** (meilleur gestionnaire / meilleur cœur) : évite
  tout équilibrage, mais dilue la partie en deux compétitions parallèles au
  lieu d'obliger à arbitrer entre garder et donner.
