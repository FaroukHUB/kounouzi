import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deckFor } from "@/config/cards";
import { DEMO_ESTABLISHMENTS } from "@/config/demo";
import { HASSANAT_CARDS, HASSANAT_CONFIG } from "@/config/hassanat";
import type { GameState, HeritageSite, RulesConfig } from "@/core/game";
import { Board } from "@/ui/board/Board";
import { EstablishmentCard, ServiceCard, siteDisplayName } from "@/ui/cards/EstablishmentCard";
import { HassanatCard } from "@/ui/cards/HassanatCard";
import { cardForPhase } from "@/ui/cards/cardState";
import { PlayerTile } from "@/ui/game/PlayerPanel";
import { bannerText } from "@/ui/game/TurnBanner";
import { TEST_RULES_QUICK } from "../../fixtures/game/rules.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { create, journey, makeLineSetup, makeSetup, pid, players, run } from "../../fixtures/game/setup.fixture";

const NO_ZAKAT: RulesConfig = { ...TEST_RULES_QUICK, zakat: { ...TEST_RULES_QUICK.zakat, enabled: false } };
const NAMES = ["Youssouf", "Maryam", "Yacine"];
const profiles = makeSetup().players.map((p, i) => ({ id: p.id, displayName: NAMES[i]!, profileType: p.profileType, avatarId: ["garcon-7-9", "fille-7-9", "garcon-10-12"][i]!, ...(p.profileType === "child" ? { child: { birthYear: 2019 } } : { adult: { initialLevel: "standard" as const } }) }));
const named = (s: GameState): GameState => ({ ...s, players: s.players.map((p, i) => ({ ...p, displayName: NAMES[i]! })) });
const HOTEL = DEMO_ESTABLISHMENTS.find((s) => s.id === "est-hotel-madinah-a")!;
const PARC = DEMO_ESTABLISHMENTS.find((s) => s.id === "est-park-kounouzi")!;
/**
 * Les douze établissements du plateau portent désormais leur carte dessinée. Le filet de
 * sécurité — icône sur la case, vignette sur la carte — reste le chemin emprunté par tout
 * établissement AJOUTÉ plus tard, avant que l'auteur n'en dessine la carte. On le prouve
 * donc sur un établissement de test qu'aucun jeu de cartes ne vise, pas en laissant une
 * case du plateau sans sa carte.
 */
const SANS_CARTE: HeritageSite = { ...PARC, id: "est-sans-carte-test" };

describe("carte Établissement (achat) et carte Service (chez un autre joueur)", () => {
  const offered = named(journey(create(makeLineSetup({ cells: { 1: "heritage", 2: "question" }, heritageSites: [HOTEL], players: players(2), rules: NO_ZAKAT })).state).state);

  it("l'achat montre nom FR et AR, famille, prix, Kounouz du joueur, ACHETER / PASSER ; jamais « Monument »", () => {
    const card = cardForPhase(offered);
    if (card?.kind !== "establishment") throw new Error("carte établissement attendue");
    const html = renderToStaticMarkup(<EstablishmentCard state={offered} card={card} onDecide={() => {}} />);
    expect(siteDisplayName(offered, HOTEL.id)).toBe("Hôtel de Médine A");
    expect(html).toContain("Hôtel de Médine A");
    expect(html).toContain(HOTEL.establishment!.name.ar!);
    // L'auteur a dessiné la carte de cet hôtel : elle DEVIENT la carte, le nom y est peint,
    // et la vignette d'illustration comme la pastille d'icône n'ont plus lieu d'être.
    expect(html).toContain('data-deck="hotel-medine"');
    expect(html).not.toContain('data-testid="establishment-icon"');
    expect(html).not.toContain('data-testid="establishment-illustration"');
    expect(html).toContain("Hôtels de Médine");
    expect(html).toContain('data-testid="establishment-price"');
    expect(html).toContain('data-testid="establishment-your-kounouz"');
    expect(html).toContain('data-testid="establishment-buy"');
    expect(html).toContain('data-testid="establishment-pass"');
    // Aucun « Monument » visible (le chemin de l'illustration `monuments/` n'est pas du texte affiché).
    expect(html.replace(/<[^>]+>/g, " ")).not.toMatch(/monument/i);
  });

  it("chez Maryam : propriétaire visible, « Tu y séjournes. », coût, PAYER ; puis « Youssouf paie 30 Kounouz à Maryam »", () => {
    const bought = run(offered, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true });
    // Le second joueur (Maryam) est propriétaire dans ce test : on inverse pour lire « Youssouf séjourne chez Maryam ».
    const swapped: GameState = { ...bought.state, holdings: bought.state.holdings.map((h) => ({ ...h, ownerId: pid("p2") })) };
    const arrivedP2 = journey(bought.state).state;
    const cardP2 = cardForPhase(arrivedP2);
    expect(cardP2).toMatchObject({ kind: "service", siteId: HOTEL.id, ownerId: "p1", amount: 30, step: "offer" });
    const state: GameState = { ...swapped, phase: { kind: "awaiting_service", siteId: HOTEL.id, ownerId: pid("p2"), amount: 30, queue: [] }, activePlayerIndex: 0 };
    const card = cardForPhase(state);
    if (card?.kind !== "service") throw new Error("carte service attendue");
    const html = renderToStaticMarkup(<ServiceCard state={state} profiles={profiles} card={card} onPay={() => {}} />);
    expect(html).toContain("Hôtel de Médine A");
    expect(html).toContain("Propriétaire : Maryam");
    expect(html).toContain("Tu y séjournes.");
    expect(html).toContain('data-testid="service-amount"');
    expect(html).toContain('data-testid="service-pay"');
    const paid = renderToStaticMarkup(<ServiceCard state={state} profiles={profiles} card={{ ...card, step: "paid", paid: 30 }} onPay={() => {}} />);
    expect(paid).toContain("Youssouf paie 30 Kounouz à Maryam");
    expect(bannerText({ kind: "service", playerId: pid("p1"), ownerId: pid("p2"), amount: 30 }, state)).toBe("Youssouf paie 30 Kounouz à Maryam");
    expect(bannerText({ kind: "owned", ownerId: pid("p2") }, state)).toBe("Cet établissement appartient déjà à Maryam");
  });

  it("le plateau montre la carte de l'établissement sur sa case, et le propriétaire une fois acheté", () => {
    const bought = run(offered, { type: "DecidePurchase", playerId: pid("p1"), siteId: HOTEL.id, buy: true }).state;
    const html = renderToStaticMarkup(<Board board={bought.config.board} highlightedCell={null} arrivalCell={null} previewPath={[]} pawns={null} center={null} holdings={bought.holdings} sites={bought.config.sites} players={bought.players} profiles={profiles} />);
    expect(html).toContain('data-testid="establishment-art-1"');
    expect(html).toContain("hotel-medine-dos.webp");
    expect(html).toContain('data-testid="owner-1"');
    expect(html).toContain("Hôtel de Médine A");
    expect(html).toContain("Établissement 1");
  });

  it("chacun des douze établissements montre SA carte sur sa case, jamais un emoji", () => {
    for (const site of DEMO_ESTABLISHMENTS) {
      const etat = create(makeLineSetup({ cells: { 1: "heritage", 2: "question" }, heritageSites: [site], players: players(2), rules: NO_ZAKAT })).state;
      const plateau = renderToStaticMarkup(<Board board={etat.config.board} highlightedCell={null} arrivalCell={null} previewPath={[]} pawns={null} center={null} holdings={[]} sites={etat.config.sites} players={etat.players} profiles={profiles} />);
      expect(plateau, site.id).toContain('data-testid="establishment-art-1"');
      expect(plateau, site.id).toContain(deckFor({ siteId: site.id })!.back.split("/").pop()!);
      expect(plateau, site.id).not.toContain(site.establishment!.icon!);
    }
  });

  it("un établissement ajouté sans carte dessinée garde son icône sur la case et sa vignette sur la carte", () => {
    const sansCarte = named(journey(create(makeLineSetup({ cells: { 1: "heritage", 2: "question" }, heritageSites: [SANS_CARTE], players: players(2), rules: NO_ZAKAT })).state).state);
    const card = cardForPhase(sansCarte);
    if (card?.kind !== "establishment") throw new Error("carte établissement attendue");
    const carte = renderToStaticMarkup(<EstablishmentCard state={sansCarte} card={card} onDecide={() => {}} />);
    expect(carte).toContain('data-testid="establishment-icon"');
    expect(carte).toContain('data-testid="establishment-illustration"');
    const plateau = renderToStaticMarkup(<Board board={sansCarte.config.board} highlightedCell={null} arrivalCell={null} previewPath={[]} pawns={null} center={null} holdings={[]} sites={sansCarte.config.sites} players={sansCarte.players} profiles={profiles} />);
    expect(plateau).toContain('data-testid="establishment-1"');
    expect(plateau).toContain(SANS_CARTE.establishment!.icon!);
  });
});

describe("carte Hassanāt : famille visuelle propre, ACCEPTER / PASSER, points distincts des Kounouz", () => {
  const offered = named(journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-hassanat"), players: players(3), rules: NO_ZAKAT, hassanat: HASSANAT_CONFIG })).state).state);
  const card = cardForPhase(offered);
  if (card?.kind !== "hassanat") throw new Error("carte Hassanāt attendue");
  const def = HASSANAT_CARDS.find((c) => c.id === card.cardId)!;

  it("affiche le titre et le texte de la carte (données), le coût, « +N points Hassanāt », ACCEPTER et PASSER, sans affirmation religieuse", () => {
    const html = renderToStaticMarkup(<HassanatCard state={offered} profiles={profiles} card={card} onAccept={() => {}} onSkip={() => {}} />);
    expect(html).toContain('data-card-type="hassanat"');
    expect(html).toContain(def.title);
    expect(html).toContain(def.text);
    expect(html).toContain(`Coût : ${def.cost} Kounouz`);
    expect(html).toContain(`+${def.hassanatReward} points Hassanāt`);
    expect(html).toContain('data-testid="hassanat-accept"');
    expect(html).toContain('data-testid="hassanat-skip"');
    expect(html).toContain("Passer ne coûte rien");
    expect(html).not.toMatch(/récompense divine|Dieu|Allah/i);
  });

  it("après acceptation, la carte montre les points crédités ; passée, un message neutre ; le bandeau nomme le joueur", () => {
    const granted = renderToStaticMarkup(<HassanatCard state={offered} profiles={profiles} card={{ ...card, step: "granted", granted: def.hassanatReward }} onAccept={() => {}} onSkip={() => {}} />);
    expect(granted).toContain('data-testid="hassanat-granted"');
    expect(granted).not.toContain('data-testid="hassanat-accept"');
    const skipped = renderToStaticMarkup(<HassanatCard state={offered} profiles={profiles} card={{ ...card, step: "skipped" }} onAccept={() => {}} onSkip={() => {}} />);
    expect(skipped).toContain("Tu passes, sans souci");
    expect(bannerText({ kind: "hassanat_granted", playerId: pid("p1"), amount: 10 }, offered)).toBe("Youssouf : +10 points Hassanāt");
    expect(bannerText({ kind: "hassanat_unavailable" }, offered)).toBe("Aucune carte Hassanāt disponible");
  });

  it("la tuile joueur affiche les points Hassanāt à côté des Kounouz, comme deux ressources", () => {
    const accepted = run(offered, { type: "AcceptHassanat", playerId: pid("p1"), beneficiaryId: pid("p2") }).state;
    const html = renderToStaticMarkup(<PlayerTile state={accepted} profiles={profiles} playerId={pid("p1")} />);
    expect(html).toContain('data-testid="player-money"');
    expect(html).toContain('data-testid="player-hassanat"');
    expect(html).toContain(`Hassanāt ${def.hassanatReward}`);
  });
});
