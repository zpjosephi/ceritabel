// components/ui.tsx
// Small presentational primitives shared across the dashboard.

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  /** Opt-in lift-on-hover for interactive / clickable cards. */
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-sm)] ${
        hover ? "card-lift" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2.5">
      {/* Accent tick replaces the generic all-caps-muted label pattern. */}
      <span
        aria-hidden
        className="mt-1 h-3.5 w-0.5 shrink-0 rounded-full bg-accent/70"
      />
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {children}
        </h2>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="card-lift rounded-lg border border-border bg-surface-2 px-4 py-3 shadow-[var(--shadow-sm)]">
      <div className="tele text-[11px] text-muted">{label}</div>
      <div
        className={`tnum mt-1 text-2xl font-semibold tracking-tight ${
          accent ? "text-accent-strong" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-muted-strong border-border",
    accent: "bg-accent/15 text-accent-strong border-accent/30",
    warn: "bg-warning/15 text-warning-strong border-warning/30",
    danger: "bg-negative/15 text-negative border-negative/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
