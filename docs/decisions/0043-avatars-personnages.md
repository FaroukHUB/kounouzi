# 0043 — Les joueurs sont des personnages, le plateau ne porte que des pions

Date : 2026-09-27
Statut : acceptée

## Contexte

Un joueur était identifié par une pastille de couleur portant un symbole
géométrique (soleil, feuille, gemme…), le même symbole étant redessiné sur le
pion, sur les tuiles et sur les cartes. À la taille réelle d'une case (environ
50 px sur une tablette), ce symbole n'était plus lisible, et il ne disait rien
du joueur.

Huit personnages illustrés ont été fournis : garçon et fille pour chacune des
quatre tranches 7–9, 10–12, 13–16, 17 et plus.

## Décision

1. **Les personnages sont des données**, dans `avatars.v1.json` validé par Zod :
   identifiant, couleur, symbole de repli, sexe, tranche d'âge, portrait
   (tête + buste) et figure entière. Les images vivent dans
   `public/kounouzi/avatars/`.
2. **Le portrait sert partout où l'on reconnaît un joueur** : barre d'action
   (« Au tour de X »), tuiles des joueurs, face-à-face du Duel, choix
   d'adversaire ou de destinataire. Un seul composant, `AvatarBadge`.
3. **La figure entière sert au choix**, à la création de la partie.
4. **Le plateau ne porte que des pions** : corps coloré, socle, halo du joueur
   actif, aucun dessin par-dessus. La couleur reste donc la marque du joueur
   sur le plateau — deux personnages peuvent porter le même vêtement, jamais la
   même couleur.
5. **Le sexe et la tranche d'âge de l'avatar sont décoratifs.** La difficulté
   des questions reste pilotée par l'âge réel saisi à la création (bandes d'âge
   pédagogiques, ADR 0029) : choisir un personnage adulte ne change rien au
   contenu servi à un enfant de sept ans.

## Conséquences

- Les identifiants d'avatar deviennent parlants (`garcon-7-9`, `fille-17-plus`…)
  et remplacent les anciens noms de couleur. Une partie enregistrée avec un
  identifiant inconnu reste lisible : elle retombe sur le premier personnage.
- Le symbole géométrique n'est plus utilisé que sur les cases, pour marquer le
  propriétaire d'un établissement, où une pastille de quelques pixels ne
  pourrait pas montrer un portrait.
- Les illustrations des pions eux-mêmes restent à fournir ; tant qu'elles
  manquent, le pion coloré tient sa place.
