"use client";

import { useEffect, useState } from "react";

/**
 * A single word that cycles through `words` with a restrained slide+fade swap.
 * CSS-only (no animation library); the global `prefers-reduced-motion` rule in
 * globals.css neutralizes the entry animation, and we also stop cycling so
 * reduced-motion users get a static first word.
 */
export default function Rotating({
  words,
  interval = 2200,
  className = "",
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setI((v) => (v + 1) % words.length),
      interval,
    );
    return () => clearInterval(id);
  }, [words, interval]);

  const word = words[i % words.length] ?? words[0] ?? "";

  return (
    <span className="rotating">
      {/* key={i} remounts the span so the entry animation replays each swap */}
      <span key={i} className={`rotating-word ${className}`}>
        {word}
      </span>
    </span>
  );
}
