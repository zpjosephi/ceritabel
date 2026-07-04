"use client";

import { useMemo, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import {
  runHypothesisTest,
  type ColType,
  type TestResult,
  type TestError,
} from "@/lib/inference";
import { fmtNum } from "@/lib/stats";
import type { ParsedDataset } from "@/lib/types";
import { Card, Badge } from "./ui";
import { useLang } from "./LanguageProvider";

interface Column {
  name: string;
  type: ColType;
}

export default function HypothesisTest({
  dataset,
  columns,
  modelId,
}: {
  dataset: ParsedDataset;
  columns: Column[];
  modelId: string;
}) {
  const { t, lang } = useLang();
  const [defA, defB] = pickDefaultPair(columns);
  const [a, setA] = useState(defA);
  const [b, setB] = useState(defB);

  const result = useMemo<TestResult | TestError | null>(() => {
    const colA = columns.find((c) => c.name === a);
    const colB = columns.find((c) => c.name === b);
    if (!colA || !colB || colA.name === colB.name) return null;
    return runHypothesisTest(dataset, colA, colB);
  }, [dataset, columns, a, b]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <FieldSelect label={t("hypoColA")} value={a} columns={columns} onChange={setA} />
        <span className="pb-1.5 text-muted">×</span>
        <FieldSelect label={t("hypoColB")} value={b} columns={columns} onChange={setB} />
      </div>

      {!result ? (
        <p className="text-sm text-muted">{t("hypoPickTwo")}</p>
      ) : result.kind === "error" ? (
        <p className="text-sm text-muted">{result.message}</p>
      ) : (
        <ResultView result={result} modelId={modelId} lang={lang} t={t} />
      )}
    </Card>
  );
}

function FieldSelect({
  label,
  value,
  columns,
  onChange,
}: {
  label: string;
  value: string;
  columns: Column[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground outline-none focus:border-accent"
      >
        {columns.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name} ({c.type === "numeric" ? "num" : "cat"})
          </option>
        ))}
      </select>
    </label>
  );
}

/** Choose a sensible default pair: two numerics (correlation) if possible,
 * else numeric × categorical, else the first two columns. Avoids the trivial
 * entity×time default on panel data. */
function pickDefaultPair(columns: Column[]): [string, string] {
  const num = columns.filter((c) => c.type === "numeric");
  if (num.length >= 2) return [num[0].name, num[1].name];
  const cat = columns.filter((c) => c.type === "categorical");
  if (num.length >= 1 && cat.length >= 1) return [num[0].name, cat[0].name];
  return [columns[0]?.name ?? "", columns[1]?.name ?? columns[0]?.name ?? ""];
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function testNameKey(kind: TestResult["kind"]): string {
  return kind === "ttest"
    ? "testTtest"
    : kind === "anova"
      ? "testAnova"
      : kind === "chisquare"
        ? "testChi"
        : "testCorr";
}

function ResultView({
  result,
  modelId,
  lang,
  t,
}: {
  result: TestResult;
  modelId: string;
  lang: string;
  t: Translate;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sig = result.pValue < 0.05;

  async function explain() {
    setExplaining(true);
    setError(null);
    setExplanation(null);
    try {
      const res = await fetch("/api/explain-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, model: modelId, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error");
      setExplanation(data.explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{t(testNameKey(result.kind))}</span>
        <Badge tone={sig ? "accent" : "neutral"}>
          {sig ? t("hypoSignificant") : t("hypoNotSig")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Metric label="p-value" value={formatP(result.pValue)} accent />
        <Stats result={result} t={t} />
      </div>

      {result.kind === "anova" || result.kind === "ttest" ? (
        <p className="mt-3 text-xs text-muted">
          {result.kind === "ttest"
            ? `${result.group1}: ${fmtNum(result.mean1)} · ${result.group2}: ${fmtNum(result.mean2)}`
            : result.groups
                .map((g) => `${g.label}: ${fmtNum(g.mean)}`)
                .join(" · ")}
        </p>
      ) : null}

      <div className="mt-4">
        {!explanation ? (
          <button
            onClick={explain}
            disabled={explaining}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent-strong transition hover:bg-accent/20 disabled:opacity-50"
          >
            <Sparkle weight="fill" size={15} aria-hidden />
            {explaining ? t("hypoExplaining") : t("hypoExplain")}
          </button>
        ) : (
          <p className="rounded-lg border border-accent/20 bg-accent/[0.06] px-3.5 py-3 text-sm leading-relaxed text-foreground/90">
            {explanation}
          </p>
        )}
        {error ? <p className="mt-2 text-sm text-negative">{error}</p> : null}
      </div>
    </div>
  );
}

function Stats({ result, t }: { result: TestResult; t: Translate }) {
  switch (result.kind) {
    case "ttest":
      return (
        <>
          <Metric label={`t (df=${fmtNum(result.df)})`} value={fmtNum(result.t)} />
          <Metric label={t("hypoMeanDiff")} value={fmtNum(result.meanDiff)} />
          <Metric label="Cohen's d" value={fmtNum(result.cohensD)} />
        </>
      );
    case "anova":
      return (
        <>
          <Metric
            label={`F (${result.dfBetween}, ${result.dfWithin})`}
            value={fmtNum(result.fStat)}
          />
          <Metric label="η²" value={fmtNum(result.etaSquared)} />
          <Metric label="n" value={result.groups.reduce((s, g) => s + g.n, 0)} />
        </>
      );
    case "chisquare":
      return (
        <>
          <Metric label={`χ² (df=${result.df})`} value={fmtNum(result.chi2)} />
          <Metric label="Cramér's V" value={fmtNum(result.cramersV)} />
          <Metric label="n" value={result.n} />
        </>
      );
    case "corr":
      return (
        <>
          <Metric label="r" value={fmtNum(result.r)} />
          <Metric label={`t (df=${result.df})`} value={fmtNum(result.t)} />
          <Metric label="n" value={result.n} />
        </>
      );
  }
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`tabular-nums ${accent ? "font-semibold text-accent" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function formatP(p: number): string {
  if (!Number.isFinite(p)) return "-";
  if (p < 0.0001) return "< 0.0001";
  return p.toFixed(4);
}
