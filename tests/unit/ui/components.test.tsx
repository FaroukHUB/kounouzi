import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BOARD_32_V1 } from "@/config/board";
import { resolveBoard } from "@/core/game";
import { Board } from "@/ui/board/Board";
import { PawnLayer } from "@/ui/board/PawnLayer";
import { JourneyPanel } from "@/ui/game/JourneyPanel";
import { PlayerPanel } from "@/ui/game/PlayerPanel";
import { TimeBadge } from "@/ui/game/TimeBadge";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";
import { TEST_RULES_FREE, TEST_RULES_TIMED } from "../../fixtures/game/rules.fixture";
import { create, makeSetup, pid } from "../../fixtures/game/setup.fixture";

const resolved = resolveBoard(BOARD_32_V1, TEST_MONUMENTS);
if (!resolved.ok) throw new Error("board");
const profiles = makeSetup().players.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal" }));

describe("composants du plateau (rendu statique)", () => {
  it("rend les 32 cases avec leur type et met en évidence la case demandée", () => {
    const html = renderToStaticMarkup(<Board board={resolved.value.board} highlightedCell={5} arrivalCell={null} previewPath={[1, 2]} pawns={null} center={<span>centre</span>} />);
    for (let i = 0; i < 32; i += 1) expect(html).toContain(`data-cell="${i}"`);
    expect(html.match(/data-type="heritage"/g)).toHaveLength(8);
    expect(html.match(/data-type="question"/g)).toHaveLength(10);
    expect(html).toContain("centre");
  });

  it("rend un pion par joueur, positionné par transform uniquement", () => {
    const { state } = create();
    const html = renderToStaticMarkup(<PawnLayer players={state.players} profiles={profiles} visuals={{ p1: 3 }} activePlayerId={pid("p1")} cellCount={32} stepMs={0} />);
    expect(html.match(/data-pawn=/g)).toHaveLength(3);
    expect(html).toContain("transform:");
    expect(html).not.toMatch(/(?:^|[^-])left:\s*\d/);
  });

  it("le panneau du Chemin propose « Découvrir mon chemin » au joueur actif, puis affiche la valeur attribuée", () => {
    const { state } = create();
    const cta = renderToStaticMarkup(<JourneyPanel state={state} reveal={null} isAnimating={false} onStartJourney={() => {}} />);
    expect(cta).toContain("Au tour de Joueur 1");
    expect(cta).toContain("Découvrir mon chemin");
    const reveal = renderToStaticMarkup(<JourneyPanel state={state} reveal={{ playerId: pid("p1"), steps: 4 }} isAnimating={true} onStartJourney={() => {}} />);
    expect(reveal).toContain("Ton chemin se dévoile");
    expect(reveal).toContain("4 étapes");
    expect(reveal).not.toContain("Découvrir mon chemin");
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
});
