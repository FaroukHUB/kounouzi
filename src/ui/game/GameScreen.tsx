"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useAnimationQueue } from "@/animation/useAnimationQueue";
import { useReducedMotion, useTimings } from "@/animation/useReducedMotion";
import type { GameEvent, GameState } from "@/core/game";
import type { GameId, PlayerId } from "@/core/shared";
import { contentRegistry } from "@/config/content";
import { LEARNING_CONFIG } from "@/config/learning";
import { utteranceFor } from "@/experience/narration";
import { pendingRequest, resolveQuestion } from "@/experience/questionResolver";
import { startPlayClock } from "@/experience/playClock";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { gameStore, learningStore, narrator, useGameStore, useLearningStore } from "@/state/appStores";
import { useSessionStore } from "@/state/sessionStore";
import { useUiStore } from "@/state/uiStore";
import { Board } from "@/ui/board/Board";
import { PawnLayer } from "@/ui/board/PawnLayer";
import { CardOverlay } from "@/ui/cards/CardOverlay";
import { Button } from "@/ui/primitives/Button";
import { FinalRanking } from "./FinalRanking";
import { JourneyPanel } from "./JourneyPanel";
import { PlayerCorners, PlayerPanel } from "./PlayerPanel";
import { SettingsSheet } from "./SettingsSheet";
import { TimeBadge } from "./TimeBadge";
import { TurnBanner } from "./TurnBanner";

export function GameScreen({ gameId }: { readonly gameId: GameId }) {
  const status = useGameStore((s) => s.status);
  const state = useGameStore((s) => s.state);
  const profiles = useGameStore((s) => s.profiles);
  const memories = useLearningStore((s) => s.memories);
  const loadedLearners = useLearningStore((s) => s.loaded);
  const ui = useUiStore();
  const timings = useTimings();
  const reduced = useReducedMotion();
  const session = useSessionStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  // Chargement / reprise : l'état est affiché tel quel, sans rejouer les animations.
  useEffect(() => {
    if (state?.gameId === gameId) {
      if (Object.keys(useUiStore.getState().pawnVisuals).length === 0) useUiStore.getState().syncFromGame(state);
      return;
    }
    useUiStore.getState().clear();
    void gameStore.getState().load(gameId).then((result) => {
      const loaded = gameStore.getState().state;
      if (result === "ready" && loaded) useUiStore.getState().syncFromGame(loaded);
    });
  }, [gameId, state]);

  // Narration : réglages puis phrase par événement rejoué (coordonnée avec l'animation, jamais bloquante pour le moteur).
  useEffect(() => {
    narrator.setEnabled(session.narrationEnabled);
    narrator.setRate(session.narrationRate);
  }, [session.narrationEnabled, session.narrationRate]);

  const onPlay = useCallback((event: GameEvent, current: GameState) => {
    const u = utteranceFor(event, current, DEFAULT_LOCALE);
    if (u) narrator.speak(u);
    // Aperçu du chemin : le trajet vient de l'événement PawnMoved qui suit — jamais recalculé.
    if (event.type === "MovementAssigned") {
      const next = useUiStore.getState().queue[0]?.event;
      if (next?.type === "PawnMoved" && next.playerId === event.playerId) useUiStore.getState().setPathPreview(next.path);
    }
    if (event.type === "PawnMoved") useUiStore.getState().setPathPreview([]);
  }, []);
  useAnimationQueue(timings, onPlay, state);

  // Mémoire pédagogique : la mémoire de chaque joueur de la partie est chargée avant toute distribution.
  useEffect(() => {
    if (!state) return;
    void learningStore.getState().ensureLoaded(state.players.map((p) => p.id));
  }, [state]);

  // Distribution : dès qu'une question est demandée, le Learning Engine la choisit UNE fois (mémoire du joueur actif),
  // puis elle est figée dans l'état (ServeQuestion). Si aucune question n'existe, la carte propose « Passer » ; rien n'est inventé.
  useEffect(() => {
    if (!state) return;
    const pending = pendingRequest(state);
    if (!pending || !loadedLearners.includes(pending.playerId)) return;
    const question = resolveQuestion({ state, profiles, registry: contentRegistry(), memoryOf: (id) => memories[id], config: LEARNING_CONFIG, now: new Date().toISOString() });
    if (question) gameStore.getState().dispatch({ type: "ServeQuestion", requestId: pending.requestId, question });
  }, [state, profiles, memories, loadedLearners]);

  // Temps de jeu actif : uniquement partie visible, non en pause, en cours.
  useEffect(() => {
    if (!state || state.status !== "in_progress") return;
    const clock = startPlayClock({
      isActive: () => !paused && gameStore.getState().state?.status === "in_progress",
      isVisible: () => typeof document === "undefined" || document.visibilityState === "visible",
      onSeconds: (seconds) => gameStore.getState().dispatch({ type: "AdvanceClock", seconds }),
    });
    const onVisibility = () => {
      if (document.visibilityState !== "visible") clock.flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clock.stop();
    };
  }, [state?.gameId, state?.status, paused, state]);

  if (status === "loading" || (status === "idle" && !state)) return <p className="p-8 text-center">{t(DEFAULT_LOCALE, "game.loading")}</p>;
  if (!state || status === "missing" || status === "corrupted") {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p>{t(DEFAULT_LOCALE, "game.notFound")}</p>
        <Link href="/" className="underline">
          {t(DEFAULT_LOCALE, "common.back")}
        </Link>
      </div>
    );
  }

  const activeId = state.players[state.activePlayerIndex]?.id ?? ("" as PlayerId);
  /** Les panneaux affichent l'état présenté (retard des animations) ; les commandes utilisent l'état réel. */
  const shown = ui.presentedState ?? state;
  const shownActiveId = shown.players[shown.activePlayerIndex]?.id ?? activeId;
  const dispatch = gameStore.getState().dispatch;
  const startJourney = () => dispatch({ type: "StartJourney", playerId: activeId });
  const cardOpen = ui.card !== null;
  /** Jusqu'à 4 joueurs : les tuiles entourent le plateau (gros chiffres) ; au-delà, liste dans le panneau latéral. */
  const corners = state.players.length <= 4;

  return (
    <div className={`bg-table relative flex min-h-dvh flex-col lg:flex-row lg:items-center lg:justify-center lg:p-6 ${corners ? "lg:gap-0" : "lg:gap-6"}`} data-testid="game-screen" data-phase={state.phase.kind}>
      <TurnBanner banner={ui.banner} state={shown} />

      {corners ? (
        <div className="grid grid-cols-2 gap-2 px-3 pt-3 lg:hidden" data-testid="player-corners-mobile">
          <PlayerCorners state={shown} profiles={profiles} />
        </div>
      ) : null}
      <motion.main
        className={`flex flex-1 items-center justify-center p-3 lg:flex-none ${corners ? "lg:grid lg:grid-cols-[11rem_auto_11rem] lg:grid-rows-2 lg:gap-x-3 lg:gap-y-2" : ""}`}
        animate={{ scale: cardOpen ? 0.96 : 1, opacity: cardOpen ? 0.6 : 1 }}
        transition={{ type: "tween", duration: reduced ? 0 : 0.3 }}
        style={{ willChange: cardOpen ? "transform, opacity" : "auto" }}
        data-layout={corners ? "corners" : "list"}
      >
        {corners ? (
          <div className="contents max-lg:hidden" data-testid="player-corners">
            <PlayerCorners state={shown} profiles={profiles} />
          </div>
        ) : null}
        <div className={corners ? "lg:col-start-2 lg:row-span-2 lg:self-center" : ""}>
        <Board
          board={state.config.board}
          highlightedCell={ui.highlightedCell}
          arrivalCell={ui.arrivalCell}
          previewPath={ui.pathPreview}
          holdings={shown.holdings}
          players={state.players}
          profiles={profiles}
          pawns={<PawnLayer players={state.players} profiles={profiles} visuals={ui.pawnVisuals} activePlayerId={shownActiveId} cellCount={state.config.board.cellCount} stepMs={timings.stepMs} />}
          center={<JourneyPanel state={state} shown={shown} reveal={ui.journeyReveal} isAnimating={ui.isAnimating || ui.queue.length > 0 || cardOpen} onStartJourney={startJourney} />}
        />
        </div>
      </motion.main>

      <CardOverlay
        state={state}
        profiles={profiles}
        narrator={narrator}
        reduced={reduced}
        onSubmitAnswer={(requestId, playerId, outcome, explanationMastery, validationMode) => dispatch({ type: "SubmitAnswer", playerId, requestId, answer: { outcome, explanationMastery, validationMode } })}
        onDecidePurchase={(siteId, buy) => dispatch({ type: "DecidePurchase", playerId: activeId, siteId, buy })}
        onChoose={(choiceId, optionId) => dispatch({ type: "Choose", playerId: activeId, choiceId, optionId })}
        onChooseOpponent={(opponentId) => dispatch({ type: "ChooseOpponent", playerId: activeId, opponentId })}
        onChooseRecipient={(recipientId) => dispatch({ type: "ChooseRecipient", playerId: activeId, recipientId })}
        onAcceptChallenge={() => dispatch({ type: "AcceptChallenge", playerId: activeId })}
        onCompleteChallenge={(success) => dispatch({ type: "CompleteChallenge", playerId: activeId, success })}
        onSkipChallenge={(reason) => dispatch({ type: "SkipChallenge", playerId: activeId, reason })}
      />

      <aside className={`flex w-full flex-col gap-3 p-3 lg:rounded-[1.8rem] lg:border lg:border-[rgba(120,80,30,0.18)] lg:bg-[rgba(255,250,240,0.55)] lg:shadow-[0_24px_50px_-30px_rgba(60,35,10,0.6)] ${corners ? "lg:absolute lg:inset-x-0 lg:bottom-3 lg:mx-auto lg:w-fit lg:max-w-md lg:flex-row lg:items-center lg:gap-4 lg:px-4 lg:py-2" : "lg:w-80 lg:p-4"}`}>
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-black tracking-[0.08em] text-[var(--k-teal-dark)]">{t(DEFAULT_LOCALE, "app.name")}</h1>
            <TimeBadge state={shown} precise={session.preciseTimer} />
          </div>
          <Button variant="secondary" onClick={() => setSettingsOpen(true)} aria-label={t(DEFAULT_LOCALE, "game.settings")}>
            ⚙
          </Button>
        </header>
        {corners ? null : <PlayerPanel state={shown} profiles={profiles} />}
        {paused ? <p className="rounded-xl bg-white px-3 py-2 text-center text-sm font-semibold">{t(DEFAULT_LOCALE, "game.paused")}</p> : null}
      </aside>

      {shown.status === "finished" ? <FinalRanking state={shown} /> : null}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        narrationSupported={narrator.isSupported()}
        onReplay={() => narrator.replayLast()}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        endRequested={state.endRequested}
        onRequestEnd={() => dispatch({ type: "RequestGameEnd" })}
        challengeSettings={state.config.challenges.definitions.length > 0 ? state.config.challenges.settings : null}
        onChallengeSettings={(settings) => dispatch({ type: "SetChallengeSettings", settings })}
      />
    </div>
  );
}
