"use client";

import { useParams } from "next/navigation";
import type { GameId } from "@/core/shared";
import { DiagnosticScreen } from "@/ui/dev/DiagnosticScreen";

/** Route développeur (locale) : diagnostic de playtest d'une partie. */
export default function DiagnosticPage() {
  const params = useParams<{ gameId: string }>();
  return <DiagnosticScreen gameId={params.gameId as GameId} />;
}
