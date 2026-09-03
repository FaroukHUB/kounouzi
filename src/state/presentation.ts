import type { GameEvent, GameState } from "@/core/game";

/**
 * État PRÉSENTÉ : ce que les panneaux affichent. Il suit l'état réel du
 * moteur avec le retard des animations : une information « du futur »
 * (nouveau joueur actif, nouveau solde) n'apparaît que lorsque l'événement
 * correspondant est rejoué. Pure projection depuis les événements — aucune
 * règle économique n'est recalculée ici (les montants viennent des payloads).
 */
export function projectEvent(presented: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case "TurnStarted": {
      const index = presented.players.findIndex((p) => p.id === event.playerId);
      return index < 0 ? presented : { ...presented, activePlayerIndex: index, turnNumber: event.turnNumber };
    }
    case "MoneyChanged":
      return { ...presented, players: presented.players.map((p) => (p.id === event.playerId ? { ...p, money: event.balanceAfter } : p)) };
    case "SiteAcquired":
      return {
        ...presented,
        holdings: [...presented.holdings, { siteId: event.siteId, ownerId: event.playerId, price: event.price, heritageValue: event.heritageValue, acquiredTurn: presented.turnNumber }],
      };
    default:
      return presented;
  }
}
