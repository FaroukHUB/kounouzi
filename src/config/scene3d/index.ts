import { z } from "zod";
import { QUALITY_TIERS, type QualityTier } from "./tiers";
import sceneJson from "./scene3d.v1.json";

/**
 * RÉGLAGES DU PLATEAU 3D — des données, pas du code (ADR 0059).
 *
 * Inclinaison, cadrage, hauteur des tuiles, éclairage, seuils de qualité et de
 * repli : tout ce qui se règle à l'œil est ici, et se règle sans toucher au
 * code. C'est la règle du projet pour les valeurs d'équilibrage, et elle vaut
 * d'autant plus ici que ces nombres se jugent sur un écran, pas sur un
 * raisonnement — ils vont bouger plusieurs fois.
 */

const tierRecord = <T extends z.ZodTypeAny>(value: T) => z.object(Object.fromEntries(QUALITY_TIERS.map((tier) => [tier, value])) as Record<QualityTier, T>);

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "couleur hexadécimale à six chiffres attendue");

export const scene3dConfigSchema = z.object({
  version: z.number().int().positive(),
  board: z.object({
    /** Angle entre le plateau et le regard : 90° = vue du dessus, 0° = au ras de la table. */
    tiltDegrees: z.number().min(15).max(90),
    /** Espace entre deux cases, en fraction d'une case. */
    cellGap: z.number().min(0).max(0.4),
    /** Épaisseur d'une tuile, en fraction d'une case. */
    tileHeight: z.number().min(0).max(1),
    /** Enfoncement du plan central sous le niveau des tuiles. */
    centerDrop: z.number().min(0).max(1),
    /** Hauteur du rebord qui ceinture le plateau. */
    rimHeight: z.number().min(0).max(1),
    /** Hauteur d'un pion, en unités de case. */
    pawnHeight: z.number().min(0.1).max(4),
    /** Hauteur du petit saut d'une case à l'autre, en unités de case. */
    pawnHop: z.number().min(0).max(2),
    /** Grossissement du pion du joueur actif. */
    pawnActiveScale: z.number().min(1).max(2),
  }),
  camera: z.object({
    /**
     * Champ de vision. Plus il est ÉTROIT, plus la focale est longue et moins
     * la perspective écrase le fond du plateau : à 38° la rangée du haut était
     * nettement plus courte que celle du bas, et toute cette largeur perdue
     * rapetissait le plateau pour rien. Une focale longue ne supprime pas la
     * perspective — le plateau reste incliné et vu en volume — elle la rend
     * seulement moins brutale.
     */
    fovDegrees: z.number().min(10).max(120),
    /** Marge autour du plateau : 1 = au ras des bords. */
    margin: z.number().min(1).max(2),
    minDistance: z.number().positive(),
    maxDistance: z.number().positive(),
    /**
     * Côté, en cases, de la zone cadrée quand la caméra suit le joueur actif.
     * Proche du plateau entier, elle bouge à peine ; trop serrée, on ne voit
     * plus d'où vient le pion.
     */
    followSpan: z.number().min(2).max(40),
    /**
     * Constante de temps du glissement de la caméra : au bout de cette durée,
     * les deux tiers du chemin sont faits. C'est une DURÉE, pas une fraction
     * par image — sinon la caméra irait deux fois plus vite sur un écran à
     * 120 Hz que sur un téléphone à 60.
     */
    smoothMs: z.number().min(0).max(5000),
  }),
  lighting: z.object({
    hemisphere: z.number().min(0).max(10),
    sun: z.number().min(0).max(10),
    sunTiltDegrees: z.number().min(0).max(90),
    sunTurnDegrees: z.number().min(-180).max(180),
    skyColor: hexColor,
    groundColor: hexColor,
  }),
  pawns: z.object({
    /** Vitesse de pivotement du pion vers sa direction de marche, par image. */
    turnFactor: z.number().min(0.01).max(1),
    /** Vitesse de rattrapage de la taille (joueur actif), par image. */
    settleFactor: z.number().min(0.01).max(1),
  }),
  establishments: z.object({
    /** Décalage du bâtiment vers l'intérieur du plateau, en unités de case. */
    inset: z.number().min(0).max(0.5),
    /** Décalage des pions vers l'extérieur sur une case construite, pour ne pas se poser dans le bâtiment. */
    pawnShift: z.number().min(0).max(0.5),
    /** Durée de la sortie de terre. */
    riseMs: z.number().min(0).max(5000),
    /** Petit dépassement au milieu de la montée : c'est lui qui fait lire « il surgit ». */
    overshoot: z.number().min(0).max(1),
    /**
     * Attente MAXIMALE avant de sortir de terre quand une carte occupe encore
     * l'écran. Un établissement acheté sort du sol pendant que la carte
     * « ajouté à ton patrimoine » est affichée : personne ne le voit. Il attend
     * donc qu'elle se referme — mais pas indéfiniment, sinon un achat conclu au
     * tout dernier tour resterait invisible pour toujours.
     */
    riseWaitMaxMs: z.number().min(0).max(30000),
  }),
  /**
   * NOM VOLONTAIRE : `pathReveal`, et surtout pas `journey`. Un garde-fou
   * d'architecture interdit le motif `config.journey` dans toute l'interface —
   * c'est ainsi que le projet garantit qu'aucun écran ne peut lire le cycle du
   * Chemin et donc connaître les déplacements à venir (ADR 0018). Mon réglage
   * n'a rien à voir avec ce cycle, mais un garde-fou qui protège un secret ne
   * s'assouplit pas pour une commodité de nommage : c'est le réglage qui change
   * de nom.
   */
  pathReveal: z.object({
    /**
     * Durée de la révélation du Chemin. Elle suit celle de l'interface
     * (`journeyRevealMs`) : les cases s'allument pendant que le panneau annonce
     * le nombre d'étapes, et tout se termine avant que le pion ne parte.
     */
    revealMs: z.number().min(0).max(10000),
    /** Part de cette durée occupée par l'allumage ; le reste laisse le chemin complet à l'écran, le temps de compter. */
    spreadShare: z.number().min(0).max(1),
    /** Durée d'allumage d'une case. */
    markerRiseMs: z.number().min(0).max(3000),
    /** Petit dépassement : c'est lui qui fait lire « une case s'allume ». */
    markerOvershoot: z.number().min(0).max(1),
    /** Hauteur du marqueur au-dessus de la tuile, pour qu'il ne se batte pas avec elle. */
    markerLift: z.number().min(0).max(0.5),
    /** Durée d'extinction d'une case, quand le pion la franchit. */
    markerFadeMs: z.number().min(0).max(3000),
  }),
  quality: z.object({
    minMemoryGb: z.number().positive(),
    minCores: z.number().int().positive(),
    pixelRatioCap: tierRecord(z.number().min(0.5).max(3)),
    antialias: tierRecord(z.boolean()),
    /** En dessous de ce nombre d'images par seconde, la seconde compte comme lente. */
    fallbackFps: z.number().min(1).max(60),
    /** Secondes lentes consécutives avant de replier en 2D. */
    fallbackSeconds: z.number().int().min(1).max(60),
  }),
});

export type Scene3dConfig = z.infer<typeof scene3dConfigSchema>;

const parsed: Scene3dConfig = scene3dConfigSchema.parse(sceneJson);

if (parsed.camera.minDistance >= parsed.camera.maxDistance) throw new RangeError("scene3d : minDistance doit rester sous maxDistance");

export const SCENE_3D: Scene3dConfig = parsed;

/**
 * Comment l'illustration du plateau est posée (choix temporaire de l'étape 1,
 * à trancher sur un vrai écran) :
 *
 * - `center` : les cases sont des tuiles en relief colorées par famille, et
 *   l'illustration garnit le grand plan central, à plat. Le logo reste droit.
 * - `full` : l'illustration devient la surface de TOUT le plateau, cases
 *   comprises — chaque tuile montre le morceau d'image qui lui correspond,
 *   comme aujourd'hui en 2D. Le logo central part en perspective.
 */
export const BOARD_TEXTURE_MODES = ["center", "full"] as const;
export type BoardTextureMode = (typeof BOARD_TEXTURE_MODES)[number];
export const DEFAULT_BOARD_TEXTURE_MODE: BoardTextureMode = "center";
