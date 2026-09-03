/**
 * Identifiants nominaux (« branded »). Un `PlayerId` ne peut pas être passé là
 * où un `FamilyId` est attendu, même si les deux sont des chaînes à l'exécution.
 */
declare const brand: unique symbol;

export type Brand<T, Name extends string> = T & { readonly [brand]: Name };

export type FamilyId = Brand<string, "FamilyId">;
export type PlayerId = Brand<string, "PlayerId">;
export type GameId = Brand<string, "GameId">;
