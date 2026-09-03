"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AVATARS } from "@/config/avatars";
import { BOARD_32_V1 } from "@/config/board";
import { DEMO_HERITAGE_SITES, DEMO_RULES_QUICK, DEMO_SCENARIOS } from "@/config/demo";
import { DEFAULT_GAME_MODE, GAME_MODE_IDS, endConditionOf, type GameModeId } from "@/config/game-modes";
import { journeyCycleForOrdinal } from "@/config/journey";
import { SCHOOL_GRADES } from "@/config/profiles";
import { MAX_PLAYERS, MIN_PLAYERS, type GameSetup } from "@/core/game";
import { ADULT_INITIAL_LEVELS, DEFAULT_ADULT_INITIAL_LEVEL, type AdultInitialLevel, type GameId, type PlayerId, type ProfileType } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { gameStore } from "@/state/appStores";
import { AvatarGlyph } from "@/ui/primitives/AvatarGlyph";
import { Button } from "@/ui/primitives/Button";

interface Row {
  readonly displayName: string;
  readonly profileType: ProfileType;
  readonly avatarId: string;
  readonly birthYear: string;
  readonly schoolGrade: string;
  readonly initialLevel: AdultInitialLevel;
}

const row = (i: number, profileType: ProfileType): Row => ({ displayName: "", profileType, avatarId: AVATARS[i % AVATARS.length]!.id, birthYear: "", schoolGrade: SCHOOL_GRADES[0], initialLevel: DEFAULT_ADULT_INITIAL_LEVEL });

/** Écran de création : 2 à 6 joueurs, enfants et adultes, pion, durée. Aucune mémoire pédagogique encore. */
export function NewGameForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([row(0, "child"), row(1, "adult")]);
  const [mode, setMode] = useState<GameModeId>(DEFAULT_GAME_MODE);
  const [error, setError] = useState<string | null>(null);
  const thisYear = new Date().getFullYear();

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = async () => {
    if (rows.some((r) => r.displayName.trim() === "")) return setError(t(DEFAULT_LOCALE, "setup.errors.name"));
    for (const r of rows) {
      if (r.profileType === "child" && r.birthYear !== "") {
        const y = Number(r.birthYear);
        if (!Number.isInteger(y) || y < thisYear - 20 || y > thisYear) return setError(t(DEFAULT_LOCALE, "setup.errors.birthYear"));
      }
    }
    // Identifiant technique unique (aucun effet sur le jeu) ; numéro de partie familiale monotone (rotation interne du Chemin).
    const gameId = `game-${Date.now().toString(36)}` as GameId;
    const familyGameOrdinal = await gameStore.getState().allocateFamilyGameOrdinal();
    const profiles: PlayerProfileDraft[] = rows.map((r, i) => {
      const id = `p${i + 1}` as PlayerId;
      const base = { id, displayName: r.displayName.trim(), profileType: r.profileType, avatarId: r.avatarId };
      return r.profileType === "child"
        ? { ...base, child: { birthYear: r.birthYear === "" ? thisYear - 8 : Number(r.birthYear), schoolGrade: r.schoolGrade } }
        : { ...base, adult: { initialLevel: r.initialLevel } };
    });
    const setup: GameSetup = {
      gameId,
      players: profiles.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType })),
      board: BOARD_32_V1,
      heritageSites: DEMO_HERITAGE_SITES,
      scenarios: DEMO_SCENARIOS,
      rules: { ...DEMO_RULES_QUICK, id: `rules-demo-${mode}`, endCondition: endConditionOf(mode) },
      journey: journeyCycleForOrdinal(familyGameOrdinal),
    };
    if (!gameStore.getState().create(setup, profiles, familyGameOrdinal)) return setError(JSON.stringify(gameStore.getState().lastError));
    router.push(`/partie/${gameId}`);
  };

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      data-testid="new-game-form"
    >
      <header>
        <h1 className="text-3xl font-black tracking-tight">{t(DEFAULT_LOCALE, "setup.title")}</h1>
        <p className="text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "setup.subtitle")}</p>
      </header>

      <ol className="flex flex-col gap-4">
        {rows.map((r, i) => (
          <li key={i} className="rounded-3xl bg-white p-4 shadow-sm" data-testid={`player-row-${i}`}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-40 flex-1 flex-col text-sm font-semibold">
                {t(DEFAULT_LOCALE, "setup.player", { index: i + 1 })} — {t(DEFAULT_LOCALE, "setup.name")}
                <input className="mt-1 min-h-11 rounded-xl border px-3 text-base font-normal" value={r.displayName} placeholder={t(DEFAULT_LOCALE, "setup.namePlaceholder")} onChange={(e) => update(i, { displayName: e.target.value })} required />
              </label>
              <fieldset className="flex gap-1 rounded-xl bg-[var(--k-sand)] p-1" aria-label={t(DEFAULT_LOCALE, "setup.type")}>
                {(["child", "adult"] as const).map((type) => (
                  <button key={type} type="button" onClick={() => update(i, { profileType: type })} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${r.profileType === type ? "bg-white shadow" : "opacity-60"}`} aria-pressed={r.profileType === type}>
                    {t(DEFAULT_LOCALE, `setup.${type}`)}
                  </button>
                ))}
              </fieldset>
              {rows.length > MIN_PLAYERS ? (
                <Button variant="ghost" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                  {t(DEFAULT_LOCALE, "setup.removePlayer")}
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="flex flex-col text-sm font-semibold">
                {t(DEFAULT_LOCALE, "setup.avatar")}
                <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup">
                  {AVATARS.map((a) => (
                    <button key={a.id} type="button" role="radio" aria-checked={r.avatarId === a.id} aria-label={a.id} onClick={() => update(i, { avatarId: a.id })} className={`flex size-10 items-center justify-center rounded-full text-white ${r.avatarId === a.id ? "ring-4 ring-[var(--k-gold)]" : "opacity-70"}`} style={{ backgroundColor: a.color }}>
                      <AvatarGlyph shape={a.shape} />
                    </button>
                  ))}
                </div>
              </div>
              {r.profileType === "child" ? (
                <>
                  <label className="flex flex-col text-sm font-semibold">
                    {t(DEFAULT_LOCALE, "setup.birthYear")}
                    <input className="mt-1 min-h-11 w-28 rounded-xl border px-3 font-normal" inputMode="numeric" value={r.birthYear} onChange={(e) => update(i, { birthYear: e.target.value })} placeholder={String(thisYear - 8)} />
                  </label>
                  <label className="flex flex-col text-sm font-semibold">
                    {t(DEFAULT_LOCALE, "setup.grade")}
                    <select className="mt-1 min-h-11 rounded-xl border px-3 font-normal" value={r.schoolGrade} onChange={(e) => update(i, { schoolGrade: e.target.value })}>
                      {SCHOOL_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label className="flex flex-col text-sm font-semibold">
                  {t(DEFAULT_LOCALE, "setup.initialLevel")}
                  <select className="mt-1 min-h-11 rounded-xl border px-3 font-normal" value={r.initialLevel} onChange={(e) => update(i, { initialLevel: e.target.value as AdultInitialLevel })}>
                    {ADULT_INITIAL_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {t(DEFAULT_LOCALE, `level.${l}`)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </li>
        ))}
      </ol>

      {rows.length < MAX_PLAYERS ? (
        <Button variant="secondary" size="lg" onClick={() => setRows((rs) => [...rs, row(rs.length, "child")])} data-testid="add-player">
          + {t(DEFAULT_LOCALE, "setup.addPlayer")}
        </Button>
      ) : null}

      <fieldset className="rounded-3xl bg-white p-4 shadow-sm">
        <legend className="px-1 text-sm font-semibold">{t(DEFAULT_LOCALE, "setup.mode")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GAME_MODE_IDS.map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border px-2 ${mode === m ? "border-[var(--k-teal)] bg-[var(--k-teal)]/10" : "border-[var(--k-line)]"}`}>
              <span className="font-semibold">{t(DEFAULT_LOCALE, `mode.${m}`)}</span>
              <span className="text-sm text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, `mode.${m}.hint`)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Button size="xl" type="submit" data-testid="start-game">
        {t(DEFAULT_LOCALE, "setup.start")}
      </Button>
    </form>
  );
}
