import type { Bilingual } from "@/core/content/types";
import { pickInRange } from "./sequence";

/**
 * LES 30 MODÈLES PÉDAGOGIQUES VALIDÉS des mathématiques Kounouzi.
 *
 * Chaque modèle est une SITUATION, jamais une table à réciter : recevoir,
 * dépenser, comparer, partager, lire l'heure, tenir un budget, calculer un
 * prix unitaire, un pourcentage. La compétence travaillée est portée par
 * `knowledgeNodeId` ; plusieurs modèles peuvent viser la même compétence.
 *
 * Deux régimes :
 * - `static` : les nombres SONT la démonstration, ils ne varient jamais
 *   (une remise qui ne revient pas au prix de départ, une comparaison de
 *   prix unitaire dont la décimale est le point d'enseignement) ;
 * - `parametric` : les nombres varient sans changer la compétence. Les
 *   valeurs sont produites par un PARCOURS DÉTERMINISTE d'intervalle
 *   (`pickInRange`, jamais un tirage aléatoire), et construites de façon que le
 *   résultat tombe toujours juste : une soustraction ne passe jamais sous
 *   zéro, une division ne laisse jamais de reste, un pourcentage porte sur
 *   un montant qui le rend exact.
 *
 * Les bornes numériques par difficulté sont pédagogiques (`MATHS_BOUNDS`),
 * sans aucun rapport avec l'économie du plateau.
 */

export const MATHS_MODEL_KINDS = ["static", "parametric"] as const;
export type MathsModelKind = (typeof MATHS_MODEL_KINDS)[number];

export interface MathsText {
  readonly prompt: Bilingual;
  readonly answer: Bilingual;
  readonly explanation: Bilingual;
}

export type MathsParams = Readonly<Record<string, number>>;

export interface MathsModel {
  /** Identifiant stable du modèle validé (`MATH-001` … `MATH-030`). */
  readonly id: string;
  readonly difficulty: number;
  /** Compétence travaillée, suivie par le Learning Engine. Partagée par plusieurs modèles quand c'est la même. */
  readonly knowledgeNodeId: string;
  readonly kind: MathsModelKind;
  /** Valeurs instanciées pour cette variation (compteur, jamais un tirage). */
  values(variation: number): MathsParams;
  /** Énoncé, réponse et explication, FR et AR, à partir des valeurs. */
  render(params: MathsParams): MathsText;
}

/** Bornes pédagogiques par difficulté : plus grand nombre qu'un énoncé ou une réponse peut porter. */
export const MATHS_BOUNDS: Readonly<Record<number, number>> = { 1: 20, 2: 100, 3: 500, 4: 1000, 5: 1000 };

/** Définit un modèle en gardant ses paramètres typés ; l'unique conversion vit ici. */
function model<P extends MathsParams>(m: {
  readonly id: string;
  readonly difficulty: number;
  readonly knowledgeNodeId: string;
  readonly kind: MathsModelKind;
  readonly values: (variation: number) => P;
  readonly render: (params: P) => MathsText;
}): MathsModel {
  return { id: m.id, difficulty: m.difficulty, knowledgeNodeId: m.knowledgeNodeId, kind: m.kind, values: m.values, render: (params) => m.render(params as P) };
}

const kounouzFr = (n: number) => (n === 1 ? "1 Kounouz" : `${n} Kounouz`);
const kounouzAr = (n: number) => (n === 1 ? "كنز واحد" : n === 2 ? "كنزان" : n <= 10 ? `${n} كنوز` : `${n} كنزًا`);
/** Heure au format court : « 14 h », « 16 h 15 ». */
const heureFr = (h: number, m: number) => (m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`);
const heureAr = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;

/* ---------------------------------------------------------------------------
 * 5-6 ans — d1 / d2
 * ------------------------------------------------------------------------- */

const MATH_001 = model({
  id: "MATH-001",
  difficulty: 1,
  knowledgeNodeId: "maths.addition.simple",
  kind: "parametric",
  // a + b ≤ 20 par construction : a ≤ 12 et b ≤ 8.
  values: (v) => ({ a: pickInRange(2, 12, v), b: pickInRange(1, 8, v, 3) }),
  render: ({ a, b }) => ({
    prompt: { fr: `Tu as ${kounouzFr(a)}. On t'en donne ${b}. Combien en as-tu maintenant ?`, ar: `معك ${kounouzAr(a)} وأعطاك أحدهم ${b}. كم صار معك؟` },
    answer: { fr: kounouzFr(a + b), ar: kounouzAr(a + b) },
    explanation: { fr: `${a} + ${b} = ${a + b}. Quand on reçoit de l'argent, on ajoute.`, ar: `${a} + ${b} = ${a + b}. عندما نأخذ مالًا نضيفه.` },
  }),
});

const MATH_002 = model({
  id: "MATH-002",
  difficulty: 1,
  knowledgeNodeId: "maths.soustraction.reste",
  kind: "parametric",
  // La dépense reste strictement inférieure au total : le reste n'est jamais négatif.
  values: (v) => {
    const total = pickInRange(6, 20, v);
    return { total, depense: pickInRange(1, total - 1, v, 2) };
  },
  render: ({ total, depense }) => ({
    prompt: { fr: `Tu as ${kounouzFr(total)}. Tu en dépenses ${depense}. Combien reste-t-il ?`, ar: `معك ${kounouzAr(total)} وأنفقت ${depense}. كم بقي؟` },
    answer: { fr: kounouzFr(total - depense), ar: kounouzAr(total - depense) },
    explanation: { fr: `${total} − ${depense} = ${total - depense}. Quand on dépense, on retire.`, ar: `${total} − ${depense} = ${total - depense}. عندما ننفق نطرح.` },
  }),
});

const MATH_003 = model({
  id: "MATH-003",
  difficulty: 1,
  knowledgeNodeId: "maths.comparaison",
  kind: "parametric",
  // Les deux quantités diffèrent toujours : la comparaison a une réponse.
  values: (v) => {
    const lina = pickInRange(3, 20, v);
    const brut = pickInRange(1, 20, v, 5);
    return { lina, adam: brut === lina ? (lina === 20 ? lina - 1 : lina + 1) : brut };
  },
  render: ({ lina, adam }) => {
    const plus = lina > adam;
    const [grand, petit] = plus ? [lina, adam] : [adam, lina];
    return {
      prompt: { fr: `Lina a ${kounouzFr(lina)} et Adam en a ${adam}. Qui en a le plus ?`, ar: `مع لينا ${kounouzAr(lina)} ومع آدم ${adam}. من معه أكثر؟` },
      answer: { fr: plus ? "Lina." : "Adam.", ar: plus ? "لينا." : "آدم." },
      explanation: { fr: `${grand} est plus grand que ${petit}.`, ar: `${grand} أكبر من ${petit}.` },
    };
  },
});

const MATH_004 = model({
  id: "MATH-004",
  difficulty: 1,
  knowledgeNodeId: "maths.correspondance",
  kind: "parametric",
  values: (v) => ({ joueurs: pickInRange(2, 6, v) }),
  render: ({ joueurs }) => ({
    prompt: { fr: `Il y a ${joueurs} joueurs. Chacun reçoit 1 carte. Combien faut-il de cartes ?`, ar: `هناك ${joueurs} لاعبين، وكل واحد يأخذ بطاقة واحدة. كم بطاقة نحتاج؟` },
    answer: { fr: `${joueurs} cartes.`, ar: `${joueurs} بطاقات.` },
    explanation: { fr: `Une carte pour chacun des ${joueurs} joueurs donne ${joueurs} cartes.`, ar: `بطاقة واحدة لكل واحد من ${joueurs} لاعبين تعطي ${joueurs} بطاقات.` },
  }),
});

const MATH_005 = model({
  id: "MATH-005",
  difficulty: 2,
  knowledgeNodeId: "maths.complement",
  kind: "parametric",
  values: (v) => {
    const besoin = pickInRange(10, 40, v);
    return { besoin, possede: pickInRange(1, besoin - 1, v, 4) };
  },
  render: ({ besoin, possede }) => ({
    prompt: { fr: `Tu as ${kounouzFr(possede)}. Il te faut ${kounouzFr(besoin)}. Combien te manque-t-il ?`, ar: `معك ${kounouzAr(possede)} وتحتاج إلى ${kounouzAr(besoin)}. كم ينقصك؟` },
    answer: { fr: kounouzFr(besoin - possede), ar: kounouzAr(besoin - possede) },
    explanation: { fr: `${possede} + ${besoin - possede} = ${besoin}.`, ar: `${possede} + ${besoin - possede} = ${besoin}، فالفرق هو ما ينقصك.` },
  }),
});

const MATH_006 = model({
  id: "MATH-006",
  difficulty: 2,
  knowledgeNodeId: "maths.addition.simple",
  kind: "parametric",
  values: (v) => ({ pieces: pickInRange(2, 9, v) }),
  render: ({ pieces }) => ({
    prompt: { fr: `Deux enfants ont chacun ${pieces} pièces. Combien ont-ils de pièces ensemble ?`, ar: `مع طفلين ${pieces} قطع لكل واحد. كم معهما معًا؟` },
    answer: { fr: `${pieces * 2} pièces.`, ar: `${pieces * 2} قطع.` },
    explanation: { fr: `${pieces} + ${pieces} = ${pieces * 2}.`, ar: `${pieces} + ${pieces} = ${pieces * 2}، نجمع ما مع الطفلين.` },
  }),
});

/* ---------------------------------------------------------------------------
 * 7-8 ans — d2 / d3
 * ------------------------------------------------------------------------- */

const MATH_007 = model({
  id: "MATH-007",
  difficulty: 2,
  knowledgeNodeId: "maths.soustraction.reste",
  kind: "parametric",
  values: (v) => {
    const total = pickInRange(15, 60, v);
    return { total, achat: pickInRange(3, total - 1, v, 5) };
  },
  render: ({ total, achat }) => ({
    prompt: { fr: `Tu as ${kounouzFr(total)}. Tu achètes quelque chose à ${achat}. Combien te reste-t-il ?`, ar: `معك ${kounouzAr(total)} واشتريت شيئًا بـ ${achat}. كم بقي معك؟` },
    answer: { fr: kounouzFr(total - achat), ar: kounouzAr(total - achat) },
    explanation: { fr: `${total} − ${achat} = ${total - achat}.`, ar: `${total} − ${achat} = ${total - achat}، نطرح ثمن الشراء.` },
  }),
});

const MATH_008 = model({
  id: "MATH-008",
  difficulty: 2,
  knowledgeNodeId: "maths.multiplication.total",
  kind: "parametric",
  values: (v) => ({ joueurs: pickInRange(2, 6, v), montant: pickInRange(3, 12, v, 2) }),
  render: ({ joueurs, montant }) => ({
    prompt: { fr: `${joueurs} joueurs donnent chacun ${kounouzFr(montant)}. Combien cela fait-il en tout ?`, ar: `${joueurs} لاعبين دفع كل واحد ${kounouzAr(montant)}. كم المجموع؟` },
    answer: { fr: kounouzFr(joueurs * montant), ar: kounouzAr(joueurs * montant) },
    explanation: {
      fr: `${Array.from({ length: joueurs }, () => String(montant)).join(" + ")} = ${joueurs * montant}, donc ${joueurs} × ${montant} = ${joueurs * montant}.`,
      ar: `${Array.from({ length: joueurs }, () => String(montant)).join(" + ")} = ${joueurs * montant}، أي ${joueurs} × ${montant} = ${joueurs * montant}.`,
    },
  }),
});

const MATH_009 = model({
  id: "MATH-009",
  difficulty: 2,
  knowledgeNodeId: "maths.division.partage",
  kind: "parametric",
  // Le total est construit comme enfants × part : la division tombe toujours juste.
  values: (v) => {
    const enfants = pickInRange(2, 6, v);
    const part = pickInRange(2, 8, v, 3);
    return { enfants, part, total: enfants * part };
  },
  render: ({ enfants, part, total }) => ({
    prompt: { fr: `${total} fruits sont partagés également entre ${enfants} enfants. Combien chacun en reçoit-il ?`, ar: `${total} ثمرة تُقسم بالتساوي على ${enfants} أطفال. كم ينال كل واحد؟` },
    answer: { fr: `${part}.`, ar: `${part}.` },
    explanation: { fr: `${total} ÷ ${enfants} = ${part}.`, ar: `${total} ÷ ${enfants} = ${part}، نقسم بالتساوي.` },
  }),
});

const MATH_010 = model({
  id: "MATH-010",
  difficulty: 2,
  knowledgeNodeId: "maths.heure.ajout",
  kind: "parametric",
  values: (v) => ({ heure: pickInRange(8, 17, v), ajout: pickInRange(1, 4, v, 2) }),
  render: ({ heure, ajout }) => ({
    prompt: { fr: `Il est ${heureFr(heure, 0)}. Une activité commence dans ${ajout === 1 ? "1 heure" : `${ajout} heures`}. À quelle heure commence-t-elle ?`, ar: `الساعة ${heureAr(heure, 0)} ويبدأ نشاط بعد ${ajout === 1 ? "ساعة" : ajout === 2 ? "ساعتين" : `${ajout} ساعات`}. متى يبدأ؟` },
    answer: { fr: heureFr(heure + ajout, 0), ar: heureAr(heure + ajout, 0) },
    explanation: { fr: `${heure} + ${ajout} = ${heure + ajout}.`, ar: `${heure} + ${ajout} = ${heure + ajout}، نضيف الساعات.` },
  }),
});

const MATH_011 = model({
  id: "MATH-011",
  difficulty: 3,
  knowledgeNodeId: "maths.depenses.cumul",
  kind: "parametric",
  // Le budget est bâti à partir des dépenses et du reste voulu : le reste est toujours positif.
  values: (v) => {
    const d1 = pickInRange(5, 40, v);
    const d2 = pickInRange(5, 40, v, 3);
    const reste = pickInRange(5, 60, v, 7);
    return { d1, d2, reste, total: d1 + d2 + reste };
  },
  render: ({ d1, d2, reste, total }) => ({
    prompt: { fr: `Tu avais ${kounouzFr(total)}. Tu dépenses ${d1} puis ${d2}. Combien reste-t-il ?`, ar: `كان معك ${kounouzAr(total)} فأنفقت ${d1} ثم ${d2}. كم بقي؟` },
    answer: { fr: kounouzFr(reste), ar: kounouzAr(reste) },
    explanation: { fr: `${d1} + ${d2} = ${d1 + d2}, puis ${total} − ${d1 + d2} = ${reste}.`, ar: `${d1} + ${d2} = ${d1 + d2}، ثم ${total} − ${d1 + d2} = ${reste}.` },
  }),
});

const MATH_012 = model({
  id: "MATH-012",
  difficulty: 3,
  knowledgeNodeId: "maths.multiplication.total",
  kind: "parametric",
  values: (v) => ({ objets: pickInRange(3, 8, v), prix: pickInRange(4, 15, v, 2) }),
  render: ({ objets, prix }) => ({
    prompt: { fr: `Une famille achète ${objets} objets à ${kounouzFr(prix)} chacun. Quel est le prix total ?`, ar: `أسرة تشتري ${objets} أشياء ثمن كل واحد ${kounouzAr(prix)}. كم الثمن الإجمالي؟` },
    answer: { fr: kounouzFr(objets * prix), ar: kounouzAr(objets * prix) },
    explanation: { fr: `${objets} × ${prix} = ${objets * prix}.`, ar: `${objets} × ${prix} = ${objets * prix}، نضرب العدد في الثمن.` },
  }),
});

/* ---------------------------------------------------------------------------
 * 9-10 ans — d2 / d3
 * ------------------------------------------------------------------------- */

const MATH_013 = model({
  id: "MATH-013",
  difficulty: 2,
  knowledgeNodeId: "maths.soustraction.reste",
  kind: "parametric",
  values: (v) => {
    const total = pickInRange(50, 100, v);
    return { total, depense: pickInRange(10, total - 10, v, 3) };
  },
  render: ({ total, depense }) => ({
    prompt: { fr: `Tu as ${kounouzFr(total)}. Tu dépenses ${depense}. Combien reste-t-il ?`, ar: `معك ${kounouzAr(total)} وأنفقت ${depense}. كم بقي؟` },
    answer: { fr: kounouzFr(total - depense), ar: kounouzAr(total - depense) },
    explanation: { fr: `${total} − ${depense} = ${total - depense}.`, ar: `${total} − ${depense} = ${total - depense}، نطرح ما أنفقناه.` },
  }),
});

const MATH_014 = model({
  id: "MATH-014",
  difficulty: 3,
  knowledgeNodeId: "maths.multiplication.total",
  kind: "parametric",
  values: (v) => ({ objets: pickInRange(2, 6, v), prix: pickInRange(10, 40, v, 3) }),
  render: ({ objets, prix }) => ({
    prompt: { fr: `Tu achètes ${objets} objets à ${kounouzFr(prix)} chacun. Combien paies-tu ?`, ar: `تشتري ${objets} أشياء ثمن كل واحد ${kounouzAr(prix)}. كم تدفع؟` },
    answer: { fr: kounouzFr(objets * prix), ar: kounouzAr(objets * prix) },
    explanation: { fr: `${objets} × ${prix} = ${objets * prix}.`, ar: `${objets} × ${prix} = ${objets * prix}، نضرب العدد في الثمن.` },
  }),
});

const MATH_015 = model({
  id: "MATH-015",
  difficulty: 3,
  knowledgeNodeId: "maths.depenses.cumul",
  kind: "parametric",
  values: (v) => {
    const livre = pickInRange(10, 60, v);
    const repas = pickInRange(10, 60, v, 5);
    const reste = pickInRange(5, 80, v, 9);
    return { livre, repas, reste, budget: livre + repas + reste };
  },
  render: ({ livre, repas, reste, budget }) => ({
    prompt: { fr: `Tu as ${kounouzFr(budget)}. Tu veux acheter un livre à ${livre} et un repas à ${repas}. Combien te restera-t-il ?`, ar: `معك ${kounouzAr(budget)} وتريد كتابًا بـ ${livre} ووجبة بـ ${repas}. كم سيبقى لك؟` },
    answer: { fr: kounouzFr(reste), ar: kounouzAr(reste) },
    explanation: { fr: `${livre} + ${repas} = ${livre + repas}, puis ${budget} − ${livre + repas} = ${reste}.`, ar: `${livre} + ${repas} = ${livre + repas}، ثم ${budget} − ${livre + repas} = ${reste}.` },
  }),
});

const MATH_016 = model({
  id: "MATH-016",
  difficulty: 3,
  knowledgeNodeId: "maths.duree.minutes",
  kind: "parametric",
  // La durée franchit TOUJOURS l'heure : c'est la compétence visée.
  values: (v) => {
    const heure = pickInRange(9, 19, v);
    const avant = pickInRange(2, 6, v, 3) * 5; // 10 à 30 minutes jusqu'à l'heure pleine
    const apres = pickInRange(1, 6, v, 5) * 5; // 5 à 30 minutes après l'heure pleine
    return { heure, minute: 60 - avant, duree: avant + apres, finHeure: heure + 1, finMinute: apres };
  },
  render: ({ heure, minute, duree, finHeure, finMinute }) => ({
    prompt: { fr: `Une activité commence à ${heureFr(heure, minute)} et dure ${duree} minutes. À quelle heure finit-elle ?`, ar: `يبدأ نشاط الساعة ${heureAr(heure, minute)} ويدوم ${duree} دقيقة. متى ينتهي؟` },
    answer: { fr: heureFr(finHeure, finMinute), ar: heureAr(finHeure, finMinute) },
    explanation: {
      fr: `De ${heureFr(heure, minute)} à ${heureFr(finHeure, 0)} il y a ${60 - minute} minutes, il en reste ${finMinute} : l'activité finit à ${heureFr(finHeure, finMinute)}.`,
      ar: `من ${heureAr(heure, minute)} إلى ${heureAr(finHeure, 0)} ${60 - minute} دقيقة، ويبقى ${finMinute} دقيقة، فينتهي في ${heureAr(finHeure, finMinute)}.`,
    },
  }),
});

const MATH_017 = model({
  id: "MATH-017",
  difficulty: 3,
  knowledgeNodeId: "maths.prix-unitaire",
  kind: "parametric",
  values: (v) => {
    const objets = pickInRange(2, 8, v);
    const unitaire = pickInRange(3, 25, v, 3);
    return { objets, unitaire, total: objets * unitaire };
  },
  render: ({ objets, unitaire, total }) => ({
    prompt: { fr: `Un paquet de ${objets} objets coûte ${kounouzFr(total)}. Combien coûte un objet ?`, ar: `علبة فيها ${objets} أشياء ثمنها ${kounouzAr(total)}. كم ثمن الشيء الواحد؟` },
    answer: { fr: kounouzFr(unitaire), ar: kounouzAr(unitaire) },
    explanation: { fr: `${total} ÷ ${objets} = ${unitaire}.`, ar: `${total} ÷ ${objets} = ${unitaire}، نقسم الثمن على العدد.` },
  }),
});

const MATH_018 = model({
  id: "MATH-018",
  difficulty: 3,
  knowledgeNodeId: "maths.epargne.cumul",
  kind: "parametric",
  values: (v) => ({ parSemaine: pickInRange(5, 40, v), semaines: pickInRange(3, 8, v, 2) }),
  render: ({ parSemaine, semaines }) => ({
    prompt: { fr: `Tu économises ${kounouzFr(parSemaine)} par semaine. Combien auras-tu économisé après ${semaines} semaines ?`, ar: `تدّخر ${kounouzAr(parSemaine)} كل أسبوع. كم تكون قد ادّخرت بعد ${semaines} أسابيع؟` },
    answer: { fr: kounouzFr(parSemaine * semaines), ar: kounouzAr(parSemaine * semaines) },
    explanation: { fr: `${semaines} × ${parSemaine} = ${parSemaine * semaines}.`, ar: `${semaines} × ${parSemaine} = ${parSemaine * semaines}، نضرب المبلغ في عدد الأسابيع.` },
  }),
});

/* ---------------------------------------------------------------------------
 * 11-12 ans — d3 / d4
 * ------------------------------------------------------------------------- */

const MATH_019 = model({
  id: "MATH-019",
  difficulty: 3,
  knowledgeNodeId: "maths.depenses.cumul",
  kind: "parametric",
  values: (v) => {
    const a1 = pickInRange(15, 80, v);
    const a2 = pickInRange(15, 80, v, 4);
    const a3 = pickInRange(15, 80, v, 9);
    const reste = pickInRange(10, 100, v, 13);
    return { a1, a2, a3, reste, budget: a1 + a2 + a3 + reste };
  },
  render: ({ a1, a2, a3, reste, budget }) => ({
    prompt: { fr: `Tu as ${kounouzFr(budget)}. Tu fais trois achats : ${a1}, ${a2} et ${a3}. Combien reste-t-il ?`, ar: `معك ${kounouzAr(budget)} واشتريت ثلاثة أشياء: ${a1} و${a2} و${a3}. كم بقي؟` },
    answer: { fr: kounouzFr(reste), ar: kounouzAr(reste) },
    explanation: { fr: `${a1} + ${a2} + ${a3} = ${a1 + a2 + a3} ; ${budget} − ${a1 + a2 + a3} = ${reste}.`, ar: `${a1} + ${a2} + ${a3} = ${a1 + a2 + a3}، و${budget} − ${a1 + a2 + a3} = ${reste}.` },
  }),
});

const MATH_020 = model({
  id: "MATH-020",
  difficulty: 3,
  knowledgeNodeId: "maths.prix-unitaire",
  kind: "parametric",
  values: (v) => {
    const articles = pickInRange(3, 9, v);
    const unitaire = pickInRange(2, 12, v, 2);
    return { articles, unitaire, total: articles * unitaire };
  },
  render: ({ articles, unitaire, total }) => ({
    prompt: { fr: `Un paquet de ${articles} articles coûte ${kounouzFr(total)}. Quel est le prix d'un article ?`, ar: `علبة فيها ${articles} قطع ثمنها ${kounouzAr(total)}. كم ثمن القطعة؟` },
    answer: { fr: kounouzFr(unitaire), ar: kounouzAr(unitaire) },
    explanation: { fr: `${total} ÷ ${articles} = ${unitaire}.`, ar: `${total} ÷ ${articles} = ${unitaire}، نقسم الثمن على عدد القطع.` },
  }),
});

const MATH_021 = model({
  id: "MATH-021",
  difficulty: 4,
  knowledgeNodeId: "maths.pourcentage.remise",
  kind: "parametric",
  // Prix multiple de 100 et taux choisi : la remise tombe toujours sur un entier.
  values: (v) => ({ prix: pickInRange(1, 8, v) * 100, taux: [10, 20, 25, 50][pickInRange(0, 3, v, 2)] ?? 20 }),
  render: ({ prix, taux }) => {
    const remise = (prix * taux) / 100;
    return {
      prompt: { fr: `Un objet coûte ${kounouzFr(prix)} et bénéficie d'une réduction de ${taux} %. Quel est son nouveau prix ?`, ar: `سلعة ثمنها ${kounouzAr(prix)} عليها تخفيض ${taux}٪. ما ثمنها الجديد؟` },
      answer: { fr: kounouzFr(prix - remise), ar: kounouzAr(prix - remise) },
      explanation: { fr: `${taux} % de ${prix} = ${remise} ; ${prix} − ${remise} = ${prix - remise}.`, ar: `${taux}٪ من ${prix} = ${remise}، و${prix} − ${remise} = ${prix - remise}.` },
    };
  },
});

const MATH_022 = model({
  id: "MATH-022",
  difficulty: 4,
  knowledgeNodeId: "maths.budget.duree",
  kind: "parametric",
  values: (v) => {
    const parTour = pickInRange(1, 6, v) * 10;
    const tours = pickInRange(3, 8, v, 2);
    return { parTour, tours, reserve: parTour * tours };
  },
  render: ({ parTour, tours, reserve }) => ({
    prompt: { fr: `Tu possèdes ${kounouzFr(reserve)} et tu dépenses ${kounouzFr(parTour)} par tour. Sans nouveau gain, combien de tours peux-tu payer ?`, ar: `معك ${kounouzAr(reserve)} وتنفق ${kounouzAr(parTour)} في كل دورة. من دون ربح جديد، كم دورة تستطيع أن تدفع؟` },
    answer: { fr: `${tours} tours.`, ar: `${tours} دورات.` },
    explanation: { fr: `${reserve} ÷ ${parTour} = ${tours}.`, ar: `${reserve} ÷ ${parTour} = ${tours}، نقسم الاحتياط على نفقة الدورة.` },
  }),
});

/** STATIQUE : la décimale du prix unitaire (2,5) est le point d'enseignement. */
const MATH_023 = model({
  id: "MATH-023",
  difficulty: 4,
  knowledgeNodeId: "maths.prix-unitaire.comparaison",
  kind: "static",
  values: () => ({ uniteA: 4, prixA: 12, uniteB: 6, prixB: 15 }),
  render: () => ({
    prompt: { fr: "Deux paquets contiennent le même produit. 4 unités coûtent 12 Kounouz et 6 unités coûtent 15. Lequel est moins cher par unité ?", ar: "علبتان فيهما المنتج نفسه: 4 وحدات بـ 12 كنزًا، و6 وحدات بـ 15. أيّهما أرخص للوحدة؟" },
    answer: { fr: "Le paquet de 6.", ar: "علبة الستّ." },
    explanation: { fr: "12 ÷ 4 = 3 ; 15 ÷ 6 = 2,5.", ar: "12 ÷ 4 = 3، و15 ÷ 6 = 2.5." },
  }),
});

const MATH_024 = model({
  id: "MATH-024",
  difficulty: 4,
  knowledgeNodeId: "maths.epargne.objectif",
  kind: "parametric",
  values: (v) => {
    const semaines = pickInRange(4, 10, v);
    const parSemaine = pickInRange(1, 8, v, 3) * 10;
    return { semaines, parSemaine, objectif: semaines * parSemaine };
  },
  render: ({ semaines, parSemaine, objectif }) => ({
    prompt: { fr: `Tu veux économiser ${kounouzFr(objectif)} en ${semaines} semaines. Combien dois-tu mettre de côté chaque semaine ?`, ar: `تريد ادّخار ${kounouzAr(objectif)} في ${semaines} أسابيع. كم تضع جانبًا كل أسبوع؟` },
    answer: { fr: kounouzFr(parSemaine), ar: kounouzAr(parSemaine) },
    explanation: { fr: `${objectif} ÷ ${semaines} = ${parSemaine}.`, ar: `${objectif} ÷ ${semaines} = ${parSemaine}، نقسم الهدف على عدد الأسابيع.` },
  }),
});

/* ---------------------------------------------------------------------------
 * 13 ans et plus — d4 / d5
 * ------------------------------------------------------------------------- */

const MATH_025 = model({
  id: "MATH-025",
  difficulty: 4,
  knowledgeNodeId: "maths.pourcentage.hausse",
  kind: "parametric",
  values: (v) => ({ prix: pickInRange(1, 6, v) * 100, taux: [10, 20, 25][pickInRange(0, 2, v, 2)] ?? 10 }),
  render: ({ prix, taux }) => {
    const hausse = (prix * taux) / 100;
    return {
      prompt: { fr: `Un prix de ${kounouzFr(prix)} augmente de ${taux} %. Quel est le nouveau prix ?`, ar: `ثمن ${kounouzAr(prix)} ارتفع بنسبة ${taux}٪. ما الثمن الجديد؟` },
      answer: { fr: kounouzFr(prix + hausse), ar: kounouzAr(prix + hausse) },
      explanation: { fr: `${taux} % de ${prix} = ${hausse} ; ${prix} + ${hausse} = ${prix + hausse}.`, ar: `${taux}٪ من ${prix} = ${hausse}، و${prix} + ${hausse} = ${prix + hausse}.` },
    };
  },
});

/** STATIQUE : la démonstration EST ces nombres, +20 % puis −20 % ramène 100 à 96. */
const MATH_026 = model({
  id: "MATH-026",
  difficulty: 5,
  knowledgeNodeId: "maths.pourcentage.successif",
  kind: "static",
  values: () => ({ depart: 100, taux: 20, apresHausse: 120, apresBaisse: 96 }),
  render: () => ({
    prompt: { fr: "Un prix augmente de 20 %, puis baisse de 20 %. Revient-il à son prix initial ?", ar: "ارتفع ثمن بنسبة 20٪ ثم انخفض بنسبة 20٪. هل يعود إلى ثمنه الأول؟" },
    answer: { fr: "Non. Il finit 4 % plus bas.", ar: "لا، يصير أقلّ بنسبة 4٪." },
    explanation: { fr: "100 devient 120. Une baisse de 20 % de 120 enlève 24 : il reste 96.", ar: "يصير 100 مئةً وعشرين، وخصم 20٪ من 120 يساوي 24، فيبقى 96." },
  }),
});

/** STATIQUE : la décimale du prix unitaire (5,5) est le point d'enseignement. */
const MATH_027 = model({
  id: "MATH-027",
  difficulty: 5,
  knowledgeNodeId: "maths.prix-unitaire.comparaison",
  kind: "static",
  values: () => ({ uniteA: 5, prixA: 30, uniteB: 8, prixB: 44 }),
  render: () => ({
    prompt: { fr: "Tu peux acheter 5 unités pour 30 Kounouz ou 8 unités pour 44. Quelle offre coûte le moins cher par unité ?", ar: "تستطيع شراء 5 وحدات بـ 30 كنزًا أو 8 وحدات بـ 44. أيّ العرضين أرخص للوحدة؟" },
    answer: { fr: "8 unités pour 44 Kounouz.", ar: "8 وحدات بـ 44 كنزًا." },
    explanation: { fr: "30 ÷ 5 = 6 ; 44 ÷ 8 = 5,5.", ar: "30 ÷ 5 = 6، و44 ÷ 8 = 5.5." },
  }),
});

const MATH_028 = model({
  id: "MATH-028",
  difficulty: 5,
  knowledgeNodeId: "maths.division.partage-exact",
  kind: "parametric",
  values: (v) => {
    const personnes = pickInRange(3, 8, v);
    const part = pickInRange(5, 24, v, 3) * 5;
    return { personnes, part, depense: personnes * part };
  },
  render: ({ personnes, part, depense }) => ({
    prompt: { fr: `Une dépense de ${kounouzFr(depense)} est partagée entre ${personnes} personnes. Combien paie chacune ?`, ar: `نفقة قدرها ${kounouzAr(depense)} تُقسم على ${personnes} أشخاص. كم يدفع كل واحد؟` },
    answer: { fr: kounouzFr(part), ar: kounouzAr(part) },
    explanation: { fr: `${depense} ÷ ${personnes} = ${part}.`, ar: `${depense} ÷ ${personnes} = ${part}، نقسم النفقة على عدد الأشخاص.` },
  }),
});

const MATH_029 = model({
  id: "MATH-029",
  difficulty: 5,
  knowledgeNodeId: "maths.pourcentage.reste",
  kind: "parametric",
  // Total multiple de 100 et taux choisi : le reste et la dépense sont entiers.
  values: (v) => ({ total: pickInRange(1, 9, v) * 100, reste: [20, 25, 40, 50, 60, 75][pickInRange(0, 5, v, 2)] ?? 35 }),
  render: ({ total, reste }) => {
    const garde = (total * reste) / 100;
    return {
      prompt: { fr: `Tu as ${kounouzFr(total)}. Après un achat, il te reste ${reste} % de ton argent. Combien as-tu dépensé ?`, ar: `معك ${kounouzAr(total)}، وبعد شراء بقي لك ${reste}٪ من مالك. كم أنفقت؟` },
      answer: { fr: kounouzFr(total - garde), ar: kounouzAr(total - garde) },
      explanation: { fr: `${reste} % de ${total} = ${garde}. Donc ${total} − ${garde} = ${total - garde}.`, ar: `${reste}٪ من ${total} = ${garde}، و${total} − ${garde} = ${total - garde}.` },
    };
  },
});

const MATH_030 = model({
  id: "MATH-030",
  difficulty: 5,
  knowledgeNodeId: "maths.solde.evolution",
  kind: "parametric",
  // L'écart est choisi d'abord : le gain dépasse toujours la dépense.
  values: (v) => {
    const ecart = pickInRange(1, 6, v) * 10;
    const depense = pickInRange(3, 12, v, 3) * 10;
    return { ecart, depense, gain: depense + ecart, tours: pickInRange(3, 8, v, 5) };
  },
  render: ({ ecart, depense, gain, tours }) => ({
    prompt: { fr: `Tu gagnes ${kounouzFr(gain)} par tour mais dépenses en moyenne ${depense}. Si rien d'autre ne change, de combien ta réserve augmente-t-elle après ${tours} tours ?`, ar: `تربح ${kounouzAr(gain)} في كل دورة وتنفق ${depense} في المتوسط. إذا لم يتغيّر شيء، بكم يزيد احتياطك بعد ${tours} دورات؟` },
    answer: { fr: kounouzFr(ecart * tours), ar: kounouzAr(ecart * tours) },
    explanation: { fr: `${gain} − ${depense} = ${ecart} par tour ; ${ecart} × ${tours} = ${ecart * tours}.`, ar: `${gain} − ${depense} = ${ecart} في الدورة، و${ecart} × ${tours} = ${ecart * tours}.` },
  }),
});

/** Les 30 modèles validés, dans l'ordre de leur identifiant. */
export const MATHS_MODELS: readonly MathsModel[] = [
  MATH_001,
  MATH_002,
  MATH_003,
  MATH_004,
  MATH_005,
  MATH_006,
  MATH_007,
  MATH_008,
  MATH_009,
  MATH_010,
  MATH_011,
  MATH_012,
  MATH_013,
  MATH_014,
  MATH_015,
  MATH_016,
  MATH_017,
  MATH_018,
  MATH_019,
  MATH_020,
  MATH_021,
  MATH_022,
  MATH_023,
  MATH_024,
  MATH_025,
  MATH_026,
  MATH_027,
  MATH_028,
  MATH_029,
  MATH_030,
];

export const mathsModelById = (id: string): MathsModel | undefined => MATHS_MODELS.find((m) => m.id === id);

/** Modèles d'une difficulté donnée, ordre stable. */
export const mathsModelsAt = (difficulty: number): readonly MathsModel[] => MATHS_MODELS.filter((m) => m.difficulty === difficulty);
