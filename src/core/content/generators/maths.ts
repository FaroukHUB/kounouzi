import type { Bilingual, QuestionInstance, QuestionRequest } from "@/core/content/types";
import { pickInRange } from "./sequence";

export const MATHS_CATEGORY_ID = "maths";
const VERSION = 1;

interface Ranges {
  readonly a: readonly [number, number];
  readonly b: readonly [number, number];
}

/** Plages par difficulté (1..5). Données de génération, ajustables sans toucher au moteur. */
const ADDITION: readonly Ranges[] = [
  { a: [1, 9], b: [1, 9] },
  { a: [10, 49], b: [2, 30] },
  { a: [20, 199], b: [11, 99] },
  { a: [100, 999], b: [100, 999] },
  { a: [500, 9999], b: [250, 9999] },
];
const MULTIPLICATION: readonly Ranges[] = [
  { a: [1, 5], b: [1, 5] },
  { a: [2, 9], b: [2, 9] },
  { a: [3, 12], b: [3, 12] },
  { a: [11, 25], b: [2, 12] },
  { a: [12, 99], b: [3, 19] },
];
/** Division exacte : b (diviseur) et q (quotient) tirés du parcours, a = b × q. */
const DIVISION: readonly Ranges[] = [
  { a: [2, 5], b: [1, 5] },
  { a: [2, 9], b: [2, 9] },
  { a: [3, 12], b: [3, 12] },
  { a: [4, 15], b: [6, 25] },
  { a: [6, 25], b: [11, 60] },
];

export interface MathsQuestion {
  readonly generatorId: string;
  readonly knowledgeNodeId: string;
  readonly prompt: Bilingual;
  readonly answer: Bilingual;
  readonly explanation: Bilingual;
}

const level = (difficulty: number) => Math.min(5, Math.max(1, Math.round(difficulty))) - 1;
const n = (x: number) => String(x);

export function addition(difficulty: number, variation: number): MathsQuestion {
  const r = ADDITION[level(difficulty)]!;
  const a = pickInRange(r.a[0], r.a[1], variation);
  const b = pickInRange(r.b[0], r.b[1], variation, 3);
  const s = a + b;
  return {
    generatorId: "maths.addition",
    knowledgeNodeId: `maths.addition.d${level(difficulty) + 1}`,
    prompt: { fr: `${n(a)} + ${n(b)} = ?`, ar: `${n(a)} + ${n(b)} = ؟` },
    answer: { fr: n(s), ar: n(s) },
    explanation: { fr: `${n(a)} + ${n(b)} = ${n(s)} : on ajoute ${n(b)} à ${n(a)}.`, ar: `${n(a)} + ${n(b)} = ${n(s)}: نضيف ${n(b)} إلى ${n(a)}.` },
  };
}

export function subtraction(difficulty: number, variation: number): MathsQuestion {
  const r = ADDITION[level(difficulty)]!;
  const x = pickInRange(r.a[0], r.a[1], variation, 5);
  const y = pickInRange(r.b[0], r.b[1], variation, 1);
  const [a, b] = x >= y ? [x, y] : [y, x];
  const d = a - b;
  return {
    generatorId: "maths.subtraction",
    knowledgeNodeId: `maths.subtraction.d${level(difficulty) + 1}`,
    prompt: { fr: `${n(a)} − ${n(b)} = ?`, ar: `${n(a)} − ${n(b)} = ؟` },
    answer: { fr: n(d), ar: n(d) },
    explanation: { fr: `${n(a)} − ${n(b)} = ${n(d)} : on retire ${n(b)} de ${n(a)}.`, ar: `${n(a)} − ${n(b)} = ${n(d)}: نطرح ${n(b)} من ${n(a)} فيبقى ${n(d)}.` },
  };
}

export function multiplication(difficulty: number, variation: number): MathsQuestion {
  const r = MULTIPLICATION[level(difficulty)]!;
  const a = pickInRange(r.a[0], r.a[1], variation);
  const b = pickInRange(r.b[0], r.b[1], variation, 2);
  const p = a * b;
  return {
    generatorId: "maths.multiplication",
    knowledgeNodeId: `maths.multiplication.table-${n(Math.min(a, b))}`,
    prompt: { fr: `${n(a)} × ${n(b)} = ?`, ar: `${n(a)} × ${n(b)} = ؟` },
    answer: { fr: n(p), ar: n(p) },
    explanation: {
      fr: `${n(a)} × ${n(b)} = ${n(p)} : on additionne ${n(b)}, ${n(a)} fois.`,
      ar: `${n(a)} × ${n(b)} = ${n(p)}: نجمع ${n(b)} ${n(a)} مرات فنحصل على ${n(p)}.`,
    },
  };
}

export function division(difficulty: number, variation: number): MathsQuestion {
  const r = DIVISION[level(difficulty)]!;
  const b = pickInRange(r.a[0], r.a[1], variation, 4);
  const q = pickInRange(r.b[0], r.b[1], variation, 6);
  const a = b * q;
  return {
    generatorId: "maths.division",
    knowledgeNodeId: `maths.division.d${level(difficulty) + 1}`,
    prompt: { fr: `${n(a)} ÷ ${n(b)} = ?`, ar: `${n(a)} ÷ ${n(b)} = ؟` },
    answer: { fr: n(q), ar: n(q) },
    explanation: { fr: `${n(a)} ÷ ${n(b)} = ${n(q)} : ${n(q)} groupes de ${n(b)} font ${n(a)}.`, ar: `${n(a)} ÷ ${n(b)} = ${n(q)}: ${n(q)} مجموعات من ${n(b)} تعطي ${n(a)}.` },
  };
}

/** Opérations disponibles par difficulté : le parcours alterne entre elles de façon déterministe. */
const OPERATIONS_BY_LEVEL: readonly (readonly ((d: number, v: number) => MathsQuestion)[])[] = [
  [addition, subtraction],
  [addition, subtraction, multiplication],
  [multiplication, addition, division, subtraction],
  [multiplication, division, addition, subtraction],
  [multiplication, division, subtraction, addition],
];

export function generateMaths(request: QuestionRequest): QuestionInstance {
  const ops = OPERATIONS_BY_LEVEL[level(request.difficulty)]!;
  const op = ops[request.variation % ops.length]!;
  const q = op(request.difficulty, Math.floor(request.variation / ops.length));
  return {
    ref: { kind: "algorithmic", generatorId: q.generatorId, version: VERSION, variation: request.variation },
    categoryId: MATHS_CATEGORY_ID,
    knowledgeNodeId: q.knowledgeNodeId,
    difficulty: level(request.difficulty) + 1,
    audienceScope: "all",
    prompt: q.prompt,
    answer: q.answer,
    explanation: q.explanation,
    sources: [],
  };
}
