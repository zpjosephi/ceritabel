"use client";

import { Sparkle } from "@phosphor-icons/react";
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
    <div className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/10 to-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkle
          aria-hidden
          weight="duotone"
          className="text-accent-strong"
          size={18}
        />
        <h2 className="font-semibold text-foreground">{t("aiInsight")}</h2>
        <div className="ml-auto">
          <ModelPicker
            value={modelId}
            onChange={onModelChange}
            disabled={loading}
          />
        </div>
      </div>

      {stale && !loading && insight ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          <span>{t("aiStale")}</span>
          {onRefresh ? (
            <button
              onClick={onRefresh}
              className="ml-auto rounded-md bg-amber-400/20 px-2 py-1 font-medium text-amber-100 hover:bg-amber-400/30"
            >
              {t("aiRefresh")}
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && !insight ? (
        <div className="py-2">
          <p className="mb-3 text-sm text-muted">{t("aiIdleDesc")}</p>
          <button
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-ink shadow-[0_8px_24px_-6px_var(--accent-glow)] transition duration-200 hover:bg-accent-strong active:scale-[0.99]"
          >
            <Sparkle weight="fill" size={16} aria-hidden />
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
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-strong"
          >
            {t("tryAgain")}
          </button>
        </div>
      ) : null}

      {!loading && !error && insight ? (
        <InsightBody insight={insight} />
      ) : null}
    </div>
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
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-strong">
      {children}
    </h3>
  );
}

function InsightBody({ insight }: { insight: AIInsight }) {
  const { t } = useLang();
  if (insight.raw && !insight.summary && insight.findings.length === 0) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {insight.raw}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {insight.summary ? (
        <section>
          <SectionLabel>{t("aiStory")}</SectionLabel>
          {/* Lead paragraph, set apart as a full accent-tinted callout. */}
          <p className="rounded-lg border border-accent/20 bg-accent/[0.06] px-3.5 py-3 text-sm leading-relaxed text-foreground/90">
            {insight.summary}
          </p>
        </section>
      ) : null}

      {insight.findings.length > 0 ? (
        <section>
          <SectionLabel>{t("aiFindings")}</SectionLabel>
          <ul className="space-y-2">
            {insight.findings.map((f, i) => (
              <li
                key={i}
                className="group flex gap-3 rounded-lg border border-transparent bg-surface-2/40 px-3 py-2.5 text-sm leading-relaxed text-foreground/90 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-2 hover:shadow-lg hover:shadow-accent/10"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent transition-transform group-hover:scale-150" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {insight.suggestions.length > 0 ? (
        <section>
          <SectionLabel>{t("aiSuggestions")}</SectionLabel>
          <ol className="space-y-2">
            {insight.suggestions.map((s, i) => (
              <li
                key={i}
                className="group flex gap-3 rounded-lg border border-transparent bg-surface-2/40 px-3 py-2.5 text-sm leading-relaxed text-foreground/90 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-2 hover:shadow-lg hover:shadow-accent/10"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold tabular-nums text-accent-strong transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
