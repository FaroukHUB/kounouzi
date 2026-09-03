# 0016 — Narration vocale : couche d'expérience, jamais de contrôle du moteur

**Statut** : acceptée (Phase 3)

## Contexte
Une première voix enrichit l'expérience familiale. Elle ne doit ni contrôler
ni bloquer le moteur, ni exister comme seule source d'information.

## Décision
- Architecture : moteur → événements → couche expérience (file d'animation
  + `NarrationService`). Le moteur n'attend jamais la fin d'une phrase.
- Abstraction `NarrationService` (`speak`, `stop`, `replayLast`,
  `isSupported`, `getAvailableVoices`, `setEnabled`, `setRate`) ; V1
  `WebSpeechNarrator` sur `window.speechSynthesis` (client seulement,
  protégé du rendu serveur), `NullNarrator` sinon. Aucune API externe, aucune
  dépendance npm.
- File interne : une phrase à la fois ; phrase importante mémorisée pour
  « Réécouter ». Voix `fr-FR` prioritaire, puis `fr…`, sinon voix par défaut ;
  `voiceschanged` écouté. Garde-fou de 15 s si le navigateur n'émet jamais
  `end`.
- Coordination : la phrase est dite au moment où l'événement est rejoué par
  la file d'animation (même ordre que le visuel).
- Périmètre Phase 3 : tour, Chemin, arrivée (type de case), passage par le
  départ, dernier tour, fin. Aucune question, réponse, explication, monument
  réel ni contenu religieux avant la Phase 4. `lang: "ar"` accepté par
  l'architecture ; contenu arabe réel avec les explications validées.
- Réglages locaux : activée/désactivée, vitesse lente/normale/rapide,
  réécouter. Toute information vocale existe aussi visuellement (bandeaux,
  panneau du Chemin).

## Conséquences
- Remplaçable par un TTS premium sans toucher au moteur ni aux écrans.
- Si la voix est indisponible, un message discret l'indique dans les
  réglages ; le jeu continue.
