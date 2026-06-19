// components/ui.tsx
// Small presentational primitives shared across the dashboard.

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-5 ${className}`}
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
    <div className="mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
        {children}
      </h2>
      {hint ? <p className="mt-0.5 text-xs text-muted/70">{hint}</p> : null}
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
    <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          accent ? "text-accent" : "text-foreground"
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
  tone?: "neutral" | "accent" | "warn";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-muted border-border",
    accent: "bg-accent/15 text-accent-strong border-accent/30",
    warn: "bg-negative/15 text-negative border-negative/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
