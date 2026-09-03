import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary: "bg-[var(--k-teal)] text-white shadow-[0_8px_24px_-8px_rgba(15,118,110,0.6)] hover:bg-[var(--k-teal-dark)] active:scale-[0.98]",
  secondary: "bg-white text-[var(--k-ink)] border border-[var(--k-line)] hover:bg-[var(--k-sand-dark)] active:scale-[0.98]",
  ghost: "bg-transparent text-[var(--k-ink)] hover:bg-black/5 active:scale-[0.98]",
  danger: "bg-[var(--k-ruby)] text-white hover:brightness-95 active:scale-[0.98]",
};

const SIZE: Record<Size, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
  xl: "min-h-16 px-8 text-xl",
};

/** Bouton tactile (cible ≥ 44 px), sans utilitaire directionnel physique. */
export function Button({ variant = "primary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  const classes = ["inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:opacity-40 disabled:pointer-events-none select-none touch-manipulation", VARIANT[variant], SIZE[size], className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
