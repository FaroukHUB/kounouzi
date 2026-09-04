"use client";

import { motion } from "motion/react";
import { animationFamily } from "./families";

/**
 * Petite mise en scène au-dessus d'une question (0,4 à 1,2 s), pilotée par la
 * clé d'animation de la carte. Formes géométriques uniquement, transform et
 * opacity, non bloquante ; réduite à un simple fondu si l'utilisateur préfère
 * moins d'animations. Aucune influence sur le jeu.
 */
export function CardAnimation({ animationKey, reduced, accent }: { readonly animationKey: string | undefined; readonly reduced: boolean; readonly accent: string }) {
  const family = animationFamily(animationKey);
  const d = reduced ? 0 : 0.8;
  const box = "relative mx-auto flex h-20 w-full max-w-[16rem] items-center justify-center";
  const wrap = (children: React.ReactNode) => (
    <div className={box} data-testid="card-animation" data-family={family} aria-hidden="true">
      {children}
    </div>
  );
  const tile = (i: number, extra = "") => <motion.span key={i} className={`h-12 w-9 rounded-lg border-2 bg-white/80 ${extra}`} style={{ borderColor: accent }} initial={{ opacity: 0, y: 12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: d * 0.5, delay: reduced ? 0 : i * 0.12 }} />;

  switch (family) {
    case "chest":
      return wrap(
        <>
          <motion.span className="absolute size-24 rounded-full" style={{ background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)` }} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1.2 }} transition={{ duration: d }} />
          <motion.span className="relative h-12 w-16 rounded-b-xl rounded-t-md" style={{ backgroundColor: accent }} initial={{ scaleY: 0.6, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ duration: d * 0.5 }} />
          <motion.span className="absolute h-5 w-16 origin-bottom rounded-t-xl" style={{ backgroundColor: accent, top: "1.5rem", filter: "brightness(1.2)" }} initial={{ rotateX: 0 }} animate={{ rotateX: reduced ? 0 : -70 }} transition={{ duration: d, delay: reduced ? 0 : 0.3 }} />
        </>,
      );
    case "versus":
      return wrap(
        <>
          <motion.span className="h-14 w-10 rounded-lg border-2 bg-white/80" style={{ borderColor: accent }} initial={{ x: -60, opacity: 0 }} animate={{ x: -12, opacity: 1 }} transition={{ duration: d * 0.6 }} />
          <motion.span className="font-display z-10 mx-1 rounded-full px-2 py-1 text-sm font-black text-white" style={{ backgroundColor: accent }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: reduced ? 0 : 0.4, duration: d * 0.4 }}>
            VS
          </motion.span>
          <motion.span className="h-14 w-10 rounded-lg border-2 bg-white/80" style={{ borderColor: accent }} initial={{ x: 60, opacity: 0 }} animate={{ x: 12, opacity: 1 }} transition={{ duration: d * 0.6 }} />
        </>,
      );
    case "shield":
      return wrap(<motion.span className="size-16 rounded-b-[45%] rounded-t-md" style={{ backgroundColor: accent, boxShadow: `0 0 24px ${accent}` }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1.1, 1], opacity: 1 }} transition={{ duration: d }} />);
    case "flip":
      return wrap(<motion.span className="h-16 w-11 rounded-lg border-2 bg-white/80" style={{ borderColor: accent, transformStyle: "preserve-3d" }} initial={{ rotateY: 0 }} animate={{ rotateY: reduced ? 0 : 360 }} transition={{ duration: d, ease: "easeInOut" }} />);
    case "intruder":
      return wrap(<span className="flex gap-2">{[0, 1, 2, 3].map((i) => tile(i))}</span>);
    case "door":
      return wrap(
        <span className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-16 w-10 origin-left rounded-t-full border-2 bg-white/80" style={{ borderColor: accent }} initial={{ rotateY: 0, opacity: 0 }} animate={{ rotateY: i === 1 && !reduced ? -60 : 0, opacity: 1 }} transition={{ duration: d, delay: reduced ? 0 : 0.2 }} />
          ))}
        </span>,
      );
    case "levels":
      return wrap(
        <span className="flex flex-col-reverse items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-4 rounded" style={{ width: `${8 - i * 2}rem`, backgroundColor: accent, opacity: 1 - i * 0.2 }} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 - i * 0.2 }} transition={{ duration: d * 0.4, delay: reduced ? 0 : i * 0.2 }} />
          ))}
        </span>,
      );
    case "arrow":
      return wrap(
        <>
          <span className="absolute h-1 w-40 rounded-full" style={{ backgroundColor: `${accent}55` }} />
          <motion.span className="size-5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 14px ${accent}` }} initial={{ x: -80 }} animate={{ x: reduced ? 0 : 80 }} transition={{ duration: d, ease: "easeInOut" }} />
        </>,
      );
    case "seal":
      return wrap(<motion.span className="flex size-16 items-center justify-center rounded-full border-4 border-dashed" style={{ borderColor: accent }} initial={{ scale: 1.8, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: d * 0.5, type: "spring", stiffness: 260, damping: 14 }}><span className="size-6 rounded-full" style={{ backgroundColor: accent }} /></motion.span>);
    case "scan":
      return wrap(
        <>
          <span className="h-14 w-40 rounded-xl border-2" style={{ borderColor: `${accent}77` }} />
          <motion.span className="absolute h-14 w-1 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }} initial={{ x: -76 }} animate={{ x: reduced ? 0 : 76 }} transition={{ duration: d, ease: "easeInOut" }} />
        </>,
      );
    case "ripple":
      return wrap(
        <>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute size-10 rounded-full border-2" style={{ borderColor: accent }} initial={{ scale: 0.5, opacity: 0.8 }} animate={{ scale: reduced ? 1 : 2.4, opacity: 0 }} transition={{ duration: d * 1.4, delay: reduced ? 0 : i * 0.3 }} />
          ))}
          <span className="size-6 rounded-full" style={{ backgroundColor: accent }} />
        </>,
      );
    case "spark":
      return wrap(<motion.span className="size-8 rotate-45 rounded-sm" style={{ backgroundColor: accent, boxShadow: `0 0 20px ${accent}` }} initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.3, 1], opacity: 1 }} transition={{ duration: d * 0.7 }} />);
  }
}
