#!/usr/bin/env node
/**
 * Import de la banque canonique des Défis famille (PDF de conception → données
 * structurées consommées par le moteur). Entrée : le TEXTE extrait du PDF,
 * sortie : JSON versionné validé par `src/config/challenges`.
 *
 * Le PDF est de la DONNÉE : aucune règle n'est codée en dur dans le moteur.
 * Chaque défi porte : identifiant, titre, catégorie, âge minimal, gain, texte,
 * adaptation (texte libre) et variantes d'âge quand l'adaptation les énonce
 * (« 5-8 : 5 s. 8+ : 10 s. »), drapeaux « OH NON », boss, contact
 * (consentement obligatoire), clé d'animation, référence de contenu validé
 * (défis religieux : JAMAIS de texte religieux ici) et résultats économiques
 * de réussite (défis solidaires).
 *
 *   node scripts/content/import-defis.mjs <texte.txt> <sortie.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("usage: import-defis.mjs <texte.txt> <sortie.json>");
  process.exit(1);
}

const CATEGORY = {
  Mouvement: "movement",
  Animaux: "animals",
  Famille: "family",
  Solidarité: "solidarity",
  "Oh non": "oh_no",
  Mémoire: "memory",
  Réflexion: "reflection",
  Géographie: "geography",
  Observation: "observation",
  Langage: "language",
  Maths: "maths",
  Logique: "logic",
  Arabe: "arabic",
  Religion: "religion",
  Boss: "boss",
};

/**
 * Décisions de DONNÉES propres à certains défis (le PDF les décrit en prose) :
 * contact (consentement obligatoire), référence de contenu validé pour les
 * défis religieux, résultats économiques réels des défis solidaires.
 */
const CONSENT_IDS = new Set(["CH-041", "CH-045", "CH-046"]);
const CONTENT_REFS = {
  "CH-091": { kind: "validated_recitation", count: 1 },
  "CH-092": { kind: "validated_recitation", count: 2 },
  "CH-093": { kind: "validated_recitation", count: 1, surahId: "surah_001" },
  "CH-094": { kind: "validated_question", categoryId: "religion", difficultyDelta: 0 },
  "CH-095": { kind: "validated_question", categoryId: "religion", difficultyDelta: 0 },
  "CH-096": { kind: "validated_question", categoryId: "religion", difficultyDelta: 0 },
  "CH-097": { kind: "validated_question", categoryId: "religion", difficultyDelta: 1 },
  "CH-099": { kind: "validated_question", categoryId: "any", difficultyDelta: 0 },
  "CH-100": { kind: "validated_question", categoryId: "any", difficultyDelta: 0 },
};
const ON_SUCCESS = {
  // « Donne 5 Kounouz au joueur de ton choix » : transfert réel, puis la récompense du défi.
  "CH-051": [{ kind: "transfer_choice", amount: 5, reason: "gift", insufficient: "cap_to_balance" }],
  // « Donne 10 au joueur ayant le moins » : cible déterministe (le plus pauvre, départage par siège).
  "CH-052": [{ kind: "give_to_poorest", amount: 10, reason: "solidarity", insufficient: "cap_to_balance" }],
  // « Garder 10 ou en donner 5 à deux joueurs et gagner 25 » : vraie décision économique, le gain vient du choix.
  "CH-053": [
    {
      kind: "choice",
      choiceId: "CH-053",
      options: [
        { id: "keep", outcomes: [{ kind: "money", amount: 10 }] },
        { id: "share", outcomes: [{ kind: "transfer_choice", amount: 5, reason: "gift", insufficient: "cap_to_balance" }, { kind: "transfer_choice", amount: 5, reason: "gift", insufficient: "cap_to_balance" }, { kind: "money", amount: 25 }] },
      ],
    },
  ],
};
/** Le gain de CH-053 est versé par le choix lui-même (jamais deux fois). */
const REWARD_OVERRIDE = { "CH-053": 0 };

const lines = readFileSync(input, "utf8")
  .split(/\r?\n/)
  .map((l) => l.replace(/\s+$/, ""))
  .filter((l) => l.trim() !== "");

const challenges = [];
let i = 0;
while (i < lines.length) {
  const head = lines[i].match(/^(CH-\d{3}) - (.+)$/);
  if (!head) {
    i += 1;
    continue;
  }
  const id = head[1];
  const rawTitle = head[2].trim();
  i += 1;
  const meta = lines[i++].match(/^Catégorie : (.+?)\s+Âge : (\d+)\+\s+Gain : (\d+) Kounouz$/);
  if (!meta) throw new Error(`${id} : ligne de métadonnées non reconnue « ${lines[i - 1]} »`);
  const category = CATEGORY[meta[1].trim()];
  if (!category) throw new Error(`${id} : catégorie inconnue « ${meta[1]} »`);
  const minAge = Number(meta[2]);
  const reward = Number(meta[3]);
  const body = { text: [], adaptation: [], ohNo: false, animationKey: "" };
  let field = null;
  while (i < lines.length && !/^CH-\d{3} - /.test(lines[i])) {
    const l = lines[i++];
    if (l.startsWith("Défi : ")) {
      field = "text";
      body.text.push(l.slice(7));
    } else if (l.startsWith("Adaptation : ")) {
      field = "adaptation";
      body.adaptation.push(l.slice(13));
    } else if (l.startsWith("Carte « OH NON »")) {
      field = null;
      body.ohNo = true;
    } else if (l.startsWith("Animation : ")) {
      field = null;
      body.animationKey = l.slice(12).trim();
    } else if (field) body[field].push(l);
  }
  const ohNo = body.ohNo || / - OH NON$/.test(rawTitle);
  const title = rawTitle.replace(/ - OH NON$/, "").trim();
  const text = body.text.join(" ").replace(/\s+/g, " ").trim();
  const adaptation = body.adaptation.join(" ").replace(/\s+/g, " ").trim();
  const variants = parseVariants(adaptation);
  challenges.push({
    id,
    title,
    category,
    minAge,
    reward: REWARD_OVERRIDE[id] ?? reward,
    text,
    ...(adaptation ? { adaptation } : {}),
    variants,
    ohNo,
    boss: /\bBOSS\b/.test(title),
    consentRequired: CONSENT_IDS.has(id),
    animationKey: body.animationKey || `${category}_${id.slice(-3)}`,
    ...(CONTENT_REFS[id] ? { contentRef: CONTENT_REFS[id] } : {}),
    ...(ON_SUCCESS[id] ? { onSuccess: ON_SUCCESS[id] } : {}),
  });
}

/**
 * Variantes d'âge énoncées dans l'adaptation : « 5-8 : 5 s. 8+ : 10 s. »,
 * « Pour 5-8 ans : 5 sauts. 8+ : 8 sauts. », « Adulte : 7. ». Tout ce qui ne
 * suit pas ce motif reste dans le texte d'adaptation (affiché tel quel).
 */
function parseVariants(adaptation) {
  const out = [];
  const re = /(?:Pour )?(\d+)(?:-(\d+)|\+)?(?: ans)? : ([^.]+(?:\.\d+)?)\./g;
  let m;
  while ((m = re.exec(adaptation)) !== null) {
    const ageMin = Number(m[1]);
    const ageMax = m[2] !== undefined ? Number(m[2]) : undefined;
    const text = m[3].trim();
    if (!/^\d/.test(text) && !/\d/.test(text) && text.length > 40) continue;
    out.push({ ageMin, ...(ageMax !== undefined ? { ageMax } : {}), text });
  }
  const adult = adaptation.match(/Adulte : ([^.]+)\./);
  if (adult) out.push({ ageMin: 18, text: adult[1].trim() });
  return out;
}

const byCategory = challenges.reduce((acc, c) => ({ ...acc, [c.category]: (acc[c.category] ?? 0) + 1 }), {});
const bank = {
  $comment:
    "Banque canonique V1 des Défis famille, importée depuis le PDF de conception (données, jamais de logique). Sélection par rotation déterministe cachée (jamais de hasard). Les défis religieux ne portent AUCUN texte religieux : ils référencent uniquement du contenu déjà validé (`contentRef`) et ne sont servis que s'il existe. Contact = consentement obligatoire, catégorie désactivable. Refus = 0 Kounouz, aucune autre pénalité.",
  version: 1,
  toggles: {
    movement: ["movement"],
    fun: ["animals"],
    family: ["family", "solidarity"],
    ohNo: ["oh_no"],
    memoryLogic: ["memory", "reflection", "logic", "observation", "language", "maths", "geography"],
    arabic: ["arabic"],
    religion: ["religion"],
    boss: ["boss"],
  },
  challenges,
};
writeFileSync(output, JSON.stringify(bank, null, 2) + "\n");
console.log(`défis : ${challenges.length}`, JSON.stringify(byCategory));
console.log(`OH NON : ${challenges.filter((c) => c.ohNo).length}, boss : ${challenges.filter((c) => c.boss).length}, contact : ${challenges.filter((c) => c.consentRequired).length}, contenu validé requis : ${challenges.filter((c) => c.contentRef).length}`);
console.log(`variantes d'âge : ${challenges.filter((c) => c.variants.length > 0).length} défis`);
