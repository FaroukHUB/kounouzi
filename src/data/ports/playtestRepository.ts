import type { GameId } from "@/core/shared";
import type { PlaytestLog } from "@/experience/playtest/types";

/** Journal de playtest LOCAL (outil de développement). Jamais envoyé ailleurs. */
export interface PlaytestRepository {
  load(gameId: GameId): Promise<PlaytestLog | undefined>;
  save(log: PlaytestLog): Promise<void>;
  remove(gameId: GameId): Promise<void>;
}
