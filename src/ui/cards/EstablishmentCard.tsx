"use client";

import { motion } from "motion/react";
import type { EstablishmentFamily, GameState, ServiceType } from "@/core/game";
import { ownsWholeFamily } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Button } from "@/ui/primitives/Button";
import { formatKounouz } from "@/ui/primitives/money";
import { monumentImage } from "@/ui/theme/assets";
import { CardShell } from "./CardShell";
import { PlayerFace } from "./PlayerFace";
import type { CardState } from "./cardState";

type EstablishmentCardState = Extract<CardState, { kind: "establishment" }>;
type ServiceCardState = Extract<CardState, { kind: "service" }>;

/** Nom affiché d'un site : le nom de l'établissement (données) ; sinon, pour un ancien site de démonstration, un nom neutre. */
export function siteDisplayName(state: GameState, siteId: string): string {
  const named = state.config.sites[siteId]?.establishment?.name.fr;
  if (named) return named;
  const n = siteId.match(/(\d+)$/)?.[1];
  return t(DEFAULT_LOCALE, "establishment.demoName", { n: n ? Number(n) : siteId });
}

export function familyLabel(family: EstablishmentFamily): string {
  return t(DEFAULT_LOCALE, `establishment.family.${family}`);
}

export function serviceSentence(serviceType: ServiceType): string {
  return t(DEFAULT_LOCALE, `service.${serviceType}`);
}

function Illustration({ state, siteId }: { readonly state: GameState; readonly siteId: string }) {
  const est = state.config.sites[siteId]?.establishment;
  return (
    <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-[rgba(120,80,30,0.2)] shadow-inner" data-testid="establishment-illustration">
      {/* Illustration de l'établissement (asset remplaçable par site ; aucun personnage). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={monumentImage(siteId)} alt="" aria-hidden="true" className="size-full object-cover" decoding="async" />
      {est?.icon ? (
        <span className="absolute bottom-2 end-2 flex size-14 items-center justify-center rounded-full border-2 border-white bg-white/90 text-3xl shadow-md" aria-hidden="true" data-testid="establishment-icon">
          {est.icon}
        </span>
      ) : null}
    </div>
  );
}

function Stat({ label, value, testId }: { readonly label: string; readonly value: string; readonly testId?: string }) {
  return (
    <div className="rounded-2xl bg-[var(--k-sand)] px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{label}</dt>
      <dd className="text-2xl font-black tabular-nums" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Carte ÉTABLISSEMENT à vendre : icône, nom, illustration, prix, Kounouz du
 * joueur, ACHETER / PASSER. Tout vient de l'état et des données ; aucune
 * histoire inventée. (Ancien « Monument » : le type interne reste
 * `purchasable_monument` pour les sauvegardes.)
 */
export function EstablishmentCard({ state, card, onDecide }: { readonly state: GameState; readonly card: EstablishmentCardState; readonly onDecide: (buy: boolean) => void }) {
  const site = state.config.sites[card.siteId];
  const est = site?.establishment;
  const name = siteDisplayName(state, card.siteId);
  const money = state.players[state.activePlayerIndex]?.money ?? 0;
  return (
    <CardShell cellType="heritage" title={name} subtitle={t(DEFAULT_LOCALE, "establishment.title")} testId="establishment-card">
      <Illustration state={state} siteId={card.siteId} />
      {est ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm text-[var(--k-ink-soft)]" data-testid="establishment-family">
          <span>{t(DEFAULT_LOCALE, "establishment.family", { family: familyLabel(est.family) })}</span>
          {est.name.ar ? (
            <span dir="rtl" lang="ar" className="text-base font-semibold text-[var(--k-ink)]">
              {est.name.ar}
            </span>
          ) : null}
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-3">
        <Stat label={t(DEFAULT_LOCALE, "establishment.price")} value={formatKounouz(card.price)} testId="establishment-price" />
        <Stat label={t(DEFAULT_LOCALE, "establishment.yourKounouz")} value={formatKounouz(money)} testId="establishment-your-kounouz" />
      </dl>
      {card.step === "offer" ? (
        <div className="flex flex-col gap-2">
          {!card.affordable ? <p className="text-sm text-[var(--k-ruby)]">{t(DEFAULT_LOCALE, "establishment.tooExpensive")}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => onDecide(true)} disabled={!card.affordable} data-testid="establishment-buy">
              {t(DEFAULT_LOCALE, "establishment.buy")}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onDecide(false)} data-testid="establishment-pass">
              {t(DEFAULT_LOCALE, "establishment.pass")}
            </Button>
          </div>
        </div>
      ) : null}
      {card.step === "acquired" ? (
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center text-2xl font-black text-[var(--k-teal)]" data-testid="establishment-acquired">
          {t(DEFAULT_LOCALE, "establishment.acquired")}
        </motion.p>
      ) : null}
      {card.step === "declined" ? <p className="text-center text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "establishment.declined")}</p> : null}
    </CardShell>
  );
}

/**
 * Carte SERVICE : le joueur arrive sur l'établissement d'un autre joueur, y
 * consomme le service (séjour, repas, livre, ʿUmra, billet) et paie le
 * propriétaire. Montant = `establishment.serviceFee` (données). Bouton PAYER.
 */
export function ServiceCard({ state, profiles, card, onPay }: { readonly state: GameState; readonly profiles: readonly PlayerProfileDraft[]; readonly card: ServiceCardState; readonly onPay: () => void }) {
  const est = state.config.sites[card.siteId]?.establishment;
  const name = siteDisplayName(state, card.siteId);
  const owner = state.players.find((p) => p.id === card.ownerId)?.displayName ?? "";
  const visitor = state.players[state.activePlayerIndex];
  const money = visitor?.money ?? 0;
  const wholeFamily = est ? ownsWholeFamily(state, card.ownerId as PlayerId, est.family) : false;
  return (
    <CardShell cellType="heritage" title={name} subtitle={t(DEFAULT_LOCALE, "service.title", { owner })} testId="service-card">
      <Illustration state={state} siteId={card.siteId} />
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--k-sand)] px-4 py-3" data-testid="service-owner">
        <PlayerFace state={state} profiles={profiles} playerId={card.ownerId} />
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wider text-[var(--k-ink-soft)]">{t(DEFAULT_LOCALE, "establishment.ownedBy", { name: owner })}</span>
          {est ? <span className="block text-sm">{t(DEFAULT_LOCALE, "establishment.family", { family: familyLabel(est.family) })}</span> : null}
          {wholeFamily ? <span className="block text-xs font-semibold text-[var(--k-teal)]">{t(DEFAULT_LOCALE, "establishment.wholeFamily", { name: owner })}</span> : null}
        </span>
      </div>
      {est ? (
        <p className="text-center text-xl font-bold" data-testid="service-sentence">
          {serviceSentence(est.serviceType)}
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-3">
        <Stat label={t(DEFAULT_LOCALE, "service.cost")} value={formatKounouz(card.amount)} testId="service-amount" />
        <Stat label={t(DEFAULT_LOCALE, "establishment.yourKounouz")} value={formatKounouz(money)} testId="service-your-kounouz" />
      </dl>
      {card.step === "offer" ? (
        <div className="flex flex-col gap-2">
          {money < card.amount ? <p className="text-sm text-[var(--k-ruby)]">{t(DEFAULT_LOCALE, "service.partial")}</p> : null}
          <Button size="lg" onClick={onPay} data-testid="service-pay">
            {t(DEFAULT_LOCALE, "service.pay")} {formatKounouz(Math.min(money, card.amount))}
          </Button>
        </div>
      ) : null}
      {card.step === "paid" ? (
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center text-xl font-black text-[var(--k-ruby)]" data-testid="service-paid">
          {t(DEFAULT_LOCALE, "service.paid", { name: visitor?.displayName ?? "", amount: formatKounouz(card.paid ?? card.amount), owner })}
        </motion.p>
      ) : null}
    </CardShell>
  );
}
