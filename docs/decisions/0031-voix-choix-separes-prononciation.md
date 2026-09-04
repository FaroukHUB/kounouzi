# 0031 — Voix : choix lus séparément, prononciation des translittérations, arabe seulement avec une voix arabe

**Statut** : acceptée (retour du playtest après validation des banques Religion)

## Contexte
Deux défauts entendus en partie : la voix enchaîne « … ? A. Allah B. Une
statue » sans aucune pause (250 cartes Religion portent leurs choix dans
l'énoncé, sur une seule ligne, et l'affichage a le même défaut) ; et elle
prononce très mal l'arabe : translittérations avec signes (« Ḥajjat
al-Wadāʿ », « Lā ilāha illā Allāh », 160 mots distincts sur 155 cartes) lues
lettre à lettre par la voix française, écriture arabe et symbole ﷺ lus par une
voix qui ne les connaît pas quand l'appareil n'a pas de voix arabe.

## Décision
- **Choix en phrases séparées.** Une fonction pure (`splitChoices`) découpe
  l'énoncé en question + choix quand la suite A, B (C, D) est complète et
  ordonnée ; sinon l'énoncé reste entier. La voix dit « Question : … » puis
  « Réponse A : … », « Réponse B : … » en phrases distinctes mises en file
  (`speakSequence`) : la pause entre deux phrases est naturelle, sans balise.
  « Réécouter » rejoue toute la séquence. Le même découpage affiche les choix
  sur des lignes séparées avec leur lettre, dérivé au rendu : les fichiers de
  banque ne changent pas.
- **Prononciation = données.** `src/config/narration/pronunciation.v1.json`
  (validé par Zod) donne la forme prononçable en français des symboles (ﷺ) et
  des mots ou expressions translittérés. Hors lexique, seuls les mots portant
  un signe de translittération (ā, ī, ū, ḥ, ṣ, ḍ, ṭ, ẓ, ʿ, ʾ) reçoivent des
  règles de repli déterministes (signes simplifiés, u → ou, sh → ch, dh → d,
  tiret → espace, « ah » final → « a »). Les mots français ne sont jamais
  touchés. Le texte affiché reste toujours celui de la banque : le lexique ne
  porte aucun sens religieux, seulement une aide de lecture.
- **L'arabe seulement avec une voix arabe.** Le narrateur sait si l'appareil
  a une voix pour une langue (`hasVoice`). Un passage en écriture arabe dans
  une phrase française est dit avec la voix arabe quand elle existe, sinon il
  est tu. Une phrase arabe entière (« Écouter en arabe ») n'est jamais lue par
  une autre voix : sans voix arabe, le bouton est remplacé par une indication
  et l'explication arabe reste affichée.
- Tout cela vit dans la couche d'expérience et la présentation : aucun
  hasard, aucune influence sur le moteur, le contenu ou le Learning Engine.

## Tests
`tests/unit/experience/speechText.test.ts` (découpage sur toutes les cartes
Religion sans perdre un mot, phrases « Réponse A/B », lexique et repli,
français intact, segmentation, plan avec et sans voix arabe), narrateurs
(`speakSequence`, `hasVoice`), carte question (liste des choix, bouton ou
indication selon la voix arabe).
