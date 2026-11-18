// components/ui.tsx
// Small presentational primitives shared across the dashboard.

import type { ReactNode } from "react";

/** The ceritabel bar-chart mark. */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="6.5" y="5" width="3" height="10" rx="1" fill="currentColor" />
      <rect x="12" y="2" width="3" height="13" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
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
    <div className="mb-4">
      <h2 className="font-serif text-xl font-semibold leading-tight text-foreground">
        {children}
      </h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
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
    <div className="border-t border-border pt-3">
      <div className="text-sm text-muted">{label}</div>
      <div
        className={`tnum mt-1.5 font-mono text-[1.75rem] leading-none ${
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
    accent: "bg-surface-3 text-foreground border-border-strong",
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
