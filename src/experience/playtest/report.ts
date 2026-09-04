import type { GameEvent, GameState } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import { INTERACTION_KINDS, type InteractionKind, type PlaytestLog } from "./types";

export interface PlayerPlaytestStats {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly profileType: "child" | "adult";
  readonly questions: number;
  readonly correct: number;
  readonly partial: number;
  readonly incorrect: number;
  readonly duels: number;
  readonly duelsWon: number;
  readonly heritage: number;
  readonly solidarityActions: number;
  readonly money: number;
}

export interface InteractionTiming {
  readonly kind: InteractionKind;
  readonly count: number;
  /** Temps mural cumulé (ms) entre l'ouverture et la clôture de l'interaction. Approximatif. */
  readonly totalMs: number;
  readonly averageMs: number;
}

export interface PlaytestReport {
  readonly gameId: string;
  readonly status: GameState["status"];
  readonly activeSeconds: number;
  readonly wallSeconds: number;
  readonly turns: number;
  readonly counts: {
    readonly questions: number;
    readonly duels: number;
    readonly duelsChildAdult: number;
    readonly duelsWon: number;
    readonly duelsDrawn: number;
    readonly halts: number;
    readonly monumentsBought: number;
    readonly heritageVisits: number;
    readonly transfers: number;
    readonly treasures: number;
    readonly managementChoices: number;
    readonly solidarityActions: number;
    readonly collectiveEvents: number;
  };
  readonly players: readonly PlayerPlaytestStats[];
  readonly interactions: readonly InteractionTiming[];
  readonly journal: readonly string[];
}

const mmss = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Rapport de playtest : uniquement dérivé de l'état final et du journal d'événements. */
export function buildPlaytestReport(state: GameState, log: PlaytestLog): PlaytestReport {
  const events = log.entries.flatMap((e) => e.events);
  const name = (id: PlayerId) => state.players.find((p) => p.id === id)?.displayName ?? String(id);
  const type = (id: PlayerId) => state.players.find((p) => p.id === id)?.profileType;
  const of = <T extends GameEvent["type"]>(t: T) => events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === t);

  const duels = of("DuelResolved");
  const answers = of("AnswerRecorded");
  const scenarios = of("ScenarioTriggered");
  const collectiveKinds = new Set(["collective_fund", "aid"]);

  const players = state.players.map((p): PlayerPlaytestStats => {
    const mine = answers.filter((a) => a.playerId === p.id);
    return {
      playerId: p.id,
      displayName: p.displayName,
      profileType: p.profileType,
      questions: mine.length,
      correct: mine.filter((a) => a.outcome === "correct").length,
      partial: mine.filter((a) => a.outcome === "partial").length,
      incorrect: mine.filter((a) => a.outcome === "incorrect").length,
      duels: duels.filter((d) => d.challengerId === p.id || d.opponentId === p.id).length,
      duelsWon: duels.filter((d) => d.winnerId === p.id).length,
      heritage: state.holdings.filter((h) => h.ownerId === p.id).length,
      solidarityActions: p.solidarityActions,
      money: p.money,
    };
  });

  const first = log.entries[0]?.at;
  const last = log.entries.at(-1)?.at;
  return {
    gameId: state.gameId,
    status: state.status,
    activeSeconds: state.clock.activePlaySeconds,
    wallSeconds: first !== undefined && last !== undefined ? Math.round((last - first) / 1000) : 0,
    turns: of("TurnStarted").length,
    counts: {
      questions: answers.length,
      duels: duels.length,
      duelsChildAdult: duels.filter((d) => type(d.challengerId) !== type(d.opponentId)).length,
      duelsWon: duels.filter((d) => d.winnerId !== null).length,
      duelsDrawn: duels.filter((d) => d.winnerId === null).length,
      halts: of("JourneyHalted").length,
      monumentsBought: of("SiteAcquired").length,
      heritageVisits: of("HeritageVisited").length,
      transfers: of("MoneyTransferred").length,
      treasures: scenarios.filter((s) => s.cellType === "treasure").length,
      managementChoices: of("ChoiceMade").length,
      solidarityActions: of("SolidarityActionRecorded").length,
      collectiveEvents: of("MoneyTransferred").filter((t) => collectiveKinds.has(t.reason)).length,
    },
    players,
    interactions: measureInteractions(log),
    journal: buildJournal(log, name),
  };
}

/**
 * Temps passé par interaction (approximatif, horloge murale) : de l'ouverture
 * (demande de question, offre de Duel ou d'achat, scénario) à la clôture (réponse,
 * résolution, décision, ou lot suivant pour un scénario automatique).
 */
export function measureInteractions(log: PlaytestLog): readonly InteractionTiming[] {
  const totals = new Map<InteractionKind, { count: number; totalMs: number }>();
  const add = (kind: InteractionKind, ms: number) => {
    const t = totals.get(kind) ?? { count: 0, totalMs: 0 };
    totals.set(kind, { count: t.count + 1, totalMs: t.totalMs + Math.max(0, ms) });
  };
  type Open = { kind: InteractionKind; at: number; requestId?: string; untilNextBatch?: boolean };
  let open: Open[] = [];
  for (let i = 0; i < log.entries.length; i += 1) {
    const entry = log.entries[i]!;
    // Clôtures par le lot courant.
    const remaining: Open[] = [];
    for (const o of open) {
      const closed =
        o.untilNextBatch ||
        entry.events.some((e) => {
          if (o.kind === "duel") return e.type === "DuelResolved";
          if (o.kind === "monument") return e.type === "SiteAcquired" || e.type === "PurchaseDeclined";
          if (o.kind === "question" || o.kind === "halt" || o.kind === "heritage_visit") return e.type === "AnswerRecorded" && e.requestId === o.requestId;
          return e.type === "TurnEnded" || e.type === "QuestionRequested" || e.type === "DuelOffered";
        });
      if (closed) add(o.kind, entry.at - o.at);
      else remaining.push(o);
    }
    open = remaining;
    // Ouvertures par le lot courant.
    for (const e of entry.events) {
      if (e.type === "QuestionRequested" && e.purpose !== "duel") open.push({ kind: e.purpose === "standard" ? "question" : e.purpose, at: entry.at, requestId: e.requestId });
      else if (e.type === "DuelOffered") open.push({ kind: "duel", at: entry.at });
      else if (e.type === "PurchaseOffered") open.push({ kind: "monument", at: entry.at });
      else if (e.type === "ScenarioTriggered" && (e.cellType === "event" || e.cellType === "management" || e.cellType === "solidarity" || e.cellType === "treasure")) {
        // Scénario automatique (le tour se clôt dans le même lot) : on mesure jusqu'au lot suivant (temps de lecture de la carte).
        const automatic = entry.events.some((x) => x.type === "TurnEnded");
        open.push({ kind: e.cellType, at: entry.at, untilNextBatch: automatic });
      }
    }
  }
  return INTERACTION_KINDS.map((kind) => {
    const t = totals.get(kind) ?? { count: 0, totalMs: 0 };
    return { kind, count: t.count, totalMs: t.totalMs, averageMs: t.count === 0 ? 0 : Math.round(t.totalMs / t.count) };
  });
}

/** Journal lisible des événements importants, horodaté en temps de jeu actif. */
export function buildJournal(log: PlaytestLog, name: (id: PlayerId) => string): readonly string[] {
  const lines: string[] = [];
  for (const entry of log.entries) {
    const stamp = mmss(entry.active);
    for (const e of entry.events) {
      const line = describe(e, name);
      if (line) lines.push(`${stamp} ${line}`);
    }
  }
  return lines;
}

function describe(e: GameEvent, name: (id: PlayerId) => string): string | null {
  switch (e.type) {
    case "TurnStarted":
      return `— Tour ${e.turnNumber} : ${name(e.playerId)}`;
    case "TurnSkipped":
      return `${name(e.playerId)} passe son tour`;
    case "MovementAssigned":
      return `${name(e.playerId)} avance de ${e.steps}`;
    case "CellArrived":
      return `${name(e.playerId)} arrive sur ${e.cellType} (${e.position})`;
    case "QuestionRequested":
      return e.purpose === "halt" ? `Défi de reprise pour ${name(e.playerId)}` : e.purpose === "heritage_visit" ? `Défi Patrimoine pour ${name(e.playerId)}` : e.purpose === "duel" ? `Question de Duel pour ${name(e.playerId)}` : `Question pour ${name(e.playerId)}`;
    case "QuestionServed":
      return `  → ${e.question.categoryId} niveau ${e.question.difficulty}`;
    case "AnswerRecorded":
      return `${name(e.playerId)} répond : ${e.outcome}${e.explanationMastery !== "none" ? ` (explication connue : ${e.explanationMastery})` : ""}`;
    case "RewardGranted":
      return `  +${e.amount} pour ${name(e.playerId)}${e.multiplier > 1 ? ` (×${e.multiplier})` : ""}${e.bonus > 0 ? ` (+${e.bonus} bonus)` : ""}`;
    case "DuelOffered":
      return `Duel proposé à ${name(e.challengerId)} (adversaires : ${e.candidates.map(name).join(", ")})`;
    case "DuelStarted":
      return `${name(e.challengerId)} défie ${name(e.opponentId)}`;
    case "DuelResolved":
      return e.winnerId ? `${name(e.winnerId)} remporte le Duel (${e.challengerOutcome} / ${e.opponentOutcome}, ${e.categoryId ?? "?"})` : `Match nul (${e.challengerOutcome} / ${e.opponentOutcome}, ${e.categoryId ?? "?"})`;
    case "JourneyHalted":
      return `Halte : ${name(e.playerId)}`;
    case "HaltLifted":
      return `${name(e.playerId)} reprend la route (${e.outcome})`;
    case "HaltTurnLost":
      return `${name(e.playerId)} reste à la halte ce tour`;
    case "HeritageVisited":
      return `${name(e.visitorId)} visite le patrimoine de ${name(e.ownerId)} (${e.siteId})`;
    case "HeritageRevisited":
      return `${name(e.playerId)} retrouve son patrimoine`;
    case "PurchaseOffered":
      return `Monument proposé à ${name(e.playerId)} : ${e.siteId} (${e.price})${e.affordable ? "" : " — trop cher"}`;
    case "SiteAcquired":
      return `${name(e.playerId)} achète ${e.siteId} (${e.price})`;
    case "PurchaseDeclined":
      return `${name(e.playerId)} passe`;
    case "ScenarioTriggered":
      return `Scénario ${e.cellType} : ${e.scenarioId}`;
    case "ChoiceMade":
      return `${name(e.playerId)} choisit ${e.optionId} (${e.choiceId})`;
    case "RecipientChoiceOffered":
      return `${name(e.playerId)} doit choisir à qui donner ${e.amount}`;
    case "MoneyTransferred":
      return e.reason === "heritage_contribution" ? `Contribution : ${e.amount} de ${name(e.fromPlayerId)} à ${name(e.toPlayerId)}` : `${name(e.fromPlayerId)} donne ${e.amount} à ${name(e.toPlayerId)} (${e.reason})`;
    case "SolidarityActionRecorded":
      return `Solidarité : ${name(e.playerId)} → ${name(e.beneficiaryId)} (${e.amount})`;
    case "PenaltyShielded":
      return `Protection : pénalité de ${e.amount} annulée pour ${name(e.playerId)}`;
    case "InvestmentSettled":
      return `Investissement de ${name(e.playerId)} : ${e.outcome} → ${e.payout}`;
    case "SavingMatured":
      return `Épargne de ${name(e.playerId)} : +${e.payout}`;
    case "OutcomeCancelled":
      return `Annulé (${e.kind}) : ${name(e.playerId)} n'a pas ${e.required} (${e.available})`;
    case "EffectQueued":
      return `Effet pour ${name(e.effect.playerId)} : ${e.effect.spec.type}`;
    case "PassedStart":
      return `${name(e.playerId)} passe par le départ (+${e.bonus})`;
    case "TimeTargetReached":
      return "Durée atteinte : dernier tour de table";
    case "GameEndRequested":
      return "Fin demandée";
    case "GameFinished":
      return `Fin de partie : ${e.ranking.map((r) => `${r.rank}. ${name(r.playerId)} (${r.score})`).join(" · ")}`;
    default:
      return null;
  }
}

/** Rendu texte du rapport (export TXT / affichage développeur). */
export function reportToText(r: PlaytestReport): string {
  const l: string[] = [];
  l.push("PARTIE KOUNOUZI — TEST", "");
  l.push(`Partie : ${r.gameId} (${r.status === "finished" ? "terminée" : "en cours"})`);
  l.push(`Durée active : ${Math.floor(r.activeSeconds / 60)} min ${Math.round(r.activeSeconds % 60)} s`);
  l.push(`Durée murale : ${Math.floor(r.wallSeconds / 60)} min ${r.wallSeconds % 60} s`);
  l.push(`Tours : ${r.turns}`, "");
  for (const p of r.players) {
    l.push(p.displayName + (p.profileType === "child" ? " (enfant)" : " (adulte)"));
    l.push(`  Questions : ${p.questions}`, `  Correctes : ${p.correct}`, `  Presque : ${p.partial}`, `  Incorrectes : ${p.incorrect}`, `  Duels : ${p.duels}`, `  Duels gagnés : ${p.duelsWon}`, `  Patrimoine : ${p.heritage}`, `  Solidarité : ${p.solidarityActions}`, `  Kounouz : ${p.money}`, "");
  }
  const c = r.counts;
  l.push("Interactions :", `  Questions : ${c.questions}`, `  Duels : ${c.duels} (enfant/adulte : ${c.duelsChildAdult}, victoires : ${c.duelsWon}, égalités : ${c.duelsDrawn})`, `  Haltes : ${c.halts}`, `  Monuments achetés : ${c.monumentsBought}`, `  Visites de patrimoine : ${c.heritageVisits}`, `  Transferts : ${c.transfers}`, `  Trésors : ${c.treasures}`, `  Choix Gestion : ${c.managementChoices}`, `  Actions Solidarité : ${c.solidarityActions}`, `  Événements collectifs : ${c.collectiveEvents}`, "");
  l.push("Temps par interaction (approximatif) :");
  for (const t of r.interactions) if (t.count > 0) l.push(`  ${t.kind} : ${t.count} × ${(t.averageMs / 1000).toFixed(1)} s (total ${Math.round(t.totalMs / 1000)} s)`);
  l.push("", "Journal :", ...r.journal);
  return l.join("\n");
}
