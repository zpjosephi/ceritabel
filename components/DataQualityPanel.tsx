"use client";

import type {
  DataQualityIssue,
  DataQualityReport,
  IssueSeverity,
} from "@/lib/dataQuality";
import type { CleaningAction } from "@/lib/cleaning";
import { formatIssue } from "@/lib/i18n";
import { Card } from "./ui";
import { useLang } from "./LanguageProvider";

const SEV_STYLE: Record<IssueSeverity, { dot: string; chip: string }> = {
  high: { dot: "bg-negative", chip: "bg-negative/15 text-negative" },
  medium: { dot: "bg-warning", chip: "bg-warning/15 text-warning-strong" },
  low: { dot: "bg-muted", chip: "bg-surface-2 text-muted" },
};

const SEV_KEY: Record<IssueSeverity, string> = {
  high: "sevHigh",
  medium: "sevMedium",
  low: "sevLow",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-positive";
  if (score >= 50) return "text-warning-strong";
  return "text-negative";
}

export default function DataQualityPanel({
  report,
  onAction,
  busy = false,
}: {
  report: DataQualityReport;
  onAction?: (action: CleaningAction) => void;
  busy?: boolean;
}) {
  const { t } = useLang();
  const { score, issues } = report;
  const counts = {
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  };

  return (
    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ScoreRing score={score} />
          <div>
            <div className="text-sm font-medium text-foreground">
              {t("qScore")}
            </div>
            <div className="text-xs text-muted">
              {issues.length === 0
                ? t("qNoIssues")
                : t("qIssueCount", { n: issues.length })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {(["high", "medium", "low"] as IssueSeverity[]).map((sev) =>
            counts[sev] > 0 ? (
              <span
                key={sev}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${SEV_STYLE[sev].chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${SEV_STYLE[sev].dot}`} />
                {counts[sev]} {t(SEV_KEY[sev])}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {issues.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              onAction={onAction}
              busy={busy}
            />
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const stroke =
    score >= 80
      ? "var(--positive)"
      : score >= 50
        ? "var(--warning)"
        : "var(--negative)";
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--chart-grid)"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums ${scoreColor(score)}`}
      >
        {score}
      </span>
    </div>
  );
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Build the fix buttons appropriate for an issue. */
function actionsFor(
  issue: DataQualityIssue,
  t: Translate,
): { label: string; action: CleaningAction }[] {
  const col = issue.column;
  switch (issue.kind) {
    case "duplicateRows":
      return [{ label: t("actDropDup"), action: { op: "dropDuplicates" } }];
    case "missing":
      if (!col) return [];
      if (issue.meta.type === "numeric") {
        return [
          { label: t("actFillMedian"), action: { op: "fillMissing", column: col, strategy: "median" } },
          { label: t("actFillMean"), action: { op: "fillMissing", column: col, strategy: "mean" } },
          { label: t("actDropRows"), action: { op: "fillMissing", column: col, strategy: "drop" } },
        ];
      }
      return [
        { label: t("actFillMode"), action: { op: "fillMissing", column: col, strategy: "mode" } },
        { label: t("actDropRows"), action: { op: "fillMissing", column: col, strategy: "drop" } },
      ];
    case "inconsistentCategory":
      if (!col) return [];
      return [{ label: t("actNormalize"), action: { op: "normalizeCategory", column: col } }];
    case "constantColumn":
    case "emptyColumn":
    case "idLike":
      if (!col) return [];
      return [{ label: t("actDropCol"), action: { op: "dropColumn", column: col } }];
    default:
      return [];
  }
}

function IssueRow({
  issue,
  onAction,
  busy,
}: {
  issue: DataQualityIssue;
  onAction?: (action: CleaningAction) => void;
  busy: boolean;
}) {
  const { t, lang } = useLang();
  const s = SEV_STYLE[issue.severity];
  const actions = onAction ? actionsFor(issue, t) : [];
  const { title, detail } = formatIssue(lang, issue);
  return (
    <li className="group flex items-start gap-3 rounded-lg border border-transparent bg-surface-2/40 px-3 py-2.5 transition-all duration-150 hover:border-accent/40 hover:bg-surface-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {issue.column ? (
            <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-accent-strong">
              {issue.column}
            </code>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted">{detail}</p>

        {actions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => onAction?.(a.action)}
                disabled={busy}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition hover:border-accent hover:text-accent-strong disabled:opacity-50"
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
