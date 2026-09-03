import type { Command, GameState } from "@/core/game";

/**
 * ⚠️ MÉCANISME TEMPORAIRE — Phase 3 uniquement.
 *
 * Les interactions de case (question, monument, événement, gestion, défi,
 * solidarité, trésor) appartiennent à la Phase 4. Pour pouvoir tester le
 * plateau, la roue, les pions, la sauvegarde et la reprise, ce résolveur
 * fournit une décision SIMULÉE et DÉTERMINISTE quand le moteur attend un
 * humain.
 *
 * Il ne modifie aucune règle : il ne fait qu'émettre une commande ordinaire.
 * Il est isolé du noyau et de l'interface finale, et sera SUPPRIMÉ quand la
 * Phase 4 implémentera les vraies interactions.
 */
export function resolvePhase3DemoInteraction(state: GameState): Command | null {
  const player = state.players[state.activePlayerIndex];
  if (!player) return null;
  switch (state.phase.kind) {
    case "awaiting_answer":
      return {
        type: "SubmitAnswer",
        playerId: player.id,
        requestId: state.phase.requestId,
        answer: { outcome: "correct", explanationMastery: "none", validationMode: "collective" },
      };
    case "awaiting_purchase":
      return { type: "DecidePurchase", playerId: player.id, siteId: state.phase.siteId, buy: false };
    case "awaiting_choice": {
      const first = state.phase.options[0];
      return first ? { type: "Choose", playerId: player.id, choiceId: state.phase.choiceId, optionId: first.id } : null;
    }
    case "awaiting_journey":
    case "finished":
      return null;
  }
}

export const isPhase4Interaction = (state: GameState): boolean =>
  state.phase.kind === "awaiting_answer" || state.phase.kind === "awaiting_purchase" || state.phase.kind === "awaiting_choice";
