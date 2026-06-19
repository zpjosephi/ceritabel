"use client";

import { useLang } from "./LanguageProvider";
import type { Lang } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs"
      role="group"
      aria-label="Bahasa / Language"
    >
      {(["id", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-md px-2 py-1 font-semibold uppercase transition ${
            lang === l
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
