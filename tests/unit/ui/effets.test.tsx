import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EFFECTS, effectsConfigSchema } from "@/config/effects";
import { ANSWER_OUTCOMES } from "@/core/shared";
import type { GameEvent } from "@/core/game";
import { hapticFor, HAPTIC_PATTERNS, shouldVibrate } from "@/experience/haptics";
import { useSessionStore } from "@/state/sessionStore";
import { AnswerVerdict, VERDICT_STYLES } from "@/ui/cards/AnswerVerdict";
import { coinCount, coinFlightDuration, coinPlan, type Rect } from "@/ui/common/coinFlight";
import { pid } from "../../fixtures/game/setup.fixture";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const source = (path: string) => readFileSync(root + path, "utf8");

describe("les pièces qui volent d'un joueur à l'autre", () => {
  const payeur: Rect = { x: 20, y: 600, width: 180, height: 60 };
  const receveur: Rect = { x: 300, y: 80, width: 120, height: 40 };

  it("le nombre de pièces suit le montant mais reste BORNÉ", () => {
    // Un paiement de deux mille Kounouz ne fait pas voler deux mille pièces :
    // la quantité suggère un ordre de grandeur, elle ne compte pas la monnaie.
    const petit = coinCount(20, EFFECTS.coins);
    const moyen = coinCount(200, EFFECTS.coins);
    const enorme = coinCount(50_000, EFFECTS.coins);
    expect(petit).toBeGreaterThanOrEqual(EFFECTS.coins.minCoins);
    expect(moyen).toBeGreaterThan(petit);
    expect(enorme).toBe(EFFECTS.coins.maxCoins);
    expect(coinCount(0, EFFECTS.coins)).toBe(0);
    expect(coinCount(-5, EFFECTS.coins)).toBe(0);
  });

  it("les pièces partent du compte du payeur et arrivent sur celui du receveur", () => {
    const plan = coinPlan(payeur, receveur, 300, EFFECTS.coins);
    expect(plan.length).toBe(coinCount(300, EFFECTS.coins));
    const centreP = { x: payeur.x + payeur.width / 2, y: payeur.y + payeur.height / 2 };
    const centreR = { x: receveur.x + receveur.width / 2, y: receveur.y + receveur.height / 2 };
    for (const step of plan) {
      // Chaque pièce part près du payeur et arrive près du receveur ; la gerbe
      // s'ouvre au départ et se resserre à l'arrivée.
      expect(Math.hypot(step.fromX - centreP.x, step.fromY - centreP.y)).toBeLessThan(Math.max(payeur.width, payeur.height));
      expect(Math.hypot(step.toX - centreR.x, step.toY - centreR.y)).toBeLessThan(Math.max(receveur.width, receveur.height));
    }
  });

  it("l'arc reste DANS l'écran, même quand les deux repères sont collés en haut", () => {
    // Le cas réel du téléphone : les deux repères d'un joueur sont deux
    // pastilles voisines dans le coin supérieur. Un arc de hauteur fixe envoyait
    // les pièces au-dessus du bord de la fenêtre — le compte était bon, l'effet
    // était invisible. Constaté à l'écran, pas en relisant le code.
    const pastilleA: Rect = { x: 700, y: 50, width: 28, height: 28 };
    const pastilleB: Rect = { x: 736, y: 50, width: 28, height: 28 };
    for (const step of coinPlan(pastilleA, pastilleB, 30, EFFECTS.coins)) {
      expect(step.apexY).toBeGreaterThanOrEqual(EFFECTS.coins.minApexY);
      // Et le BORD de la pièce reste dans la fenêtre, pas seulement son centre.
      expect(step.apexY - EFFECTS.coins.size / 2).toBeGreaterThan(0);
    }
  });

  it("un long vol entre deux panneaux hauts s'aplatit plutôt que de sortir par le haut", () => {
    // Cas réel de la tablette : les comptes sont en haut à gauche et en haut à
    // droite. L'arc réclamait cent quarante pixels de hauteur là où il n'y en
    // avait que cent vingt : les pièces se plaquaient contre le bord.
    const gauche: Rect = { x: 36, y: 36, width: 176, height: 176 };
    const droite: Rect = { x: 968, y: 36, width: 176, height: 176 };
    for (const step of coinPlan(gauche, droite, 30, EFFECTS.coins)) {
      expect(step.apexY - EFFECTS.coins.size / 2).toBeGreaterThan(0);
      expect(step.apexY).toBeGreaterThanOrEqual(EFFECTS.coins.minApexY);
    }
  });

  it("l'arc suit la distance : un long trajet monte plus haut qu'un court", () => {
    const proche = coinPlan({ x: 700, y: 400, width: 28, height: 28 }, { x: 740, y: 400, width: 28, height: 28 }, 100, EFFECTS.coins)[0]!;
    const loin = coinPlan({ x: 20, y: 700, width: 180, height: 60 }, { x: 600, y: 120, width: 120, height: 40 }, 100, EFFECTS.coins)[0]!;
    const monteeProche = Math.min(proche.fromY, proche.toY) - proche.apexY;
    const monteeLoin = Math.min(loin.fromY, loin.toY) - loin.apexY;
    expect(monteeLoin).toBeGreaterThan(monteeProche);
    // …mais jamais au-delà du plafond : un lancer, pas une fusée.
    expect(monteeLoin).toBeLessThanOrEqual(EFFECTS.coins.maxArc + 1e-9);
  });

  it("elles partent en gerbe, pas toutes dans la même seconde", () => {
    const plan = coinPlan(payeur, receveur, 400, EFFECTS.coins);
    const retards = plan.map((s) => s.delayMs);
    expect(new Set(retards).size).toBe(plan.length);
    expect(Math.max(...retards)).toBeGreaterThan(0);
  });

  it("deux paiements identiques donnent EXACTEMENT la même gerbe : aucun hasard nulle part", () => {
    expect(coinPlan(payeur, receveur, 250, EFFECTS.coins)).toEqual(coinPlan(payeur, receveur, 250, EFFECTS.coins));
  });

  it("la durée totale couvre la dernière pièce partie", () => {
    const plan = coinPlan(payeur, receveur, 400, EFFECTS.coins);
    const total = coinFlightDuration(plan, EFFECTS.coins.travelMs);
    expect(total).toBeGreaterThanOrEqual(EFFECTS.coins.travelMs);
    expect(total).toBe(Math.max(...plan.map((s) => s.delayMs)) + EFFECTS.coins.travelMs);
  });

  it("l'effet ne porte JAMAIS l'information : le bandeau dit déjà tout", () => {
    // Un joueur hors écran (tiroir fermé, liste défilée) ne doit pas faire
    // partir des pièces de nulle part — et surtout, son absence ne doit rien
    // faire perdre au joueur, puisque le bandeau reste la source.
    const code = source("src/ui/common/CoinFlight.tsx");
    expect(code).toContain("if (!from || !to) return null;");
    // Rien de tout cela ne touche au moteur ni à la file d'animation.
    expect(code).not.toContain("dispatch");
    expect(code).not.toContain("@/core/game");
  });

  it("la configuration des effets est valide et cohérente", () => {
    expect(() => effectsConfigSchema.parse(EFFECTS)).not.toThrow();
    expect(EFFECTS.coins.minCoins).toBeLessThanOrEqual(EFFECTS.coins.maxCoins);
  });
});

describe("la vibration : courte, rare, et jamais la seule information", () => {
  it("seuls les moments qui comptent font vibrer", () => {
    expect(hapticFor({ type: "CellArrived", playerId: pid("p1"), position: 4, cellType: "question" } as GameEvent)).toEqual(HAPTIC_PATTERNS.arrival);
    expect(hapticFor({ type: "SiteAcquired", playerId: pid("p1"), siteId: "s", price: 100, heritageValue: 80 })).toEqual(HAPTIC_PATTERNS.acquired);
    // Et tout le reste se tait : vibrer à chaque événement ne signalerait plus rien.
    expect(hapticFor({ type: "YearCompleted", year: 2 } as GameEvent)).toBeNull();
    expect(hapticFor({ type: "PassedStart", playerId: pid("p1"), bonus: 200 } as GameEvent)).toBeNull();
  });

  it("une réponse FAUSSE ne fait pas vibrer : on n'ajoute pas une punition physique à une erreur", () => {
    const base = { type: "AnswerRecorded", requestId: "r", playerId: pid("p1"), explanationMastery: "none", validationMode: "collective", purpose: "standard" } as const;
    expect(hapticFor({ ...base, outcome: "correct" } as GameEvent)).toEqual(HAPTIC_PATTERNS.correct);
    expect(hapticFor({ ...base, outcome: "partial" } as GameEvent)).toEqual(HAPTIC_PATTERNS.partial);
    expect(hapticFor({ ...base, outcome: "incorrect" } as GameEvent)).toBeNull();
  });

  it("les motifs sont COURTS : une vibration longue devient une nuisance au troisième tour", () => {
    for (const [nom, motif] of Object.entries(HAPTIC_PATTERNS)) {
      const total = motif.reduce((sum, ms) => sum + ms, 0);
      expect(total, nom).toBeLessThanOrEqual(150);
      for (const ms of motif) expect(ms, nom).toBeGreaterThan(0);
    }
  });

  it("trois conditions, toutes nécessaires — l'appareil, le réglage, et le mode d'animation", () => {
    expect(shouldVibrate({ supported: true, enabled: true, reduced: false })).toBe(true);
    // iOS ne propose pas cette interface du tout.
    expect(shouldVibrate({ supported: false, enabled: true, reduced: false })).toBe(false);
    expect(shouldVibrate({ supported: true, enabled: false, reduced: false })).toBe(false);
    expect(shouldVibrate({ supported: true, enabled: true, reduced: true })).toBe(false);
  });

  it("le réglage est persisté, et les anciens joueurs le reçoivent allumé", () => {
    const options = useSessionStore.persist.getOptions();
    const migre = options.migrate!({ narrationEnabled: true, boardRender: "3d", boardTexture: "full" }, 4) as Record<string, unknown>;
    expect(migre["hapticsEnabled"]).toBe(true);
    expect(migre["boardRender"]).toBe("3d");
    const garde = options.partialize!({ ...useSessionStore.getState(), hapticsEnabled: false }) as Record<string, unknown>;
    expect(garde["hapticsEnabled"]).toBe(false);
  });
});

describe("le verdict d'une réponse se lit SANS la couleur", () => {
  it("chaque verdict a sa forme ET son mouvement, pas seulement sa teinte", () => {
    const formes = ANSWER_OUTCOMES.map((o) => VERDICT_STYLES[o].glyph);
    const mouvements = ANSWER_OUTCOMES.map((o) => VERDICT_STYLES[o].motion);
    // Un garçon sur douze distingue mal le rouge du vert : la forme doit suffire.
    expect(new Set(formes).size).toBe(ANSWER_OUTCOMES.length);
    expect(new Set(mouvements).size).toBe(ANSWER_OUTCOMES.length);
    expect(new Set(ANSWER_OUTCOMES.map((o) => VERDICT_STYLES[o].background)).size).toBe(ANSWER_OUTCOMES.length);
  });

  it("la forme est bien dessinée dans le rendu, et le texte reste lisible à côté", () => {
    for (const outcome of ANSWER_OUTCOMES) {
      const html = renderToStaticMarkup(<AnswerVerdict outcome={outcome} reduced={false} />);
      expect(html, outcome).toContain(`data-outcome="${outcome}"`);
      expect(html, outcome).toContain(`data-glyph="${VERDICT_STYLES[outcome].glyph}"`);
    }
    expect(renderToStaticMarkup(<AnswerVerdict outcome="correct" reduced={false} />)).toContain("Bonne réponse");
    expect(renderToStaticMarkup(<AnswerVerdict outcome="incorrect" reduced={false} />)).toContain("prochaine fois");
  });

  it("une réponse fausse ne se fait pas gronder : ni croix, ni secousse, ni rouge vif", () => {
    const fausse = VERDICT_STYLES.incorrect;
    expect(fausse.glyph).not.toBe("check");
    expect(fausse.motion).toBe("settle");
    // Une secousse, c'est une oscillation horizontale : aucune animation de
    // verdict ne doit en contenir. (Chercher le MOT ne prouverait rien — il
    // apparaît justement dans le commentaire qui explique qu'il n'y en a pas.)
    const code = source("src/ui/cards/AnswerVerdict.tsx");
    const entrees = code.slice(code.indexOf("const ENTRANCE"), code.indexOf("export function AnswerVerdict"));
    expect(entrees).not.toMatch(/\bx:\s*\[/);
    // Aucun rouge saturé dans la palette des verdicts.
    for (const outcome of ANSWER_OUTCOMES) expect(VERDICT_STYLES[outcome].background.toLowerCase(), outcome).not.toMatch(/^#(e|f)[0-9a-f]{1}[0-2]/);
  });
});

describe("la carte se retourne vraiment", () => {
  it("le dos fait un demi-tour et la face REPREND là où il s'arrête", () => {
    const carte = source("src/ui/cards/QuestionCard.tsx");
    const coque = source("src/ui/cards/CardShell.tsx");
    // Avant : le dos faisait un tour complet, puis la face apparaissait en
    // grossissant — deux gestes collés bout à bout, pas un retournement.
    expect(carte).not.toContain("rotate: reduced ? 0 : 360");
    expect(carte).toContain('enter="flip"');
    expect(coque).toContain("rotateY: -90");
    expect(coque).toContain("transformPerspective");
  });

  it("en mode animations réduites, la carte ne tourne pas du tout", () => {
    expect(source("src/ui/cards/QuestionCard.tsx")).toContain("rotateY: reduced ? 0 : 90");
  });
});
