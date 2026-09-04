import { CHALLENGE_TOGGLE_CATEGORIES, FAMILY_CHALLENGES, SURAH_RECITATIONS } from "@/config/challenges";
import { ALL_CHALLENGES_ON, type ChallengeDefinition, type ChallengeSettings, type ChallengesConfig, type RecitationRef } from "@/core/game";

/** Banque réelle figée dans une partie de test, réglages parents au choix, contenu validé disponible au choix. */
export function challengesFixture(overrides: { readonly settings?: Partial<ChallengeSettings>; readonly contentAvailable?: readonly string[]; readonly definitions?: readonly ChallengeDefinition[]; readonly recitations?: readonly RecitationRef[] } = {}): ChallengesConfig {
  return {
    definitions: overrides.definitions ?? FAMILY_CHALLENGES,
    toggles: CHALLENGE_TOGGLE_CATEGORIES,
    settings: { ...ALL_CHALLENGES_ON, ...overrides.settings },
    contentAvailable: overrides.contentAvailable ?? [],
    // Par défaut AUCUNE sourate : les tests des autres défis ne dépendent pas de la récitation.
    recitations: overrides.recitations ?? [],
  };
}

/** Banque de sourates réelle (références seulement) pour les tests de récitation. */
export const RECITATIONS = SURAH_RECITATIONS;

/** Mini-banque de 3 défis (sans contenu, sans contact) pour observer la rotation. */
export const THREE_CHALLENGES: readonly ChallengeDefinition[] = ["A", "B", "C"].map((k, i) => ({
  id: `T-${k}`,
  title: `Défi ${k}`,
  category: "movement",
  minAge: 5,
  reward: 10 * (i + 1),
  text: `Défi de test ${k}.`,
  variants: [],
  ohNo: false,
  boss: false,
  consentRequired: false,
  animationKey: "bounce_5",
}));
