"use client";

import { useMemo, useState } from "react";
import { Sparkle, Check, Warning } from "@phosphor-icons/react";
import {
  runRegression,
  fixedEffects,
  randomEffects,
  hausmanTest,
  classicalAssumptions,
} from "@/lib/regression";
import { fmtNum } from "@/lib/stats";
import type { ParsedDataset } from "@/lib/types";
import { Card, Badge } from "./ui";
import { useLang } from "./LanguageProvider";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** R-style significance stars. */
function stars(p: number): string {
  if (!Number.isFinite(p)) return "";
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  if (p < 0.1) return ".";
  return "";
}

function formatP(p: number): string {
  if (!Number.isFinite(p)) return "-";
  if (p < 0.0001) return "<0.0001";
  return p.toFixed(4);
}

export default function MultipleRegression({
  dataset,
  numericCols,
  target,
  onTargetChange,
  modelId,
  panelEntity,
  panelTime,
}: {
  dataset: ParsedDataset;
  numericCols: string[];
  target: string;
  onTargetChange: (v: string) => void;
  modelId: string;
  panelEntity?: string;
  panelTime?: string;
}) {
  const { t, lang } = useLang();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"pooled" | "fe" | "re">(
    panelEntity ? "fe" : "pooled",
  );

  // Usable columns exclude the entity/time columns when this is panel data.
  const usableCols = useMemo(
    () => numericCols.filter((c) => c !== panelEntity && c !== panelTime),
    [numericCols, panelEntity, panelTime],
  );
  const yCol = usableCols.includes(target) ? target : usableCols[0] ?? "";

  const result = useMemo(() => {
    const xs = usableCols.filter((c) => c !== yCol);
    if (panelEntity && method === "fe") return fixedEffects(dataset, yCol, xs, panelEntity);
    if (panelEntity && method === "re") return randomEffects(dataset, yCol, xs, panelEntity);
    return runRegression(dataset, yCol, xs);
  }, [dataset, usableCols, yCol, method, panelEntity]);

  // Classical OLS assumption tests (normality, VIF, hetero, autocorrelation).
  const assumptions = useMemo(() => {
    const xs = usableCols.filter((c) => c !== yCol);
    return classicalAssumptions(dataset, yCol, xs);
  }, [dataset, usableCols, yCol]);

  // Hausman test (FE vs RE) - only for panel data.
  const hausman = useMemo(() => {
    if (!panelEntity) return null;
    const xs = usableCols.filter((c) => c !== yCol);
    const fe = fixedEffects(dataset, yCol, xs, panelEntity);
    const re = randomEffects(dataset, yCol, xs, panelEntity);
    if (fe.kind !== "ols" || re.kind !== "ols") return null;
    return hausmanTest(fe, re);
  }, [dataset, usableCols, yCol, panelEntity]);

  async function explain() {
    if (result.kind !== "ols") return;
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

  if (usableCols.length < 2) {
    return (
      <Card>
        <p className="text-sm text-muted">{t("regNeedNumeric")}</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">{t("regTargetLabel")}</span>
          <select
            value={yCol}
            onChange={(e) => onTargetChange(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground outline-none focus:border-accent"
          >
            {usableCols.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {panelEntity ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t("regMethod")}</span>
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
              {(["fe", "re", "pooled"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    method === m ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground"
                  }`}
                >
                  {m === "fe" ? t("regFE") : m === "re" ? t("regRE") : t("regPooled")}
                </button>
              ))}
            </div>
          </label>
        ) : null}
      </div>
      <p className="mb-1 text-xs text-muted">{t("regPredictorsNote")}</p>
      {panelEntity && method === "fe" ? (
        <p className="mb-2 text-xs text-accent-strong">
          {t("regFENote", { entity: panelEntity })}
        </p>
      ) : (
        <div className="mb-2" />
      )}

      {panelEntity && hausman ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">{t("hausman")}</span>
          <span className="text-muted">
            χ²({hausman.df}) = {fmtNum(hausman.stat)}, p = {formatP(hausman.pValue)}
          </span>
          <span className="ml-auto font-medium text-accent-strong">
            → {hausman.prefer === "fe" ? t("hausmanFe") : t("hausmanRe")}
          </span>
        </div>
      ) : null}

      {result.kind === "error" ? (
        <p className="text-sm text-negative">{result.message}</p>
      ) : (
        <>
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">{t("regTerm")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("regCoef")}</th>
                  <th className="px-3 py-2 text-right font-medium">Std.err</th>
                  <th className="px-3 py-2 text-right font-medium">t</th>
                  <th className="px-3 py-2 text-right font-medium">p-value</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {result.terms.map((term) => (
                  <tr key={term.name} className="hover:bg-surface-2/50">
                    <td className="px-3 py-1.5 text-foreground">{term.name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-foreground">
                      {fmtNum(term.coef)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted">
                      {fmtNum(term.se)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted">
                      {fmtNum(term.t)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-foreground">
                      {formatP(term.p)}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-accent-strong">
                      {stars(term.p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <Metric
              label={result.method === "fe" ? t("regWithinR2") : "R²"}
              value={fmtNum(result.r2)}
              accent
            />
            <Metric label="Adj. R²" value={fmtNum(result.adjR2)} />
            <Metric
              label={`${t("regOverall")} (${result.fDf1}, ${result.fDf2})`}
              value={fmtNum(result.fStat)}
            />
            <Metric label="p (F)" value={formatP(result.fPValue)} />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Badge tone={result.fPValue < 0.05 ? "accent" : "neutral"}>
              {result.fPValue < 0.05 ? t("regSig") : t("regNotSig")}
            </Badge>
            <span className="text-xs text-muted">
              n = {result.n} · {result.predictors.length} {t("regTerm").toLowerCase()}
            </span>
          </div>

          {assumptions.kind === "assumptions" ? (
            <div className="mt-5">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-strong">
                {t("assumTitle")}
              </h4>
              <ul className="space-y-1.5">
                <AssumRow
                  label={t("assumNormality")}
                  detail={`JB=${fmtNum(assumptions.normality.jb)}, p=${formatP(assumptions.normality.p)}`}
                  ok={assumptions.normality.ok}
                  t={t}
                />
                <AssumRow
                  label={t("assumVif")}
                  detail={`${t("assumVifMax")}=${fmtNum(Math.max(...assumptions.vif.map((v) => v.vif)))}`}
                  ok={assumptions.vif.every((v) => v.vif < 10)}
                  t={t}
                />
                <AssumRow
                  label={t("assumHetero")}
                  detail={`BP=${fmtNum(assumptions.hetero.bp)}, p=${formatP(assumptions.hetero.p)}`}
                  ok={assumptions.hetero.ok}
                  t={t}
                />
                <AssumRow
                  label={t("assumAutocorr")}
                  detail={`DW=${fmtNum(assumptions.durbinWatson)} · ${t("assumDwNote")}`}
                  ok={assumptions.durbinWatson > 1.5 && assumptions.durbinWatson < 2.5}
                  t={t}
                />
              </ul>
            </div>
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
        </>
      )}
    </Card>
  );
}

function AssumRow({
  label,
  detail,
  ok,
  t,
}: {
  label: string;
  detail: string;
  ok: boolean;
  t: Translate;
}) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-transparent bg-surface-2/40 px-3 py-2 text-sm transition hover:border-accent/40">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted">{detail}</span>
      <Badge tone={ok ? "accent" : "warn"}>
        <span className="inline-flex items-center gap-1">
          {ok ? (
            <Check size={12} weight="bold" aria-hidden />
          ) : (
            <Warning size={12} weight="bold" aria-hidden />
          )}
          {ok ? t("assumPass") : t("assumFail")}
        </span>
      </Badge>
    </li>
  );
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
