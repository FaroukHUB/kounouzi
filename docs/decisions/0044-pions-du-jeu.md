# 0044 — Le pion fait la couleur du joueur

Date : 2026-09-27
Statut : acceptée

## Contexte

Le joueur portait une seule couleur, celle de son personnage. Deux personnages
pouvant porter le même vêtement — deux abayas noires, deux kurtas blanches —,
la couleur ne suffisait plus à distinguer deux joueurs sur le plateau, où il
n'y a justement rien d'autre à lire qu'un pion de quelques dizaines de pixels.

Six pions de jeu illustrés ont été fournis : ambre, bleu, vert, rouge, violet,
blanc.

## Décision

1. **Les six pions sont des données** (`pieces.v1.json`, validé par Zod :
   identifiant, couleur, image), attribuées **par ordre de siège** : le premier
   joueur prend le premier pion. Six pions pour six joueurs au maximum, donc
   deux joueurs n'ont jamais la même couleur, quels que soient les personnages
   choisis.
2. **La couleur du pion est la couleur du joueur**, partout où il faut le
   reconnaître : le pion lui-même, son halo quand c'est son tour, le disque de
   son portrait, le liseré de sa tuile, la marque du propriétaire d'un
   établissement.
3. **Le plateau porte le pion, rien d'autre** : l'illustration du pion remplace
   le disque coloré, sans symbole ni portrait dessiné par-dessus.
4. Le personnage garde une couleur dans ses données : elle ne sert plus que de
   repli, hors partie (aperçus, écrans sans joueurs).

## Conséquences

- L'attribution est automatique et déterministe. Choisir son pion reste
  possible plus tard : ce serait une donnée de plus dans le profil, sans
  changer ce modèle.
- Au-delà de six joueurs, les pions se répéteraient ; la règle du jeu plafonne
  déjà à six.
- La couche 3D expérimentale utilise les mêmes couleurs, par le même siège.
