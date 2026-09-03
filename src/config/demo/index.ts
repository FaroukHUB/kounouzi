import { z } from "zod";
import { heritageSiteSchema, rulesConfigSchema, scenarioSchema } from "@/core/game/config.schema";
import type { HeritageSite, RulesConfig, Scenario } from "@/core/game/types";
import heritageDemo from "./heritage-demo.v1.json";
import rulesDemo from "./rules-demo.v1.json";
import scenariosDemo from "./scenarios-demo.v1.json";

/**
 * ⚠️ Données de DÉMONSTRATION (Phase 3). Montants, monuments et scénarios
 * provisoires, validés par les mêmes schémas que les vraies données. Ils
 * seront remplacés par le contenu réel et l'économie équilibrée.
 */
export const DEMO_RULES_QUICK: RulesConfig = rulesConfigSchema.parse(rulesDemo);
export const DEMO_RULES_CLASSIC: RulesConfig = { ...DEMO_RULES_QUICK, id: "rules-demo-classic.v1", endCondition: { kind: "turns_per_player", turns: 10 } };
export const DEMO_HERITAGE_SITES: readonly HeritageSite[] = z.object({ sites: z.array(heritageSiteSchema) }).parse(heritageDemo).sites;
export const DEMO_SCENARIOS: readonly Scenario[] = z.object({ scenarios: z.array(scenarioSchema) }).parse(scenariosDemo).scenarios;

export const DEMO_DURATIONS = { quick: DEMO_RULES_QUICK, classic: DEMO_RULES_CLASSIC } as const;
export type DemoDuration = keyof typeof DEMO_DURATIONS;

/**
 * ⚠️ Drapeau de DÉMONSTRATION développeur : autorise le contenu factuel
 * « unverified » (catalogue de démo). Doit être `false` pour toute banque
 * réelle : seuls les faits validés, sourcés, datés et versionnés sont alors
 * jouables. Ne concerne jamais le contenu religieux (toujours validé + sourcé).
 */
export const DEMO_CONTENT_ENABLED = true;
