import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const coreDir = join(root, "src/core");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") ? [full] : [];
  });
}

describe("aucun hasard dans le noyau (ADR 0013)", () => {
  const files = walk(coreDir);

  it("le noyau contient bien des fichiers à auditer", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => f.replace(root, "")))("%s ne contient ni Math.random, ni crypto.getRandomValues, ni vocabulaire de roue/dé/graine", (rel) => {
    const source = readFileSync(join(root, rel), "utf8");
    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/getRandomValues/);
    expect(source).not.toMatch(/\b(rng|seed|seeds|wheel|dice|spin|roll)\b/i);
  });

  it("ESLint refuse Math.random et crypto.getRandomValues dans src/core", async () => {
    const eslint = new ESLint({ cwd: root });
    const [random] = await eslint.lintText("export const x = Math.random();\n", { filePath: `${root}src/core/game/__fixture__.ts` });
    expect(random?.messages.map((m) => m.ruleId)).toContain("no-restricted-syntax");
    const [crypto] = await eslint.lintText("export const x = crypto.getRandomValues(new Uint8Array(1));\n", { filePath: `${root}src/core/game/__fixture__.ts` });
    expect(crypto?.messages.map((m) => m.ruleId)).toContain("no-restricted-syntax");
  });
});
