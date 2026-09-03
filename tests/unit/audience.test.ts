import { describe, expect, it } from "vitest";
import { AUDIENCE_SCOPES, isAudienceAllowed, PROFILE_TYPES } from "@/core/shared";

describe("frontière d'audience (règle absolue)", () => {
  it("un enfant reçoit `all` et `child`, jamais `adult`", () => {
    expect(isAudienceAllowed("all", "child")).toBe(true);
    expect(isAudienceAllowed("child", "child")).toBe(true);
    expect(isAudienceAllowed("adult", "child")).toBe(false);
  });

  it("un adulte reçoit `all` et `adult`, jamais `child`", () => {
    expect(isAudienceAllowed("all", "adult")).toBe(true);
    expect(isAudienceAllowed("adult", "adult")).toBe(true);
    expect(isAudienceAllowed("child", "adult")).toBe(false);
  });

  it("la frontière est symétrique et exhaustive sur toutes les combinaisons", () => {
    for (const profileType of PROFILE_TYPES) {
      for (const scope of AUDIENCE_SCOPES) {
        const crossesBoundary = scope !== "all" && scope !== profileType;
        expect(isAudienceAllowed(scope, profileType)).toBe(!crossesBoundary);
      }
    }
  });
});
