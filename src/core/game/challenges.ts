import type { PlayerId } from "@/core/shared";
import type { ChallengeContentRef, ChallengeDefinition, ChallengesConfig, ChallengeVariant, GameState, PlayerState, RecitationRef } from "./types";

/** Âge conventionnel d'un adulte pour l'éligibilité (aucun adulte n'est jamais exclu par l'âge). */
export const ADULT_AGE = 18;
/** Enfant d'âge inconnu : traité comme le plus jeune (le plus prudent). */
export const UNKNOWN_CHILD_AGE = 5;

export const playerAge = (player: Pick<PlayerState, "profileType" | "age">): number => (player.profileType === "adult" ? ADULT_AGE : (player.age ?? UNKNOWN_CHILD_AGE));

/** Niveau de jeu de récitation selon l'âge (mêmes tranches que les banques religieuses) : difficulté de jeu, jamais un rang religieux. */
export const recitationLevelFor = (age: number): number => (age < 8 ? 1 : age < 10 ? 2 : age < 12 ? 3 : age < 14 ? 4 : 5);

type RecitationPlayer = Pick<PlayerState, "profileType" | "age" | "masteredSurahs">;

/**
 * Sourates candidates pour une référence de récitation : une sourate imposée ;
 * sinon les sourates validées du niveau du joueur (1 sourate) ou celles qu'il
 * maîtrise déjà (2 sourates). Ordre stable : niveau puis numéro.
 */
export function recitationCandidates(ref: Extract<ChallengeContentRef, { kind: "validated_recitation" }>, player: RecitationPlayer, recitations: readonly RecitationRef[]): readonly RecitationRef[] {
  const sorted = [...recitations].sort((a, b) => a.level - b.level || a.surahNumber - b.surahNumber);
  if (ref.surahId !== undefined) return sorted.filter((s) => s.id === ref.surahId);
  if (ref.count >= 2) return sorted.filter((s) => player.masteredSurahs.includes(s.id));
  const level = recitationLevelFor(playerAge(player));
  return sorted.filter((s) => s.level <= level);
}

/**
 * Éligibilité d'un défi pour un joueur : âge minimal, interrupteur de sa
 * catégorie, drapeaux « OH NON » / contact, boss, contenu validé disponible.
 * Ni solde, ni classement, ni patrimoine, ni case suivante n'interviennent.
 */
export function isChallengeEligible(definition: ChallengeDefinition, player: RecitationPlayer, config: ChallengesConfig): boolean {
  const { settings, toggles } = config;
  if (playerAge(player) < definition.minAge) return false;
  const toggle = (Object.keys(toggles) as (keyof typeof toggles)[]).find((k) => toggles[k].includes(definition.category));
  if (!toggle || !settings[toggle]) return false;
  if (definition.ohNo && !settings.ohNo) return false;
  if (definition.consentRequired && !settings.contact) return false;
  if (definition.boss && !settings.boss) return false;
  const ref = definition.contentRef;
  if (ref?.kind === "validated_recitation") return recitationCandidates(ref, player, config.recitations).length >= ref.count;
  if (ref && !config.contentAvailable.includes(definition.id)) return false;
  return true;
}

/**
 * Choix déterministe des sourates à réciter : parmi les candidates, celles que
 * CE joueur a le moins souvent récitées dans la partie, à partir d'un point de
 * rotation (compteur de défis + décalage de partie). Jamais de hasard.
 */
export function selectRecitations(state: GameState, playerId: PlayerId, ref: Extract<ChallengeContentRef, { kind: "validated_recitation" }>): readonly string[] | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  const candidates = recitationCandidates(ref, player, state.config.challenges.recitations);
  if (candidates.length < ref.count) return null;
  const served = state.recitationServed[playerId] ?? {};
  const start = (state.counters.challenge + state.config.scenarioOffset) % candidates.length;
  const rotated = candidates.map((_, k) => candidates[(start + k) % candidates.length]!);
  // Tri stable par nombre de récitations déjà proposées ; l'ordre de rotation départage.
  const ordered = rotated.map((s, index) => ({ s, index })).sort((a, b) => (served[a.s.id] ?? 0) - (served[b.s.id] ?? 0) || a.index - b.index);
  return ordered.slice(0, ref.count).map((o) => o.s.id);
}

export const recitationById = (state: GameState, id: string): RecitationRef | undefined => state.config.challenges.recitations.find((r) => r.id === id);

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
