"use client";

import { useSyncExternalStore } from "react";
import { useSessionStore } from "@/state/sessionStore";
import { resolveTimings, type Timings } from "./timings";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(QUERY).matches : false);
const getServerSnapshot = () => false;

/** Réglage explicite de l'utilisateur, sinon `prefers-reduced-motion` de l'appareil. */
export function useReducedMotion(): boolean {
  const preference = useSessionStore((s) => s.reducedMotion);
  const system = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return preference ?? system;
}

export function useTimings(): Timings {
  return resolveTimings(useReducedMotion());
}
