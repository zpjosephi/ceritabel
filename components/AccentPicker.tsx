"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Resolved accent colors for use in JS-driven contexts (Recharts fills, canvas,
 * inline SVG) that can't read CSS variables directly. Re-reads on every accent
 * switch so charts recolor in real time.
 */
export function useAccentColors() {
  const [c, setC] = useState({
    accent: "#d62a23",
    strong: "#ff5d54",
    soft: "rgba(214,42,35,0.13)",
  });
  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      setC({
        accent: s.getPropertyValue("--accent").trim() || "#d62a23",
        strong: s.getPropertyValue("--accent-strong").trim() || "#ff5d54",
        soft:
          s.getPropertyValue("--accent-soft").trim() || "rgba(214,42,35,0.13)",
      });
    };
    read();
    window.addEventListener("accentchange", read);
    return () => window.removeEventListener("accentchange", read);
  }, []);
  return c;
}

/** Accent themes — id must match the html[data-accent="…"] blocks in globals.css. */
export const ACCENTS = [
  { id: "amber", label: "Amber", swatch: "#e0a44a" },
  { id: "teal", label: "Teal", swatch: "#22c0ad" },
  { id: "coral", label: "Coral", swatch: "#f2603f" },
  { id: "lime", label: "Lime", swatch: "#b5e048" },
  { id: "hazard", label: "Hazard", swatch: "#d62a23" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

const STORAGE_KEY = "ceritabel-accent";
const DEFAULT_ACCENT: AccentId = "hazard";

/** Apply + persist an accent. Safe to call from anywhere on the client. */
export function setAccent(id: AccentId) {
  document.documentElement.dataset.accent = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode / storage disabled — theme still applies for this session */
  }
  // Let any other mounted pickers update their active state.
  window.dispatchEvent(new CustomEvent("accentchange", { detail: id }));
}

/** Subscribe to accent changes (the same custom event setAccent dispatches). */
function subscribeAccent(cb: () => void) {
  window.addEventListener("accentchange", cb);
  return () => window.removeEventListener("accentchange", cb);
}
function getActiveAccent(): AccentId {
  return (document.documentElement.dataset.accent as AccentId) ?? DEFAULT_ACCENT;
}

/**
 * Row of accent swatches. Switches the whole app's accent in real time and
 * remembers the choice. Pair it with the language toggle in page headers.
 *
 * The active swatch reads straight from the live accent store (the <html>
 * data-accent attribute + accentchange event) via useSyncExternalStore — no
 * effect, no cascading render, and SSR renders the default cleanly.
 */
export default function AccentPicker({ className = "" }: { className?: string }) {
  const active = useSyncExternalStore(
    subscribeAccent,
    getActiveAccent,
    () => DEFAULT_ACCENT,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Warna aksen"
      className={`flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2 py-1.5 backdrop-blur ${className}`}
    >
      {ACCENTS.map((a) => {
        const isActive = a.id === active;
        return (
          <button
            key={a.id}
            role="radio"
            aria-checked={isActive}
            aria-label={a.label}
            title={a.label}
            onClick={() => setAccent(a.id)}
            className="relative grid h-5 w-5 place-items-center rounded-full transition active:scale-90"
          >
            <span
              className="h-3.5 w-3.5 rounded-full transition-transform"
              style={{
                background: a.swatch,
                transform: isActive ? "scale(1)" : "scale(0.82)",
                boxShadow: isActive
                  ? `0 0 0 2px var(--background), 0 0 0 3.5px ${a.swatch}`
                  : "none",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
