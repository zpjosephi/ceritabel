"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CsvParseError } from "@/lib/csv";
import { parseUpload, type SheetData } from "@/lib/upload";
import { analyzeDataset, detectColumnKind, type FullAnalysis } from "@/lib/stats";
import { scanDataQuality, type DataQualityReport } from "@/lib/dataQuality";
import {
  replay,
  recommendedActions,
  type CleaningAction,
  type CleaningChange,
} from "@/lib/cleaning";
import type { AIInsight, ColumnKind, ParsedDataset } from "@/lib/types";
import FileUpload, { type SampleDataset } from "@/components/FileUpload";
import DatasetOverview from "@/components/DatasetOverview";
import ColumnSummary from "@/components/ColumnSummary";
import CorrelationHeatmap from "@/components/CorrelationHeatmap";
import ScatterPlot from "@/components/ScatterPlot";
import HypothesisTest from "@/components/HypothesisTest";
import MultipleRegression from "@/components/MultipleRegression";
import PanelAnalysis from "@/components/PanelAnalysis";
import TimeSeriesAnalysis from "@/components/TimeSeriesAnalysis";
import ShapeSelector from "@/components/ShapeSelector";
import ColumnSelector from "@/components/ColumnSelector";
import SummaryCard from "@/components/SummaryCard";
import DataPreview from "@/components/DataPreview";
import ExportPanel from "@/components/ExportPanel";
import AIInsightPanel from "@/components/AIInsightPanel";
import ChatPanel from "@/components/ChatPanel";
import DataQualityPanel from "@/components/DataQualityPanel";
import CleaningBar from "@/components/CleaningBar";
import CleanAdvisor from "@/components/CleanAdvisor";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import { useLang } from "@/components/LanguageProvider";
import { Card, SectionTitle } from "@/components/ui";
import { detectShape, type DataShape } from "@/lib/shape";
import { findTimeColumn } from "@/lib/panel";
import type { CodegenOptions } from "@/lib/codegen";
import { DEFAULT_MODEL_ID } from "@/lib/config";

type Stage = "upload" | "analyzing" | "sheets" | "result";

const SAMPLES: SampleDataset[] = [
  {
    file: "/sample-data.csv",
    name: "contoh-siswa.csv",
    icon: "📋",
    labelKey: "sampleCross",
    descKey: "sampleCrossDesc",
  },
  {
    file: "/contoh-timeseries.csv",
    name: "contoh-timeseries.csv",
    icon: "📈",
    labelKey: "sampleTs",
    descKey: "sampleTsDesc",
  },
  {
    file: "/contoh-panel.csv",
    name: "contoh-panel.csv",
    icon: "📊",
    labelKey: "samplePanel",
    descKey: "samplePanelDesc",
  },
];

const RESULT_TABS = [
  { id: "overview", icon: "📌", label: "tabOverview" },
  { id: "charts", icon: "📊", label: "tabCharts" },
  { id: "tests", icon: "🧪", label: "tabTests" },
  { id: "data", icon: "🧹", label: "tabData" },
  { id: "export", icon: "⬇️", label: "tabExport" },
] as const;
type TabId = (typeof RESULT_TABS)[number]["id"];

/** Guess a sensible default dependent variable for regression. */
function guessTarget(names: string[]): string {
  const re = /value|price|harga|target|sales|revenue|gdp|score|rating|salary|gaji/i;
  return names.find((n) => re.test(n)) ?? names[names.length - 1] ?? "";
}

/** Return a dataset with the excluded columns removed (view projection). */
function projectColumns(
  ds: ParsedDataset,
  excluded: Set<string>,
): ParsedDataset {
  if (excluded.size === 0) return ds;
  const fields = ds.fields.filter((f) => !excluded.has(f));
  const rows = ds.rows.map((r) => {
    const o: Record<string, string | null> = {};
    for (const f of fields) o[f] = r[f] ?? null;
    return o;
  });
  return { fields, rows };
}

export default function AnalyzePage() {
  const { t, lang } = useLang();
  const [stage, setStage] = useState<Stage>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  // For multi-sheet Excel files: the user picks which sheet to analyze.
  const [sheets, setSheets] = useState<SheetData[] | null>(null);
  // Source-file info for the reproducible-code export.
  const [exportMeta, setExportMeta] = useState<{
    fileName: string;
    isExcel: boolean;
    sheetName?: string;
  }>({ fileName: "data.csv", isExcel: false });

  // The original parsed data + the list of cleaning actions applied to it.
  // The working dataset is derived by replaying actions — this gives exact undo.
  const [baseDataset, setBaseDataset] = useState<ParsedDataset | null>(null);
  const [actions, setActions] = useState<CleaningAction[]>([]);
  // Columns the user has toggled OFF for experimentation (kept reversibly).
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  // Insight was generated for an earlier version of the data (after cleaning).
  const [insightStale, setInsightStale] = useState(false);

  // --- derived (all in code, instant & free) ---
  // Excluded columns are removed FIRST (so dedup/stats ignore them), then the
  // cleaning actions replay on the projected dataset.
  const baseColumns = useMemo(
    () =>
      baseDataset
        ? baseDataset.fields.map((name) => ({
            name,
            kind: detectColumnKind(baseDataset.rows.map((r) => r[name] ?? null)),
          }))
        : [],
    [baseDataset],
  );
  const projectedBase = useMemo(
    () => (baseDataset ? projectColumns(baseDataset, excluded) : null),
    [baseDataset, excluded],
  );
  const working = useMemo(
    () => (projectedBase ? replay(projectedBase, actions) : null),
    [projectedBase, actions],
  );
  const analysis = useMemo<FullAnalysis | null>(
    () => (working ? analyzeDataset(working.dataset) : null),
    [working],
  );
  const qualityReport = useMemo<DataQualityReport | null>(
    () => (working && analysis ? scanDataQuality(working.dataset, analysis) : null),
    [working, analysis],
  );
  const recommendedCount = useMemo(
    () => (qualityReport ? recommendedActions(qualityReport).length : 0),
    [qualityReport],
  );

  const fetchInsight = useCallback(async (a: FullAnalysis, mId: string) => {
    setAiLoading(true);
    setAiError(null);
    setInsight(null);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ONLY the StatsSummary crosses to the server — never raw rows.
        body: JSON.stringify({ summary: a.summary, model: mId, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("loadFail"));
      setInsight(data as AIInsight);
      setInsightStale(false);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : t("loadFail"));
    } finally {
      setAiLoading(false);
    }
  }, [lang, t]);

  const startWith = useCallback(
    (ds: ParsedDataset) => {
      setBaseDataset(ds);
      setActions([]);
      setExcluded(new Set());
      setInsight(null); // AI insight is opt-in (manual) to save quota
      setAiError(null);
      setInsightStale(false);
      setStage("result");
    },
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setFileName(file.name);
      setStage("analyzing");
      const isExcel = /\.(xlsx|xls|xlsm)$/i.test(file.name);
      try {
        const result = await parseUpload(file);
        await new Promise((r) => setTimeout(r, 0)); // let the loader paint
        if (result.sheets.length === 1) {
          setExportMeta({
            fileName: file.name,
            isExcel,
            sheetName: isExcel ? result.sheets[0].name : undefined,
          });
          startWith(result.sheets[0].dataset);
        } else {
          setExportMeta({ fileName: file.name, isExcel: true });
          setSheets(result.sheets);
          setStage("sheets");
        }
      } catch (e) {
        setStage("upload");
        setParseError(e instanceof CsvParseError ? e.message : t("parseFail"));
      }
    },
    [startWith, t],
  );

  const handleSample = useCallback(
    async (s: SampleDataset) => {
      setParseError(null);
      setFileName(s.name);
      setStage("analyzing");
      try {
        const res = await fetch(s.file);
        const text = await res.text();
        const file = new File([text], s.name, { type: "text/csv" });
        const result = await parseUpload(file);
        setExportMeta({ fileName: s.name, isExcel: false });
        startWith(result.sheets[0].dataset);
      } catch {
        setStage("upload");
        setParseError(t("sampleFail"));
      }
    },
    [startWith, t],
  );

  const pickSheet = (sheet: SheetData) => {
    setFileName(sheet.name);
    setExportMeta((m) => ({ ...m, sheetName: sheet.name }));
    setSheets(null);
    setStage("analyzing");
    startWith(sheet.dataset);
  };

  // --- cleaning handlers ---
  const applyAction = (action: CleaningAction) => {
    setActions((prev) => [...prev, action]);
    setInsightStale(true);
  };
  const applyActions = (list: CleaningAction[]) => {
    if (list.length === 0) return;
    setActions((prev) => [...prev, ...list]);
    setInsightStale(true);
  };
  const autoClean = () => {
    if (!qualityReport) return;
    const plan = recommendedActions(qualityReport);
    if (plan.length === 0) return;
    setActions((prev) => [...prev, ...plan]);
    setInsightStale(true);
  };
  const undo = () => {
    setActions((prev) => prev.slice(0, -1));
    setInsightStale(true);
  };
  const resetCleaning = () => {
    setActions([]);
    setInsightStale(true);
  };

  const toggleColumn = (name: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        // keep at least one column included
        if (baseColumns.length - next.size <= 1) return prev;
        next.add(name);
      }
      return next;
    });
    setInsightStale(true);
  };
  const useAllColumns = () => {
    setExcluded(new Set());
    setInsightStale(true);
  };

  const handleModelChange = (id: string) => {
    setModelId(id);
    // Only regenerate if the user has already opted into AI (insight exists).
    if (analysis && insight) fetchInsight(analysis, id);
  };
  const refreshInsight = () => {
    if (analysis) fetchInsight(analysis, modelId);
  };

  const reset = () => {
    setStage("upload");
    setBaseDataset(null);
    setActions([]);
    setInsight(null);
    setAiError(null);
    setParseError(null);
    setFileName("");
    setInsightStale(false);
    setSheets(null);
    setExcluded(new Set());
  };

  return (
    <>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              cerita<span className="text-accent">bel</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {stage === "result" ? (
              <button
                onClick={reset}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
              >
                {t("analyzeOther")}
              </button>
            ) : null}
            <LanguageToggle />
          </div>
        </header>

        {stage === "upload" ? (
          <div className="mx-auto max-w-2xl py-10">
            <h1 className="mb-2 text-2xl font-semibold">{t("uploadTitle")}</h1>
            <p className="mb-6 text-muted">{t("uploadDesc")}</p>
            <FileUpload
              onFile={handleFile}
              samples={SAMPLES}
              onSample={handleSample}
            />
            {parseError ? (
              <p className="mt-4 text-sm text-negative">{parseError}</p>
            ) : null}
          </div>
        ) : null}

        {stage === "analyzing" ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
            <p className="text-foreground">
              {t("analyzingFile", { file: fileName })}
            </p>
            <p className="mt-1 text-sm text-muted">{t("analyzingSteps")}</p>
          </div>
        ) : null}

        {stage === "sheets" && sheets ? (
          <div className="mx-auto max-w-2xl py-10">
            <h1 className="mb-1 text-2xl font-semibold">{t("sheetTitle")}</h1>
            <p className="mb-6 text-muted">
              {t("sheetHint", { n: sheets.length })}
            </p>
            <ul className="space-y-2">
              {sheets.map((s) => (
                <li key={s.name}>
                  <button
                    onClick={() => pickSheet(s)}
                    className="group flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-left transition hover:border-accent hover:bg-surface-2"
                  >
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-xs text-muted">
                      {t("sheetRows", {
                        rows: s.dataset.rows.length,
                        cols: s.dataset.fields.length,
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {stage === "result" && analysis && working && qualityReport ? (
          <Results
            analysis={analysis}
            dataset={working.dataset}
            changes={working.changes}
            qualityReport={qualityReport}
            recommendedCount={recommendedCount}
            fileName={fileName}
            insight={insight}
            aiLoading={aiLoading}
            aiError={aiError}
            insightStale={insightStale}
            onRetry={refreshInsight}
            onRefresh={refreshInsight}
            modelId={modelId}
            onModelChange={handleModelChange}
            onAction={applyAction}
            onApplyActions={applyActions}
            onAuto={autoClean}
            onUndo={undo}
            onReset={resetCleaning}
            baseColumns={baseColumns}
            excluded={excluded}
            onToggleColumn={toggleColumn}
            onUseAllColumns={useAllColumns}
            actions={actions}
            exportMeta={exportMeta}
          />
        ) : null}
      </main>
      <Footer />
    </>
  );
}

function Results({
  analysis,
  dataset,
  changes,
  qualityReport,
  recommendedCount,
  fileName,
  insight,
  aiLoading,
  aiError,
  insightStale,
  onRetry,
  onRefresh,
  modelId,
  onModelChange,
  onAction,
  onApplyActions,
  onAuto,
  onUndo,
  onReset,
  baseColumns,
  excluded,
  onToggleColumn,
  onUseAllColumns,
  actions,
  exportMeta,
}: {
  analysis: FullAnalysis;
  dataset: ParsedDataset;
  changes: CleaningChange[];
  qualityReport: DataQualityReport;
  recommendedCount: number;
  fileName: string;
  insight: AIInsight | null;
  aiLoading: boolean;
  aiError: string | null;
  insightStale: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  modelId: string;
  onModelChange: (id: string) => void;
  onAction: (a: CleaningAction) => void;
  onApplyActions: (list: CleaningAction[]) => void;
  onAuto: () => void;
  onUndo: () => void;
  onReset: () => void;
  baseColumns: { name: string; kind: ColumnKind }[];
  excluded: Set<string>;
  onToggleColumn: (name: string) => void;
  onUseAllColumns: () => void;
  actions: CleaningAction[];
  exportMeta: { fileName: string; isExcel: boolean; sheetName?: string };
}) {
  const { t } = useLang();
  const numericFields = analysis.numericStats.map((s) => s.name);

  // Data-shape detection + user override → routes which specialized module shows.
  const detected = useMemo(() => detectShape(dataset, analysis), [dataset, analysis]);
  const [shapeOverride, setShapeOverride] = useState<DataShape | null>(null);
  const shape = shapeOverride ?? detected.shape;
  const [tab, setTab] = useState<TabId>("overview");

  // Sensible defaults when a shape is forced but wasn't auto-detected.
  const firstCategorical =
    analysis.columns.find((c) => c.type === "categorical")?.name ??
    analysis.columns[0]?.name ??
    "";
  const fallbackTime = findTimeColumn(dataset);
  const panelEntity = detected.entityCol ?? firstCategorical;
  const panelTime =
    detected.timeCol ?? fallbackTime ?? numericFields[0] ?? analysis.columns[0]?.name ?? "";
  const tsTime = detected.timeCol ?? fallbackTime ?? analysis.columns[0]?.name ?? "";

  // Regression target (dependent variable), with a sensible auto-guess.
  const [regTargetOverride, setRegTargetOverride] = useState<string | null>(null);
  const regTarget =
    regTargetOverride && numericFields.includes(regTargetOverride)
      ? regTargetOverride
      : guessTarget(numericFields);

  const codegenOpts: CodegenOptions = {
    fileName: exportMeta.fileName,
    isExcel: exportMeta.isExcel,
    sheetName: exportMeta.sheetName,
    excluded: [...excluded],
    actions,
    shape,
    entityCol: shape === "panel" ? panelEntity : undefined,
    timeCol:
      shape === "timeseries" ? tsTime : shape === "panel" ? panelTime : undefined,
    valueCol:
      shape === "timeseries"
        ? numericFields.find((n) => n !== tsTime)
        : shape === "panel"
          ? numericFields.find((n) => n !== panelEntity && n !== panelTime)
          : undefined,
    maWindow: 3,
    regTarget: numericFields.length >= 2 ? regTarget : undefined,
    regEntity: shape === "panel" ? panelEntity : undefined,
    regTime: shape === "panel" ? panelTime : undefined,
  };

  const problems = qualityReport.issues.map((i) => ({
    kind: i.kind,
    column: i.column,
    detail: i.detail,
    severity: i.severity,
  }));

  const hasNumeric2 = numericFields.length >= 2;

  return (
    <div className="space-y-5">
      {/* Data shape — one global control above everything */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <ShapeSelector
          value={shape}
          detected={detected.shape}
          onChange={setShapeOverride}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT: tabbed content (progressive disclosure — one group at a time) */}
        <div className="min-w-0">
          <div
            role="tablist"
            className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
          >
            {RESULT_TABS.map((tb) => (
              <button
                key={tb.id}
                role="tab"
                aria-selected={tab === tb.id}
                onClick={() => setTab(tb.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
                  tab === tb.id
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <span aria-hidden>{tb.icon}</span>
                {t(tb.label)}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {/* ---------- Overview ---------- */}
            {tab === "overview" ? (
              <>
                <section>
                  <SectionTitle hint={t("secHighlightsHint")}>
                    {t("secHighlights")}
                  </SectionTitle>
                  <SummaryCard
                    analysis={analysis}
                    shape={shape}
                    quality={qualityReport}
                  />
                </section>
                <section>
                  <SectionTitle hint={fileName}>{t("secDataset")}</SectionTitle>
                  <DatasetOverview analysis={analysis} />
                </section>
                <section>
                  <SectionTitle hint={t("secPreviewHint")}>
                    {t("secPreview")}
                  </SectionTitle>
                  <DataPreview dataset={dataset} fileName={fileName} />
                </section>
              </>
            ) : null}

            {/* ---------- Charts ---------- */}
            {tab === "charts" ? (
              <>
                {shape === "panel" ? (
                  <section>
                    <SectionTitle hint={t("secPanelHint")}>
                      {t("secPanel")}
                    </SectionTitle>
                    <PanelAnalysis
                      key={`${panelEntity}|${panelTime}`}
                      dataset={dataset}
                      analysis={analysis}
                      entityCol={panelEntity}
                      timeCol={panelTime}
                    />
                  </section>
                ) : null}
                {shape === "timeseries" ? (
                  <section>
                    <SectionTitle hint={t("secTsHint")}>{t("secTs")}</SectionTitle>
                    <TimeSeriesAnalysis
                      key={tsTime}
                      dataset={dataset}
                      analysis={analysis}
                      timeCol={tsTime}
                    />
                  </section>
                ) : null}
                {hasNumeric2 ? (
                  <section>
                    <SectionTitle hint={t("secCorrHint")}>
                      {t("secCorr")}
                    </SectionTitle>
                    <Card>
                      <CorrelationHeatmap cm={analysis.correlation} />
                    </Card>
                  </section>
                ) : null}
                {hasNumeric2 ? (
                  <section>
                    <SectionTitle hint={t("secScatterHint")}>
                      {t("secScatter")}
                    </SectionTitle>
                    <Card>
                      <ScatterPlot dataset={dataset} numericFields={numericFields} />
                    </Card>
                  </section>
                ) : null}
                <section>
                  <SectionTitle hint={t("secColumnsHint", { n: analysis.columnCount })}>
                    {t("secColumns")}
                  </SectionTitle>
                  <ColumnSummary analysis={analysis} dataset={dataset} />
                </section>
              </>
            ) : null}

            {/* ---------- Tests & models ---------- */}
            {tab === "tests" ? (
              <>
                {analysis.columns.length >= 2 ? (
                  <section>
                    <SectionTitle hint={t("secHypoHint")}>
                      {t("secHypo")}
                    </SectionTitle>
                    <HypothesisTest
                      key={analysis.columns.map((c) => c.name).join("|")}
                      dataset={dataset}
                      columns={analysis.columns.map((c) => ({
                        name: c.name,
                        type: c.type,
                      }))}
                      modelId={modelId}
                    />
                  </section>
                ) : null}
                {hasNumeric2 ? (
                  <section>
                    <SectionTitle hint={t("secRegHint")}>{t("secReg")}</SectionTitle>
                    <MultipleRegression
                      dataset={dataset}
                      numericCols={numericFields}
                      target={regTarget}
                      onTargetChange={setRegTargetOverride}
                      modelId={modelId}
                      panelEntity={shape === "panel" ? panelEntity : undefined}
                      panelTime={shape === "panel" ? panelTime : undefined}
                    />
                  </section>
                ) : null}
                {!hasNumeric2 && analysis.columns.length < 2 ? (
                  <p className="text-sm text-muted">{t("tabTestsEmpty")}</p>
                ) : null}
              </>
            ) : null}

            {/* ---------- Data & cleaning ---------- */}
            {tab === "data" ? (
              <>
                {baseColumns.length > 1 ? (
                  <section>
                    <SectionTitle hint={t("secVarsHint")}>{t("secVars")}</SectionTitle>
                    <ColumnSelector
                      columns={baseColumns}
                      excluded={excluded}
                      onToggle={onToggleColumn}
                      onUseAll={onUseAllColumns}
                    />
                  </section>
                ) : null}
                <section>
                  <SectionTitle hint={t("secQualityHint")}>
                    {t("secQuality")}
                  </SectionTitle>
                  <div className="space-y-3">
                    <CleaningBar
                      changes={changes}
                      recommendedCount={recommendedCount}
                      onAuto={onAuto}
                      onUndo={onUndo}
                      onReset={onReset}
                    />
                    <DataQualityPanel report={qualityReport} onAction={onAction} />
                    <CleanAdvisor
                      summary={analysis.summary}
                      problems={problems}
                      modelId={modelId}
                      onApply={onApplyActions}
                    />
                  </div>
                </section>
              </>
            ) : null}

            {/* ---------- Export ---------- */}
            {tab === "export" ? (
              <section>
                <SectionTitle hint={t("secExportHint")}>
                  {t("secExport")}
                </SectionTitle>
                <ExportPanel opts={codegenOpts} />
              </section>
            ) : null}
          </div>
        </div>

        {/* RIGHT: AI panel — persistent across tabs so there's always context. */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <AIInsightPanel
            insight={insight}
            loading={aiLoading}
            error={aiError}
            stale={insightStale}
            onRetry={onRetry}
            onRefresh={onRefresh}
            modelId={modelId}
            onModelChange={onModelChange}
          />
          <ChatPanel summary={analysis.summary} modelId={modelId} />
        </div>
      </div>
    </div>
  );
}
