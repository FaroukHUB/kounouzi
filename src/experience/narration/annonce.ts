import type { NarrationService, Utterance } from "./NarrationService";

/**
 * DIRE CE QUI EST À L'ÉCRAN MAINTENANT.
 *
 * Deux choses font parler le jeu : la file d'animation, qui raconte le plateau,
 * et la carte ouverte, qui raconte son étape. Elles ne se connaissaient pas.
 * Résultat constaté en partie : on appuyait sur « Voir la réponse » et la voix
 * lisait encore « Réponse B… » ; la carte passait au résultat pendant que la
 * phrase précédente courait toujours. La voix était systématiquement en retard
 * d'une étape.
 *
 * `annonce` est la règle côté CARTE : une étape de carte REMPLACE ce qui était
 * en train d'être dit. Quand la tablée avance, la voix avance avec elle, quitte
 * à couper une phrase — c'est exactement ce qu'il faut, puisque l'écran ne
 * montre déjà plus ce dont elle parlait.
 *
 * La règle côté PLATEAU est l'inverse et vit dans la file : elle n'enchaîne pas
 * tant que la phrase en cours n'est pas finie (`voiceHold`). Une annonce du
 * plateau ne coupe donc jamais la précédente.
 */
export function annonce(narrator: NarrationService, utterances: readonly Utterance[]): void {
  narrator.stop();
  narrator.speakSequence(utterances);
}
