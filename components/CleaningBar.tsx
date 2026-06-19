"use client";

import { useState } from "react";
import type { CleaningChange } from "@/lib/cleaning";
import { formatChange } from "@/lib/i18n";
import { Card } from "./ui";
import { useLang } from "./LanguageProvider";

export default function CleaningBar({
  changes,
  recommendedCount,
  onAuto,
  onUndo,
  onReset,
  busy = false,
}: {
  changes: CleaningChange[];
  recommendedCount: number;
  onAuto: () => void;
  onUndo: () => void;
  onReset: () => void;
  busy?: boolean;
}) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const applied = changes.length;

  return (
    <Card className="!p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onAuto}
          disabled={busy || recommendedCount === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-40"
          title={
            recommendedCount === 0
              ? t("cbAutoNone")
              : t("cbAutoTip", { n: recommendedCount })
          }
        >
          ✨ {t("cbAuto")}
          {recommendedCount > 0 ? (
            <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">
              {recommendedCount}
            </span>
          ) : null}
        </button>

        <button
          onClick={onUndo}
          disabled={busy || applied === 0}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground disabled:opacity-40"
        >
          {t("cbUndo")}
        </button>
        <button
          onClick={onReset}
          disabled={busy || applied === 0}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted transition hover:border-negative hover:text-negative disabled:opacity-40"
        >
          {t("cbReset")}
        </button>

        {applied > 0 ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto text-xs text-accent-strong hover:underline"
          >
            {open
              ? t("cbHideHistory", { n: applied })
              : t("cbShowHistory", { n: applied })}
          </button>
        ) : (
          <span className="ml-auto text-xs text-muted/70">{t("cbNoChanges")}</span>
        )}
      </div>

      {open && applied > 0 ? (
        <ol className="mt-3 space-y-1.5 border-t border-border pt-3">
          {changes.map((c, i) => (
            <li key={i} className="flex gap-2 text-xs text-muted">
              <span className="tabular-nums text-accent-strong">{i + 1}.</span>
              <span>{formatChange(lang, c)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}
