import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });

/** L'interface ne lit jamais le cycle ni les déplacements futurs : seul `MovementAssigned` du tour courant lui parvient. */
describe("le Chemin reste invisible pour l'interface (ADR 0018)", () => {
  const layers = ["app", "src/ui", "src/state", "src/animation", "src/experience", "src/dev"].map((d) => join(root, d));
  const files = layers.flatMap((d) => (statSync(d, { throwIfNoEntry: false }) ? walk(d) : []));

  it.each(files.map((f) => f.replace(root, "")))("%s n'accède ni au cycle, ni au scheduler, ni aux variantes", (rel) => {
    const source = readFileSync(join(root, rel), "utf8");
    expect(source).not.toMatch(/assignJourneySteps|flattenCycle|config\.journey|\.blocks\b|JOURNEY_VARIANTS|JOURNEY_CYCLE_V1/);
  });

  it("seule la création de partie résout la variante, à partir du numéro de partie", () => {
    const setup = readFileSync(join(root, "src/ui/setup/NewGameForm.tsx"), "utf8");
    expect(setup).toMatch(/journeyCycleForOrdinal\(familyGameOrdinal\)/);
    expect(setup).not.toMatch(/select[^>]*journey/i);
  });
});
