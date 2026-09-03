"use client";

import { useParams } from "next/navigation";
import type { GameId } from "@/core/shared";
import { GameScreen } from "@/ui/game/GameScreen";

export default function GamePage() {
  const params = useParams<{ gameId: string }>();
  return <GameScreen gameId={params.gameId as GameId} />;
}
