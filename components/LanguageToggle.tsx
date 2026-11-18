"use client";

import { useLang } from "./LanguageProvider";
import type { Lang } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div
      className="inline-flex items-center gap-1 text-sm"
      role="group"
      aria-label="Bahasa / Language"
    >
      {(["id", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-sm px-1.5 py-1 font-medium uppercase transition-colors ${
            lang === l
              ? "text-foreground underline decoration-accent decoration-2 underline-offset-[6px]"
              : "text-muted hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
