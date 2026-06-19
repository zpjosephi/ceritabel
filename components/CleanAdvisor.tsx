"use client";

import { useState } from "react";
import type { CleaningAction } from "@/lib/cleaning";
import type { AdviceProblem } from "@/lib/prompt";
import type { StatsSummary } from "@/lib/types";
import { Card } from "./ui";
import { useLang } from "./LanguageProvider";

interface Recommendation {
  action: CleaningAction;
  reason: string;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function strategyLabel(s: string, t: Translate): string {
  return s === "median"
    ? t("advStratMedian")
    : s === "mean"
      ? t("advStratMean")
      : s === "mode"
        ? t("advStratMode")
        : t("advStratDrop");
}

function labelFor(a: CleaningAction, t: Translate): string {
  switch (a.op) {
    case "dropDuplicates":
      return t("advLabelDropDup");
    case "fillMissing":
      return t("advLabelFill", {
        col: a.column,
        strategy: strategyLabel(a.strategy, t),
      });
    case "normalizeCategory":
      return t("advLabelNormalize", { col: a.column });
    case "dropColumn":
      return t("advLabelDropCol", { col: a.column });
  }
}

export default function CleanAdvisor({
  summary,
  problems,
  modelId,
  onApply,
}: {
  summary: StatsSummary;
  problems: AdviceProblem[];
  modelId: string;
  onApply: (actions: CleaningAction[]) => void;
}) {
  const { t, lang } = useLang();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);

  const noProblems = problems.length === 0;

  async function requestAdvice() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/clean-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, problems, model: modelId, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("advFail"));
      const r: Recommendation[] = data.recommendations ?? [];
      setRecs(r);
      setChecked(r.map(() => true));
      setAiSummary(data.summary ?? "");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("advFail"));
      setStatus("error");
    }
  }

  function applySelected() {
    const selected = recs.filter((_, i) => checked[i]).map((r) => r.action);
    if (selected.length === 0) return;
    onApply(selected);
    // Recommendations are stale once applied — clear and let the user re-ask.
    setRecs([]);
    setChecked([]);
    setAiSummary("");
    setStatus("idle");
  }

  const selectedCount = checked.filter(Boolean).length;

  return (
    <Card className="border-accent/30 bg-gradient-to-b from-accent/[0.07] to-surface">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-base">🤖</span>
        <h3 className="text-sm font-semibold text-foreground">
          {t("advTitle")}
        </h3>
        {status !== "done" ? (
          <button
            onClick={requestAdvice}
            disabled={status === "loading" || noProblems}
            className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-40"
            title={noProblems ? t("advNoProblems") : undefined}
          >
            {status === "loading" ? t("advAnalyzing") : t("advAsk")}
          </button>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-muted">{t("advDesc")}</p>

      {noProblems ? (
        <p className="mt-3 text-sm text-muted">{t("advClean")}</p>
      ) : null}

      {status === "error" && error ? (
        <p className="mt-3 text-sm text-negative">{error}</p>
      ) : null}

      {status === "done" ? (
        <div className="mt-4 space-y-3">
          {aiSummary ? (
            <p className="rounded-lg border-l-2 border-accent/50 bg-surface-2/40 px-3 py-2 text-sm text-foreground/90">
              {aiSummary}
            </p>
          ) : null}

          {recs.length === 0 ? (
            <p className="text-sm text-muted">{t("advNoRecs")}</p>
          ) : (
            <>
              <ul className="space-y-2">
                {recs.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-transparent bg-surface-2/40 px-3 py-2.5 transition hover:border-accent/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked[i] ?? false}
                      onChange={(e) =>
                        setChecked((prev) => {
                          const next = [...prev];
                          next[i] = e.target.checked;
                          return next;
                        })
                      }
                      className="mt-1 accent-[#7c5cfc]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {labelFor(r.action, t)}
                      </div>
                      {r.reason ? (
                        <p className="mt-0.5 text-xs text-muted">{r.reason}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={applySelected}
                  disabled={selectedCount === 0}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-40"
                >
                  {t("advApply", { n: selectedCount })}
                </button>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setRecs([]);
                  }}
                  className="text-xs text-muted hover:text-foreground"
                >
                  {t("cancel")}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Card>
  );
}
