import { fundLedgerBalance, ledgerBalance } from "./economy";
import { FUNDS, MAX_PLAYERS, MIN_PLAYERS, type GameState } from "./types";

/** Vérifications de cohérence, utilisées par les tests après chaque commande. */
export function checkInvariants(state: GameState): readonly string[] {
  const violations: string[] = [];
  const n = state.players.length;
  const board = state.config.board;

  if (n < MIN_PLAYERS || n > MAX_PLAYERS) violations.push(`nombre de joueurs ${n} hors [${MIN_PLAYERS}, ${MAX_PLAYERS}]`);
  if (state.activePlayerIndex < 0 || state.activePlayerIndex >= n) violations.push(`activePlayerIndex ${state.activePlayerIndex} invalide`);
  if (new Set(state.players.map((p) => p.id)).size !== n) violations.push("identifiants de joueur dupliqués");
  if (board.cells.length !== board.cellCount) violations.push("plateau incohérent");

  for (const p of state.players) {
    if (p.position < 0 || p.position >= board.cellCount) violations.push(`${p.id} hors plateau (${p.position})`);
    if (!state.config.rules.allowNegativeBalance && p.money < 0) violations.push(`${p.id} solde négatif (${p.money})`);
    const fromLedger = ledgerBalance(state, p.id);
    if (fromLedger !== p.money) violations.push(`${p.id} solde ${p.money} ≠ grand livre ${fromLedger}`);
    if (p.journeysTaken < 0 || p.journeysTaken > p.turnsPlayed + 1) violations.push(`${p.id} voyages (${p.journeysTaken}) incohérents avec les tours (${p.turnsPlayed})`);
    if (p.solidarityActions < 0 || p.solidarityGiven < 0) violations.push(`${p.id} solidarité négative`);
  }
  if (state.phase.kind === "awaiting_duel") {
    const d = state.phase.duel;
    if (d.challengerId === d.opponentId) violations.push("duel contre soi-même");
    if (!state.players.some((p) => p.id === d.opponentId)) violations.push("adversaire de duel inconnu");
    if (d.challengerId !== state.players[state.activePlayerIndex]?.id) violations.push("le défieur n'est pas le joueur actif");
    if (d.stage === "opponent" && d.challengerOutcome === undefined) violations.push("duel : réponse du défieur manquante");
  }
  if (state.phase.kind === "awaiting_challenge") {
    const c = state.phase.challenge;
    if (!state.config.challenges.definitions.some((d) => d.id === c.challengeId)) violations.push(`défi inconnu ${c.challengeId}`);
    if (c.playerId !== state.players[state.activePlayerIndex]?.id) violations.push("le défi n'est pas pour le joueur actif");
    if (((state.challengeServed[c.playerId] ?? {})[c.challengeId] ?? 0) < 1) violations.push("défi en cours jamais compté comme proposé");
    for (const id of c.surahIds ?? []) if (!state.config.challenges.recitations.some((r) => r.id === id)) violations.push(`sourate de récitation inconnue ${id}`);
    if (c.surahIds && new Set(c.surahIds).size !== c.surahIds.length) violations.push("sourates de récitation dupliquées");
  }
  for (const p of state.players) for (const id of p.masteredSurahs) if (state.config.challenges.recitations.length > 0 && !state.config.challenges.recitations.some((r) => r.id === id)) violations.push(`${p.id} maîtrise une sourate hors banque ${id}`);
  for (const [playerId, served] of Object.entries(state.challengeServed)) {
    if (!state.players.some((p) => p.id === playerId)) violations.push(`compteurs de défi d'un joueur inconnu ${playerId}`);
    for (const [id, n] of Object.entries(served)) if (n < 0 || !state.config.challenges.definitions.some((d) => d.id === id)) violations.push(`compteur de défi incohérent pour ${id}`);
  }
  // Caisses collectives : solde = grand livre de la caisse ; chaque dépôt est adossé à une écriture négative du joueur portant la même référence.
  for (const fund of FUNDS) {
    if (state.funds[fund] < 0) violations.push(`caisse ${fund} négative`);
    if (fundLedgerBalance(state, fund) !== state.funds[fund]) violations.push(`caisse ${fund} : solde ${state.funds[fund]} ≠ grand livre ${fundLedgerBalance(state, fund)}`);
  }
  for (const f of state.fundLedger) {
    const mirror = state.ledger.find((t) => t.ref === f.ref && t.playerId === f.fromPlayerId);
    if (!mirror || mirror.amount !== -f.amount) violations.push(`dépôt ${f.ref} sans écriture joueur équilibrée`);
  }
  if (state.calendar.year < 1 || state.calendar.roundsInYear < 0 || (state.config.rules.zakat.enabled && state.calendar.roundsInYear >= state.config.rules.zakat.cycleRounds)) violations.push("calendrier incohérent");
  if (state.phase.kind === "awaiting_donation") {
    const money = state.players[state.activePlayerIndex]?.money ?? 0;
    if (state.phase.amounts.length === 0 || state.phase.amounts.some((a) => a > money)) violations.push("don : montants proposés non payables");
  }
  const transfers = state.ledger.filter((t) => t.reason === "transfer_sent" || t.reason === "transfer_received");
  const byTransfer = new Map<string, number>();
  for (const t of transfers) byTransfer.set(t.ref ?? "", (byTransfer.get(t.ref ?? "") ?? 0) + t.amount);
  for (const [ref, sum] of byTransfer) if (sum !== 0) violations.push(`transfert ${ref} déséquilibré (${sum})`);

  const siteIds = state.holdings.map((h) => h.siteId);
  if (new Set(siteIds).size !== siteIds.length) violations.push("un site possédé deux fois");
  for (const h of state.holdings) {
    if (!state.config.sites[h.siteId]) violations.push(`patrimoine sur site inconnu ${h.siteId}`);
    if (!state.players.some((p) => p.id === h.ownerId)) violations.push(`patrimoine d'un joueur inconnu ${h.ownerId}`);
  }
  for (const e of state.effects) if (!state.players.some((p) => p.id === e.playerId)) violations.push(`effet ${e.id} pour un joueur inconnu`);

  if (state.clock.activePlaySeconds < 0) violations.push("temps de jeu négatif");
  for (const [key, visits] of Object.entries(state.cellVisits)) {
    const pos = Number(key);
    if (!Number.isInteger(pos) || pos < 0 || pos >= board.cellCount || visits < 0) violations.push(`visites incohérentes pour la case ${key}`);
  }

  const finished = state.status === "finished";
  if (finished !== (state.phase.kind === "finished")) violations.push("status et phase désaccordés");
  if (finished !== (state.ranking !== undefined)) violations.push("classement présent/absent incohérent avec status");
  if (state.ranking && state.ranking.length !== n) violations.push("classement incomplet");

  let previous = 0;
  for (const t of state.ledger) {
    if (t.id !== previous + 1) violations.push(`transaction ${t.id} hors séquence`);
    previous = t.id;
  }
  return violations;
}
