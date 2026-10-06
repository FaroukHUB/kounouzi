# 0056 — Le ton de la voix se choisit à l'oreille

Date : 2026-10-06
Statut : acceptée

## Contexte

« La voix n'est pas adaptée. » Vérification faite d'abord, correction ensuite :
dans les réglages, la ligne sous « Narration vocale » affichait bien **« Voix
Kounouzi en ligne »**. La voix ElevenLabs est donc servie — ce n'était pas la
voix de secours du navigateur, contrairement à ce qu'on pouvait craindre. Et
parmi les symptômes possibles (retard, coupure, oubli, ton), un seul était
constaté : **le ton**.

Or le ton vivait dans un fichier de configuration, sous forme de quatre
nombres, appliqués côté serveur. Les changer demandait un commit et un
déploiement, puis une partie pour écouter. Comparer deux réglages coûtait deux
déploiements. C'est la vraie cause : **on ne peut pas régler à l'oreille ce qui
n'est réglable qu'en aveugle.**

## Décision

1. **Des TONS NOMMÉS, en données** : Posé, Chaleureux, Enjoué, Pétillant. Un
   ton porte son expressivité (stabilité, style…) **et son débit** — un guide
   pour enfants ne parle pas à la vitesse d'un journal.
2. **On en change dans les réglages, on l'entend tout de suite** avec le bouton
   « Essayer la voix » déjà présent. Plus aucun déploiement pour comparer.
3. **Le navigateur n'envoie qu'un IDENTIFIANT.** Le serveur retrouve les
   valeurs dans ses propres données : un navigateur ne dicte jamais ce qu'on
   demande au fournisseur, et un identifiant inconnu retombe simplement sur le
   ton par défaut.
4. **Le ton voyage dans l'URL**, donc chaque ton a son propre fichier en cache :
   changer de ton ne rejoue jamais l'audio de l'ancien.
5. **Au ton par défaut, les phrases PRÉ-GÉNÉRÉES restent servies** — elles ont
   justement été produites avec ce ton-là, et elles sont gratuites et
   instantanées. Tout autre ton repasse par le serveur : sinon on entendrait
   l'ancien ton sur les phrases du manifeste et le nouveau sur les autres, dans
   la même partie.
6. **Le débit du ton se compose** avec la vitesse déjà choisie par la tablée :
   les deux réglages restent indépendants.

## Conséquences

- Le choix est une préférence d'appareil, persistée localement. Il ne touche ni
  l'état de la partie, ni le moteur.
- **Le plus gros levier reste hors du code** : `ELEVENLABS_VOICE_ID`. Une voix
  de narrateur adulte restera une voix de narrateur adulte, quels que soient
  ces réglages. Les tons permettent de l'adoucir ou de l'animer, pas de la
  changer.
- Un ton plus expressif est moins stable : la lecture est plus vivante, mais
  moins régulière d'une phrase à l'autre. Les tests vérifient que la série va
  bien du plus stable au plus expressif — un ordre inversé par mégarde rendrait
  les noms mensongers.
- Ce qui n'a PAS été touché : les mots du guide (ADR 0051) et la
  synchronisation voix/plateau (ADR 0048, 0052). Aucun de ces deux symptômes
  n'a été constaté cette fois, et corriger ce qui n'est pas cassé est le plus
  sûr moyen de casser autre chose.
