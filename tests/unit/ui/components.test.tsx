import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";
import { resolveBoard } from "@/core/game";
import { Board } from "@/ui/board/Board";
import { PawnLayer } from "@/ui/board/PawnLayer";
import { JourneyAction, JourneyPanel } from "@/ui/game/JourneyPanel";
import { PlayerPanel } from "@/ui/game/PlayerPanel";
import { HelpSheet } from "@/ui/game/HelpSheet";
import { Pillars } from "@/ui/common/Pillars";
import { TimeBadge } from "@/ui/game/TimeBadge";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";
import { TEST_RULES_FREE, TEST_RULES_TIMED } from "../../fixtures/game/rules.fixture";
import { create, makeSetup, pid } from "../../fixtures/game/setup.fixture";

const resolved = resolveBoard(DEFAULT_BOARD, TEST_MONUMENTS);
if (!resolved.ok) throw new Error("board");
const profiles = makeSetup().players.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "fille-7-9" }));

describe("composants du plateau (rendu statique)", () => {
  it("rend les 28 cases avec leur type (grille 8×8), met en évidence la case demandée, marque les Haltes comme grosses cases", () => {
    const html = renderToStaticMarkup(<Board board={resolved.value.board} highlightedCell={5} arrivalCell={null} previewPath={[1, 2]} pawns={null} center={<span>centre</span>} />);
    for (let i = 0; i < 28; i += 1) expect(html).toContain(`data-cell="${i}"`);
    expect(html).not.toContain('data-cell="28"');
    expect(html).toContain('data-grid="8x8"');
    expect(html.match(/data-type="heritage"/g)).toHaveLength(12);
    expect(html.match(/data-type="question"/g)).toHaveLength(6);
    expect(html.match(/data-type="challenge"/g)).toHaveLength(5);
    expect(html.match(/data-type="halt"/g)).toHaveLength(2);
    expect(html.match(/data-type="donation"/g)).toHaveLength(1);
    expect(html.match(/data-type="treasure"/g)).toHaveLength(1);
    expect(html.match(/data-big="true"/g)).toHaveLength(2);
    expect(html).toContain("centre");
  });

  it("rend un pion par joueur, positionné par transform uniquement", () => {
    const { state } = create();
    const html = renderToStaticMarkup(<PawnLayer players={state.players} profiles={profiles} visuals={{ p1: 3 }} activePlayerId={pid("p1")} cellCount={resolved.value.board.cellCount} stepMs={0} />);
    expect(html.match(/data-pawn=/g)).toHaveLength(3);
    expect(html).toContain("transform:");
    expect(html).not.toMatch(/(?:^|[^-])left:\s*\d/);
    // Le plateau ne porte QUE des pions : aucun symbole d'avatar dessiné dessus.
    expect(html).not.toContain("<svg");
    // Un pion différent par siège : deux joueurs n'ont jamais la même couleur.
    expect(html).toContain("/kounouzi/pawns/ambre.webp");
    expect(html).toContain("/kounouzi/pawns/bleu.webp");
    expect(html).toContain("/kounouzi/pawns/vert.webp");
  });

  it("l'appel à l'action vit SOUS le plateau, à une place fixe ; le cœur du plateau ne l'affiche jamais", () => {
    const { state } = create();
    const props = { state, shown: state, profiles, reveal: null, isAnimating: false, onStartJourney: () => {} };
    const action = renderToStaticMarkup(<JourneyAction {...props} />);
    expect(action).toContain("Au tour de Joueur 1");
    expect(action).toContain("Découvrir mon chemin");
    // L'avatar du joueur actif se lit ICI, sous le plateau, jamais sur le pion :
    // c'est le PORTRAIT du personnage choisi, pas un symbole.
    expect(action).toContain('data-testid="journey-avatar"');
    expect(action).toContain('data-avatar="fille-7-9"');
    expect(action).toContain("/kounouzi/avatars/fille-7-9-portrait.webp");
    // Le cœur reste libre : la carte illustrée n'est masquée par rien tant qu'il n'y a rien à dire.
    const coeur = renderToStaticMarkup(<JourneyPanel {...props} />);
    expect(coeur).not.toContain("Découvrir mon chemin");
    expect(coeur).not.toContain("Au tour de Joueur 1");
  });

  it("le dévoilement du Chemin s'affiche au CŒUR du plateau, et retire le bouton pendant ce temps", () => {
    const { state } = create();
    const props = { state, shown: state, profiles, reveal: { playerId: pid("p1"), steps: 4 }, isAnimating: true, onStartJourney: () => {} };
    const coeur = renderToStaticMarkup(<JourneyPanel {...props} />);
    expect(coeur).toContain("Ton chemin se dévoile");
    expect(coeur).toContain("4 étapes");
    // Pendant le dévoilement, plus aucun bouton : on ne peut pas relancer par erreur.
    expect(renderToStaticMarkup(<JourneyAction {...props} />)).not.toContain("Découvrir mon chemin");
  });

  it("le panneau des joueurs marque le joueur actif", () => {
    const { state } = create();
    const html = renderToStaticMarkup(<PlayerPanel state={state} profiles={profiles} />);
    expect(html).toContain('data-player="p1" data-active="true"');
    expect(html).toContain('data-player="p2" data-active="false"');
  });

  it("le temps restant est approximatif par défaut, précis sur demande, absent en partie libre", () => {
    const timed = create(makeSetup({ rules: TEST_RULES_TIMED })).state;
    expect(renderToStaticMarkup(<TimeBadge state={timed} precise={false} />)).toContain("Environ 1 min restantes");
    expect(renderToStaticMarkup(<TimeBadge state={timed} precise={true} />)).toContain("1:00");
    const free = create(makeSetup({ rules: TEST_RULES_FREE })).state;
    expect(renderToStaticMarkup(<TimeBadge state={free} precise={false} />)).toContain("Partie libre");
  });

  it("les trois piliers portent les couleurs des cases qu'ils incarnent, et l'aide dresse la légende du plateau SERVI", () => {
    const piliers = renderToStaticMarkup(<Pillars />);
    for (const cle of ["play", "learn", "manage"]) expect(piliers).toContain(`data-pillar="${cle}"`);
    expect(piliers).toContain("Joue");
    expect(piliers).toContain("Apprends");
    expect(piliers).toContain("Gère");

    const aide = renderToStaticMarkup(<HelpSheet open board={resolved.value.board} onClose={() => {}} />);
    // La légende vient du plateau : les sept types du plateau 28, et rien d'autre.
    for (const type of ["start", "question", "heritage", "challenge", "halt", "treasure", "donation"]) expect(aide).toContain(`data-legend="${type}"`);
    for (const absent of ["event", "management", "solidarity"]) expect(aide).not.toContain(`data-legend="${absent}"`);
  });
});
