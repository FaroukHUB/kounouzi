import type { PlayerId } from "@/core/shared";
import type { ChallengeDefinition, ChallengesConfig, ChallengeVariant, GameState, PlayerState } from "./types";

/** Âge conventionnel d'un adulte pour l'éligibilité (aucun adulte n'est jamais exclu par l'âge). */
export const ADULT_AGE = 18;
/** Enfant d'âge inconnu : traité comme le plus jeune (le plus prudent). */
export const UNKNOWN_CHILD_AGE = 5;

export const playerAge = (player: Pick<PlayerState, "profileType" | "age">): number => (player.profileType === "adult" ? ADULT_AGE : (player.age ?? UNKNOWN_CHILD_AGE));

/**
 * Éligibilité d'un défi pour un joueur : âge minimal, interrupteur de sa
 * catégorie, drapeaux « OH NON » / contact, boss, contenu validé disponible.
 * Ni solde, ni classement, ni patrimoine, ni case suivante n'interviennent.
 */
export function isChallengeEligible(definition: ChallengeDefinition, player: Pick<PlayerState, "profileType" | "age">, config: ChallengesConfig): boolean {
  const { settings, toggles } = config;
  if (playerAge(player) < definition.minAge) return false;
  const toggle = (Object.keys(toggles) as (keyof typeof toggles)[]).find((k) => toggles[k].includes(definition.category));
  if (!toggle || !settings[toggle]) return false;
  if (definition.ohNo && !settings.ohNo) return false;
  if (definition.consentRequired && !settings.contact) return false;
  if (definition.boss && !settings.boss) return false;
  if (definition.contentRef && !config.contentAvailable.includes(definition.id)) return false;
  return true;
}

/**
 * Sélection déterministe cachée : parmi les défis éligibles (ordre de la
 * banque), on choisit celui qui a été proposé le moins souvent dans la partie,
 * en partant d'un point de rotation (compteur persistant + décalage de la
 * partie familiale). Aucun défi ne revient tant que le vivier éligible n'est
 * pas épuisé. Même état + mêmes commandes → même défi.
 */
export function selectChallenge(state: GameState, playerId: PlayerId, exclude: readonly string[] = []): ChallengeDefinition | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  const config = state.config.challenges;
  const eligible = config.definitions.filter((d) => !exclude.includes(d.id) && isChallengeEligible(d, player, config));
  if (eligible.length === 0) return null;
  const start = (state.counters.challenge + state.config.scenarioOffset) % eligible.length;
  let best: ChallengeDefinition | null = null;
  let bestServed = Number.POSITIVE_INFINITY;
  const mine = state.challengeServed[playerId] ?? {};
  for (let k = 0; k < eligible.length; k += 1) {
    const candidate = eligible[(start + k) % eligible.length]!;
    const served = mine[candidate.id] ?? 0;
    if (served < bestServed) {
      best = candidate;
      bestServed = served;
      if (served === 0) break;
    }
  }
  return best;
}

/** Variante d'âge applicable (la première dont l'intervalle contient l'âge) ; `null` = texte de base seul. */
export function variantFor(definition: Pick<ChallengeDefinition, "variants">, age: number): ChallengeVariant | null {
  return definition.variants.find((v) => age >= v.ageMin && (v.ageMax === undefined || age < v.ageMax)) ?? null;
}

export const challengeById = (state: GameState, id: string): ChallengeDefinition | undefined => state.config.challenges.definitions.find((d) => d.id === id);
