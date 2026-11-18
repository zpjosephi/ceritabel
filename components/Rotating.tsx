"use client";

import { useEffect, useState } from "react";

/**
 * One word that cycles through `words`. Every word sits in the same grid cell
 * and only the active one is visible, so the cell is as wide as the longest
 * word and the rest of the headline never reflows. Screen readers skip it
 * (the heading carries a static aria-label), and reduced-motion users get the
 * first word only.
 */
export default function Rotating({
  words,
  interval = 2600,
  className = "",
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setActive((v) => (v + 1) % words.length),
      interval,
    );
    return () => clearInterval(id);
  }, [words, interval]);

  return (
    <span className={`rotating ${className}`} aria-hidden>
      {words.map((w, i) => (
        // the active word gets a fresh key each turn so its entry animation replays
        <span
          key={i === active ? `on-${active}` : i}
          className={i === active ? "rotating-word is-on" : "rotating-word"}
        >
          {w}
        </span>
      ))}
    </span>
  );
}
