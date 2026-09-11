# 0036 — Voix Kounouzi en ligne : une seule voix qui dit tout, jamais bloquante

**Statut** : acceptée (décision produit, 2026-09-11) — remplace le « voix OFF par défaut » de l'ADR 0035

## Contexte
Le propriétaire veut une voix de qualité qui dise TOUT : changement de joueur,
Chemin, arrivée, paiements, cartes, avec les prénoms et les montants, en
français et en arabe. La synthèse du navigateur (ADR 0026, 0031) dépend de
l'appareil et reste plate ; des fichiers pré-enregistrés ne peuvent pas
contenir un prénom. Seule une synthèse neuronale au moment de la partie
répond au besoin.

## Décision
- **Une route serveur** `GET /api/voix?lang=fr|ar&text=…` (`app/api/voix`,
  logique testable dans `src/experience/narration/voiceRoute.ts`) appelle
  ElevenLabs avec la clé du serveur (`ELEVENLABS_API_KEY`,
  `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` ; variables d'environnement
  Vercel, jamais dans le dépôt, jamais dans le navigateur). Le texte est
  validé (langue servie, longueur, aucun caractère de contrôle). La réponse
  audio porte un cache immuable d'un an : chaque phrase n'est générée qu'une
  fois pour tout le monde (CDN + cache du navigateur). `?probe=1` répond 204
  si la voix est configurée, 503 sinon, sans rien générer.
- **`CloudNarrator`** implémente le `NarrationService` existant : le moteur,
  le rejoueur d'animation et les écrans ne changent pas. Il joue les phrases
  dans l'ordre, une à la fois, à la vitesse réglée ; une phrase listée dans le
  manifeste `public/kounouzi/audio/voix/manifest.json` est lue depuis le
  fichier statique pré-généré, sinon demandée au serveur. Jamais bloquant :
  délai de sécurité par phrase, `stop()` coupe tout. Sans clé (503) la voix
  en ligne n'est plus tentée ; sans réseau, nouvel essai après un délai. Dans
  les deux cas, la **voix de l'appareil** (`WebSpeechNarrator`) prend le
  relais, et le texte reste toujours affiché.
- **Téléphones** : le son n'est autorisé qu'après un geste ; l'écran de jeu
  débloque l'audio au premier toucher (un instant de silence).
- **Réglage** : la narration est **ON par défaut** (session v3 ; migration
  des préférences v1 et v2 vers ON, autres réglages conservés). Les réglages
  indiquent la source de la voix (en ligne / appareil / aucune). L'écran de
  jeu redit les événements via `utteranceFor` (retour sur l'ADR 0035, dont le
  principe « jamais bloquant » demeure).
- **Pré-génération** : `pnpm voice:generate` lit les phrases fixes (clés du
  dictionnaire FR sans gabarit, listées dans `voice.v1.json`), génère une fois
  les fichiers `public/kounouzi/audio/voix/<clé>.mp3` et le manifeste ;
  `--dry-run` liste sans appel réseau, `--force` régénère (nouvelle voix).
  Clé de phrase : empreinte stable de « langue + texte normalisé »
  (`voiceKey`), identique dans le navigateur et le script.
- **Arabe** : servi comme le français par la voix en ligne (bouton
  « Écouter en arabe » des explications). Les explications sont déjà validées
  humainement (ADR 0030) ; la lecture doit être écoutée et validée avant de
  s'y fier, comme le texte.

## Conséquences
- Il faut internet et une clé payante pour la voix en ligne ; les prénoms des
  joueurs et les textes transitent par ElevenLabs. Hors ligne : voix de
  l'appareil ou silence, partie inchangée.
- Coût : quelques centimes par partie, réduits par le cache partagé et les
  phrases pré-générées.

## Tests
`tests/unit/experience/cloudNarrator.test.ts` (clé de phrase, lecture en
ordre et vitesse, fichier statique, 503 → secours définitif, panne → secours
puis nouvel essai, stop / désactivation / réécoute, phrase trop longue ou
langue non servie, sans audio, sonde), `voiceRoute.test.ts` (sonde,
validation, appel amont avec clé et modèle, cache immuable, arabe, 502),
`voiceOff.test.ts` (session v3 et migrations, écran via le service, rejoueur
sans attente).
