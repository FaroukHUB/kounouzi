"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GameId } from "@/core/shared";
import { buildPlaytestReport, reportToText, type PlaytestReport } from "@/experience/playtest";
import { gameStore, playtestStore } from "@/state/appStores";
import { Button } from "@/ui/primitives/Button";

/**
 * ÉCRAN DÉVELOPPEUR — diagnostic de playtest local. Accessible uniquement
 * par l'URL `/diagnostic/<gameId>` ; aucune entrée dans l'interface joueur.
 * Toutes les données viennent de l'appareil ; rien n'est envoyé ailleurs.
 */
export function DiagnosticScreen({ gameId }: { readonly gameId: GameId }) {
  const [report, setReport] = useState<PlaytestReport | null | "missing">(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = gameStore.getState().state?.gameId === gameId ? "ready" : await gameStore.getState().load(gameId);
      const state = gameStore.getState().state;
      const log = (await playtestStore.getState().load(gameId)) ?? { gameId, entries: [] };
      if (cancelled) return;
      setReport(status === "ready" && state ? buildPlaytestReport(state, log) : "missing");
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const download = (name: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (report === null) return <p className="p-8">Chargement…</p>;
  if (report === "missing") {
    return (
      <div className="p-8">
        <p>Partie introuvable sur cet appareil.</p>
        <Link href="/" className="underline">
          Retour
        </Link>
      </div>
    );
  }
  const text = reportToText(report);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6" data-testid="diagnostic-screen">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Diagnostic de playtest (développeur)</h1>
          <p className="text-sm text-[var(--k-ink-soft)]">Données locales uniquement · aucune télémétrie · sans influence sur le jeu.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => download(`kounouzi-playtest-${report.gameId}.json`, JSON.stringify(report, null, 2), "application/json")} data-testid="export-json">
            Export JSON
          </Button>
          <Button variant="secondary" onClick={() => download(`kounouzi-playtest-${report.gameId}.txt`, text, "text/plain")} data-testid="export-txt">
            Export TXT
          </Button>
          <Link href={`/partie/${report.gameId}`} className="inline-flex min-h-11 items-center rounded-xl px-4 underline">
            Partie
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Durée active", `${Math.floor(report.activeSeconds / 60)} min ${Math.round(report.activeSeconds % 60)} s`],
          ["Durée murale", `${Math.floor(report.wallSeconds / 60)} min ${report.wallSeconds % 60} s`],
          ["Tours", String(report.turns)],
          ["Questions", String(report.counts.questions)],
          ["Duels", `${report.counts.duels} (E/A ${report.counts.duelsChildAdult})`],
          ["Victoires / nuls", `${report.counts.duelsWon} / ${report.counts.duelsDrawn}`],
          ["Haltes", String(report.counts.halts)],
          ["Monuments achetés", String(report.counts.monumentsBought)],
          ["Visites", String(report.counts.heritageVisits)],
          ["Transferts", String(report.counts.transfers)],
          ["Trésors", String(report.counts.treasures)],
          ["Choix Gestion", String(report.counts.managementChoices)],
          ["Solidarité", String(report.counts.solidarityActions)],
          ["Collectifs", String(report.counts.collectiveEvents)],
          ["Défis famille", `${report.challenges.proposed} (OH NON ${report.challenges.ohNo})`],
          ["Défis réussis / ratés / passés", `${report.challenges.succeeded} / ${report.challenges.failed} / ${report.challenges.skipped}`],
          ["Kounouz via défis", String(report.challenges.kounouz)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{k}</div>
            <div className="text-xl font-black">{v}</div>
          </div>
        ))}
      </section>

      <section className="overflow-x-auto rounded-2xl bg-white p-3 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs uppercase tracking-wider text-[var(--k-ink-soft)]">
              {["Joueur", "Questions", "Correctes", "Presque", "Incorrectes", "Duels", "Gagnés", "Patrimoine", "Solidarité", "Kounouz"].map((h) => (
                <th key={h} className="pe-3 text-start">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.players.map((p) => (
              <tr key={p.playerId} data-testid={`diag-${p.playerId}`}>
                <td className="pe-3 font-semibold">{p.displayName}</td>
                <td className="pe-3">{p.questions}</td>
                <td className="pe-3">{p.correct}</td>
                <td className="pe-3">{p.partial}</td>
                <td className="pe-3">{p.incorrect}</td>
                <td className="pe-3">{p.duels}</td>
                <td className="pe-3">{p.duelsWon}</td>
                <td className="pe-3">{p.heritage}</td>
                <td className="pe-3">{p.solidarityActions}</td>
                <td className="pe-3">{p.money}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-sm" data-testid="diag-challenges">
        <h2 className="mb-2 font-bold">Défis famille</h2>
        <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {report.challenges.byCategory.map((c) => (
            <li key={c.category}>
              <span className="font-semibold">{c.category}</span> : {c.proposed} proposés, {c.succeeded} réussis
            </li>
          ))}
          {report.challenges.byAgeBand.map((b) => (
            <li key={b.band}>
              <span className="font-semibold">Réussite {b.band}</span> : {b.rate} % ({b.succeeded}/{b.succeeded + b.failed})
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-sm">
        <h2 className="mb-2 font-bold">Temps par interaction (approximatif)</h2>
        <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          {report.interactions.map((t) => (
            <li key={t.kind}>
              <span className="font-semibold">{t.kind}</span> : {t.count} × {(t.averageMs / 1000).toFixed(1)} s
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-3 shadow-sm">
        <h2 className="mb-2 font-bold">Journal</h2>
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap text-xs leading-relaxed" data-testid="diag-journal">
          {report.journal.join("\n")}
        </pre>
      </section>
    </main>
  );
}
