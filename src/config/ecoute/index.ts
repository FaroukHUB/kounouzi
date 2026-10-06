import { z } from "zod";
import { ANSWER_OUTCOMES } from "@/core/shared";
import ecouteJson from "./ecoute.v1.json";

/**
 * ÉCOUTE — validation sans les mains (ADR 0054, données jamais codées en dur).
 *
 * Le seul usage du micro dans Kounouzi : entendre « correct », « presque » ou
 * « faux » une fois la réponse révélée, et appuyer sur le bouton à la place du
 * doigt. La machine ne juge JAMAIS la réponse de l'enfant — elle ne la compare
 * à rien, elle ne l'entend même pas, puisque le micro reste fermé pendant qu'il
 * répond. Les autres usages imaginables (dicter la réponse, la noter
 * automatiquement) n'ont pas été décidés par l'auteur : ils n'existent pas ici.
 *
 * Le vocabulaire est une donnée : l'enrichir ne demande aucun code.
 */
export const ecouteSchema = z.object({
  version: z.number().int().positive(),
  /** Langue déclarée au navigateur (BCP 47). L'interface est française en V1. */
  lang: z.string().min(2),
  /** Confiance minimale, appliquée seulement quand le navigateur en donne une. */
  minConfidence: z.number().min(0).max(1),
  /** Propositions demandées au navigateur pour une même phrase entendue. */
  maxAlternatives: z.number().int().min(1).max(10),
  /** Intervalle de vérification « la voix off parle-t-elle ? » (le micro ne doit pas s'entendre lui-même). */
  silenceCheckMs: z.number().int().min(50).max(2000),
  commandes: z
    .array(
      z.object({
        /** Le verdict déclenché : exactement ceux des trois boutons. */
        id: z.enum(ANSWER_OUTCOMES),
        phrases: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
});

export type EcouteConfig = z.infer<typeof ecouteSchema>;
export type EcouteCommande = EcouteConfig["commandes"][number];

export const ECOUTE_CONFIG: EcouteConfig = ecouteSchema.parse(ecouteJson);
