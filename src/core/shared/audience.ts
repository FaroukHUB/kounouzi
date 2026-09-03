import type { AudienceScope, ProfileType } from "./player";

/**
 * Règle absolue de Kounouzi : la frontière d'audience n'est jamais franchie.
 *
 *   enfant → `all` | `child`   (jamais `adult`)
 *   adulte → `all` | `adult`   (jamais `child`)
 *
 * Toute stratégie de relâchement d'un vivier de questions doit passer par ce
 * prédicat et ne peut pas le contourner.
 */
export function isAudienceAllowed(scope: AudienceScope, profileType: ProfileType): boolean {
  return scope === "all" || scope === profileType;
}
