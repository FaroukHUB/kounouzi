#!/usr/bin/env node
/**
 * Pré-génération des phrases FIXES de la voix Kounouzi (ADR 0036).
 *
 *   pnpm voice:generate            # génère ce qui manque, met à jour le manifeste
 *   pnpm voice:generate --dry-run  # liste les phrases et leur état, sans appel réseau
 *   pnpm voice:generate --force    # régénère tout (nouvelle voix, par exemple)
 *
 * Variables d'environnement (jamais dans le dépôt) : ELEVENLABS_API_KEY,
 * ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID (défaut eleven_multilingual_v2).
 * Les phrases viennent de `src/config/narration/voice.v1.json` (clés du
 * dictionnaire FR sans gabarit) ; les fichiers vont dans
 * `public/kounouzi/audio/voix/<clé>.mp3` et le manifeste lie clé → fichier.
 * Le jeu, lui, ne lit que des fichiers locaux ou `/api/voix`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fr } from "../../src/i18n/fr.ts";
import { voiceKey } from "../../src/experience/narration/voiceKey.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(readFileSync(join(root, "src/config/narration/voice.v1.json"), "utf8"));
const outDir = join(root, "public", config.manifestUrl.slice(1, config.manifestUrl.lastIndexOf("/")));
const manifestPath = join(root, "public", config.manifestUrl.slice(1));
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { version: 1, voiceId: null, generatedAt: null, entries: {} };
const entries = { ...manifest.entries };

const phrases = [];
for (const key of config.phrases) {
  const text = fr[key];
  if (typeof text !== "string") throw new Error(`Clé inconnue dans le dictionnaire FR : ${key}`);
  if (/\{[a-zA-Z]+\}/.test(text)) throw new Error(`La clé ${key} contient un gabarit : impossible à pré-générer (${text})`);
  phrases.push({ key, lang: "fr", text });
}

const apiKey = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID;
const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
const voiceChanged = manifest.voiceId && voiceId && manifest.voiceId !== voiceId;

let generated = 0;
let kept = 0;
for (const p of phrases) {
  const id = voiceKey(p.lang, p.text);
  const file = `${id}.mp3`;
  const exists = entries[id] && existsSync(join(outDir, entries[id].file));
  const todo = force || voiceChanged || !exists;
  console.log(`${todo ? "À générer" : "OK       "}  ${p.key}  →  ${file}  « ${p.text} »`);
  if (!todo) {
    kept += 1;
    continue;
  }
  if (dryRun) continue;
  if (!apiKey || !voiceId) throw new Error("ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID sont requis pour générer.");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: p.text, model_id: modelId, language_code: p.lang }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} pour ${p.key} : ${await res.text()}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, file), Buffer.from(await res.arrayBuffer()));
  entries[id] = { file, lang: p.lang, key: p.key, text: p.text };
  generated += 1;
}

if (!dryRun) {
  const next = { version: 1, voiceId: voiceId ?? manifest.voiceId, generatedAt: generated > 0 ? new Date().toISOString() : manifest.generatedAt, entries };
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
}
console.log(`\n${phrases.length} phrases fixes · ${kept} déjà présentes · ${generated} générées${dryRun ? " (simulation)" : ""}.`);
if (voiceChanged) console.log("Voix changée : tout a été régénéré.");
