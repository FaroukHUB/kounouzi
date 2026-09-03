import type { PlayerId } from "@/core/shared";
import type { AnswerRecord } from "./types";

/** Tout ce qu'un humain peut demander au moteur. Le reste est automatique. */
export type Command =
  | { readonly type: "SpinWheel"; readonly playerId: PlayerId }
  | { readonly type: "SubmitAnswer"; readonly playerId: PlayerId; readonly requestId: string; readonly answer: AnswerRecord }
  | { readonly type: "DecidePurchase"; readonly playerId: PlayerId; readonly siteId: string; readonly buy: boolean }
  | { readonly type: "Choose"; readonly playerId: PlayerId; readonly choiceId: string; readonly optionId: string };
