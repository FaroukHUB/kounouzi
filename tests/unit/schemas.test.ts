import { describe, expect, it } from "vitest";
import {
  adultInitialLevelSchema,
  audienceScopeSchema,
  localeSchema,
  profileTypeSchema,
  validationModeSchema,
} from "@/config/schemas";
import { DEFAULT_ADULT_INITIAL_LEVEL, DEFAULT_VALIDATION_MODE } from "@/core/shared";

describe("schémas partagés", () => {
  it("acceptent les valeurs validées et refusent le reste", () => {
    expect(localeSchema.safeParse("fr").success).toBe(true);
    expect(localeSchema.safeParse("en").success).toBe(false);

    expect(profileTypeSchema.safeParse("adult").success).toBe(true);
    expect(profileTypeSchema.safeParse("teacher").success).toBe(false);

    expect(adultInitialLevelSchema.safeParse("discovery").success).toBe(true);
    expect(adultInitialLevelSchema.safeParse("expert").success).toBe(false);

    expect(audienceScopeSchema.safeParse("all").success).toBe(true);
    expect(audienceScopeSchema.safeParse("teen").success).toBe(false);

    expect(validationModeSchema.safeParse("self").success).toBe(true);
    expect(validationModeSchema.safeParse("designated").success).toBe(false);
  });

  it("les valeurs par défaut validées sont des valeurs admises", () => {
    expect(DEFAULT_ADULT_INITIAL_LEVEL).toBe("standard");
    expect(adultInitialLevelSchema.safeParse(DEFAULT_ADULT_INITIAL_LEVEL).success).toBe(true);
    expect(DEFAULT_VALIDATION_MODE).toBe("collective");
    expect(validationModeSchema.safeParse(DEFAULT_VALIDATION_MODE).success).toBe(true);
  });
});
