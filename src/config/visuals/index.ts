import { z } from "zod";
import { ESTABLISHMENT_FAMILIES } from "@/core/game";
import visualsJson from "./visuals.v1.json";

/**
 * LES EMPLACEMENTS DES VISUELS 3D FOURNIS.
 *
 * Un seul fichier déclare ce que l'auteur a livré. Rien n'est deviné d'après le
 * contenu d'un dossier : un modèle existe pour le jeu parce qu'il est DÉCLARÉ
 * ici, et un test vérifie que chaque chemin déclaré pointe vers un fichier qui
 * existe — une illustration manquante devient une erreur de construction, pas
 * un trou découvert en pleine partie.
 *
 * `null` partout = rien de fourni, et le jeu sert ses visuels provisoires : le
 * pion de jeu de plateau dessiné dans le code, et la carte illustrée de chaque
 * établissement dressée sur sa case. Déposer un fichier et changer une ligne ici
 * suffit à le remplacer, sans toucher au reste.
 *
 * CE QUI EST ATTENDU D'UN FICHIER (vérifié à l'œil, pas par le code) :
 * `.glb` binaire, textures embarquées, axe Y vers le haut, modèle debout,
 * ORIGINE AUX PIEDS, face tournée vers +Z, normales et coordonnées de texture
 * présentes. Le précédent `pion-fille.glb` ne contenait que des positions : ni
 * éclairage, ni texture possibles, et il ne donnait qu'une silhouette informe.
 */

const modelPath = z
  .string()
  .min(1)
  .regex(/^\/kounouzi\/.+\.glb$/, "un modèle doit être un .glb servi depuis /kounouzi/")
  .nullable();

export const visualsConfigSchema = z.object({
  version: z.number().int().positive(),
  pawns: z.object({
    /** Modèle unique, recoloré par joueur. Le plus simple : un seul fichier pour six pions. */
    shared: modelPath,
    /** Faut-il teinter le modèle à la couleur du joueur ? Faux si les modèles sont déjà colorés. */
    tint: z.boolean(),
    /** Un modèle par siège (0 à 5), s'ils diffèrent. Prioritaire sur `shared`. */
    bySeat: z.record(z.string().regex(/^[0-5]$/), modelPath),
  }),
  establishments: z.object({
    tint: z.boolean(),
    /** Un modèle par famille d'établissement. Absente, la carte illustrée reste dressée sur la case. */
    /**
     * `partialRecord` et pas `record` : une clé par famille N'EST PAS exigée.
     * Un `record` sur une énumération réclame les sept familles, donc déclarer
     * un seul établissement obligerait à écrire six `null` — et à les tenir à
     * jour le jour où une famille s'ajoute.
     */
    byFamily: z.partialRecord(z.enum(ESTABLISHMENT_FAMILIES), modelPath),
  }),
});

export type VisualsConfig = z.infer<typeof visualsConfigSchema>;

export const VISUALS: VisualsConfig = visualsConfigSchema.parse(visualsJson);

/** Le modèle d'un pion pour ce siège, ou `null` si rien n'est fourni. */
export function pawnModelFor(seat: number): string | null {
  return VISUALS.pawns.bySeat[String(seat)] ?? VISUALS.pawns.shared;
}

/** Tous les chemins déclarés, pour la vérification d'existence. */
export function declaredModelPaths(): readonly string[] {
  const out = [VISUALS.pawns.shared, ...Object.values(VISUALS.pawns.bySeat), ...Object.values(VISUALS.establishments.byFamily)];
  return out.filter((p): p is string => p !== null && p !== undefined);
}
