import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Ces tests prouvent que les règles d'architecture sont réellement appliquées
 * par ESLint, et pas seulement documentées. Ils lintent des fragments de code
 * à des chemins virtuels : aucun fichier n'est écrit.
 */
const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));

let eslint: ESLint;

async function lintAt(virtualPath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: `${projectRoot}${virtualPath}` });
  return result?.messages.map((m) => m.ruleId ?? "") ?? [];
}

beforeAll(() => {
  eslint = new ESLint({ cwd: projectRoot });
});

describe("frontière du noyau (src/core)", () => {
  it("refuse React dans le noyau", async () => {
    const rules = await lintAt("src/core/game/__fixture__.ts", 'import { useState } from "react";\nexport const x = useState;\n');
    expect(rules).toContain("no-restricted-imports");
  });

  it("refuse Next, Motion, Zustand et Supabase dans le noyau", async () => {
    for (const pkg of ["next/navigation", "motion/react", "zustand", "@supabase/supabase-js"]) {
      const rules = await lintAt("src/core/learning/__fixture__.ts", `import * as m from "${pkg}";\nexport const x = m;\n`);
      expect(rules, pkg).toContain("no-restricted-imports");
    }
  });

  it("refuse les autres couches applicatives depuis le noyau", async () => {
    for (const layer of ["@/ui/primitives/Bidi", "@/i18n", "@/state/gameStore", "@/data/local/db", "@/config/schemas"]) {
      const rules = await lintAt("src/core/content/__fixture__.ts", `import * as m from "${layer}";\nexport const x = m;\n`);
      expect(rules, layer).toContain("no-restricted-imports");
    }
  });

  it("refuse les imports relatifs remontants (`../`) depuis le noyau", async () => {
    const rules = await lintAt("src/core/game/__fixture__.ts", 'import { LOCALES } from "../shared";\nexport const x = LOCALES;\n');
    expect(rules).toContain("no-restricted-imports");
  });

  it("autorise `@/core/**` et les voisins `./` dans le noyau", async () => {
    const rules = await lintAt(
      "src/core/game/__fixture__.ts",
      'import { LOCALES } from "@/core/shared";\nimport { PROFILE_TYPES } from "@/core/shared/player";\nexport const x = [LOCALES, PROFILE_TYPES];\n',
    );
    expect(rules).not.toContain("no-restricted-imports");
  });

  it("n'applique pas la frontière hors du noyau", async () => {
    const rules = await lintAt("src/ui/__fixture__.tsx", 'import { useState } from "react";\nexport const x = useState;\n');
    expect(rules).not.toContain("no-restricted-imports");
  });
});

describe("Tailwind : propriétés logiques uniquement", () => {
  const physical = ["ml-4", "pr-2", "left-0", "text-right", "sm:mr-3", "-ml-1", "rounded-l-lg", "border-r"];
  const logical = ["ms-4", "pe-2", "start-0", "text-end", "sm:me-3", "-ms-1", "rounded-s-lg", "border-e", "flex-col", "leading-10"];

  it.each(physical)("refuse la classe directionnelle physique `%s`", async (cls) => {
    const rules = await lintAt("src/ui/__fixture__.tsx", `export const X = () => <div className="p-2 ${cls}" />;\n`);
    expect(rules).toContain("no-restricted-syntax");
  });

  it.each(logical)("accepte la classe logique `%s`", async (cls) => {
    const rules = await lintAt("src/ui/__fixture__.tsx", `export const X = () => <div className="p-2 ${cls}" />;\n`);
    expect(rules).not.toContain("no-restricted-syntax");
  });

  it("couvre aussi les gabarits de chaînes", async () => {
    const rules = await lintAt("src/ui/__fixture__.tsx", "export const X = ({ a }: { a: string }) => <div className={`ml-2 ${a}`} />;\n");
    expect(rules).toContain("no-restricted-syntax");
  });
});
