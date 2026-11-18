"use client";

import type { AIInsight } from "@/lib/types";
import ModelPicker from "./ModelPicker";
import { useLang } from "./LanguageProvider";

export default function AIInsightPanel({
  insight,
  loading,
  error,
  stale = false,
  onRetry,
  onRefresh,
  modelId,
  onModelChange,
}: {
  insight: AIInsight | null;
  loading: boolean;
  error: string | null;
  stale?: boolean;
  onRetry: () => void;
  onRefresh?: () => void;
  modelId: string;
  onModelChange: (id: string) => void;
}) {
  const { t } = useLang();
  return (
    <section className="border-t-2 border-foreground/80 pt-4">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-serif text-xl font-semibold text-foreground">
          {t("aiInsight")}
        </h2>
        <div className="ml-auto">
          <ModelPicker
            value={modelId}
            onChange={onModelChange}
            disabled={loading}
          />
        </div>
      </div>

      {stale && !loading && insight ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-strong">
          <span>{t("aiStale")}</span>
          {onRefresh ? (
            <button
              onClick={onRefresh}
              className="ml-auto rounded-sm px-1 font-medium underline underline-offset-4 hover:text-foreground"
            >
              {t("aiRefresh")}
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && !insight ? (
        <div>
          <p className="mb-4 text-pretty text-sm leading-relaxed text-muted">
            {t("aiIdleDesc")}
          </p>
          <button
            onClick={onRetry}
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong active:translate-y-px"
          >
            {t("aiGenerate")}
          </button>
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="space-y-3">
          <p className="text-sm text-negative">{error}</p>
          <button
            onClick={onRetry}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-muted"
          >
            {t("tryAgain")}
          </button>
        </div>
      ) : null}

      {!loading && !error && insight ? (
        <InsightBody insight={insight} />
      ) : null}
    </section>
  );
}

function LoadingState() {
  const { t } = useLang();
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="text-sm text-muted">{t("aiLoading")}</p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-surface-2"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-semibold text-foreground">
      {children}
    </h3>
  );
}

function InsightBody({ insight }: { insight: AIInsight }) {
  const { t } = useLang();
  if (insight.raw && !insight.summary && insight.findings.length === 0) {
    return (
      <p className="whitespace-pre-wrap font-serif text-[1.05rem] leading-relaxed text-foreground/90">
        {insight.raw}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {insight.summary ? (
        <section>
          <SectionLabel>{t("aiStory")}</SectionLabel>
          <p className="text-pretty font-serif text-[1.08rem] leading-relaxed text-foreground">
            {insight.summary}
          </p>
        </section>
      ) : null}

      {insight.findings.length > 0 ? (
        <section>
          <SectionLabel>{t("aiFindings")}</SectionLabel>
          <ul className="divide-y divide-border">
            {insight.findings.map((f, i) => (
              <li
                key={i}
                className="py-2.5 text-pretty text-sm leading-relaxed text-foreground/90 first:pt-0"
              >
                {f}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {insight.suggestions.length > 0 ? (
        <section>
          <SectionLabel>{t("aiSuggestions")}</SectionLabel>
          <ol className="divide-y divide-border">
            {insight.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex gap-3 py-2.5 text-sm leading-relaxed text-foreground/90 first:pt-0"
              >
                <span className="tnum shrink-0 font-mono text-muted">{i + 1}.</span>
                <span className="text-pretty">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
