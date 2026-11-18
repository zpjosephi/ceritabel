"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import ReportPrint from "@/components/ReportPrint";
import AIInsightPanel from "@/components/AIInsightPanel";
import ChatPanel from "@/components/ChatPanel";
import DataQualityPanel from "@/components/DataQualityPanel";
import CleaningBar from "@/components/CleaningBar";
import CleanAdvisor from "@/components/CleanAdvisor";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import { useLang } from "@/components/LanguageProvider";
import { Card, Mark, SectionTitle } from "@/components/ui";
import { detectShape, type DataShape } from "@/lib/shape";
import { findTimeColumn } from "@/lib/panel";
import type { CodegenOptions } from "@/lib/codegen";
import { DEFAULT_MODEL_ID } from "@/lib/config";

type Stage = "upload" | "analyzing" | "sheets" | "result";

const SAMPLES: SampleDataset[] = [
  {
    file: "/sample-data.csv",
    name: "contoh-siswa.csv",
    labelKey: "sampleCross",
    descKey: "sampleCrossDesc",
  },
  {
    file: "/contoh-timeseries.csv",
    name: "contoh-timeseries.csv",
    labelKey: "sampleTs",
    descKey: "sampleTsDesc",
  },
  {
    file: "/contoh-panel.csv",
    name: "contoh-panel.csv",
    labelKey: "samplePanel",
    descKey: "samplePanelDesc",
  },
];

const RESULT_TABS = [
  { id: "overview", label: "tabOverview" },
  { id: "charts", label: "tabCharts" },
  { id: "tests", label: "tabTests" },
  { id: "data", label: "tabData" },
  { id: "export", label: "tabExport" },
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
  // The working dataset is derived by replaying actions - this gives exact undo.
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
        // ONLY the StatsSummary crosses to the server - never raw rows.
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

  // Deep-link demo mode: /analyze?sample=siswa|timeseries|panel loads the
  // bundled dataset immediately, so a shared link lands inside a finished
  // analysis instead of an empty upload screen.
  const deepLinked = useRef(false);
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search)
      .get("sample")
      ?.toLowerCase();
    if (!slug) return;
    const idx: Record<string, number> = {
      siswa: 0,
      students: 0,
      timeseries: 1,
      ts: 1,
      panel: 2,
      gdp: 2,
    };
    const i = idx[slug];
    if (i === undefined) return;
    // Deferred past the effect's synchronous phase (the loader sets state).
    // The once-guard lives INSIDE the callback so StrictMode's double effect
    // run (schedule, clean up, schedule again) still fires exactly once.
    const timer = setTimeout(() => {
      if (deepLinked.current) return;
      deepLinked.current = true;
      void handleSample(SAMPLES[i]);
    }, 0);
    return () => clearTimeout(timer);
  }, [handleSample]);

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
      <header className="gutter flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border py-3">
        <Link href="/" className="flex items-center gap-2 rounded-sm text-foreground">
          <Mark className="h-4 w-4 text-accent" />
          <span className="text-[17px] font-semibold">ceritabel</span>
        </Link>
        <div className="flex items-center gap-5">
          {stage === "result" ? (
            <button
              onClick={reset}
              className="text-sm font-medium text-muted-strong underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t("analyzeOther")}
            </button>
          ) : null}
          <LanguageToggle />
        </div>
      </header>
      <main className="gutter w-full flex-1 py-8 lg:py-10">
        {stage === "upload" ? (
          <div className="max-w-3xl py-6 lg:py-10">
            <h1 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.012em]">
              {t("uploadTitle")}
            </h1>
            <p className="measure mb-8 mt-4 text-pretty text-lg leading-relaxed text-muted-strong">
              {t("uploadDesc")}
            </p>
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
          <div className="py-24" role="status">
            <div className="mb-5 h-1 w-48 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
            </div>
            <p className="font-medium text-foreground">
              {t("analyzingFile", { file: fileName })}
            </p>
            <p className="mt-1 text-sm text-muted">{t("analyzingSteps")}</p>
          </div>
        ) : null}

        {stage === "sheets" && sheets ? (
          <div className="max-w-2xl py-6 lg:py-10">
            <h1 className="mb-1 font-serif text-3xl font-semibold">{t("sheetTitle")}</h1>
            <p className="mb-6 text-muted">
              {t("sheetHint", { n: sheets.length })}
            </p>
            <ul className="space-y-2">
              {sheets.map((s) => (
                <li key={s.name}>
                  <button
                    onClick={() => pickSheet(s)}
                    className="group flex w-full items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-muted hover:bg-surface-2"
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
  // Identifier-looking columns (flagged by the quality scan) make meaningless
  // default predictors (student_id in a regression). They stay available via
  // the variable chips; they just don't enter the default models.
  const idLikeCols = useMemo(
    () =>
      new Set(
        qualityReport.issues
          .filter((i) => i.kind === "idLike" && i.column)
          .map((i) => i.column as string),
      ),
    [qualityReport],
  );
  const modelFields = useMemo(() => {
    const filtered = numericFields.filter((c) => !idLikeCols.has(c));
    return filtered.length >= 2 ? filtered : numericFields;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, idLikeCols]);

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
      : guessTarget(modelFields);

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
    <div className="animate-[fade-in_0.3s_ease-out] space-y-6">
      {/* Global scope controls (shape + variables) - they affect every tab,
          so they live above the tabs where they're always discoverable. */}
      <div>
        <h1 className="break-words font-serif text-[clamp(1.9rem,3.2vw,2.6rem)] font-semibold leading-tight tracking-[-0.01em]">
          {fileName}
        </h1>
        <div className="mt-4">
          <ShapeSelector
            value={shape}
            detected={detected.shape}
            onChange={setShapeOverride}
          />
        </div>
      </div>

      {baseColumns.length > 1 ? (
        <div className="border-y border-border py-4">
          <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3">
            <span className="text-sm font-semibold text-foreground">
              {t("secVars")}
            </span>
            <span className="text-sm text-muted">{t("secVarsHint")}</span>
          </div>
          <ColumnSelector
            columns={baseColumns}
            excluded={excluded}
            onToggle={onToggleColumn}
            onUseAll={onUseAllColumns}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,26rem)] lg:gap-12">
        {/* LEFT: tabbed content (progressive disclosure - one group at a time) */}
        <div className="min-w-0">
          <div
            role="tablist"
            className="mb-8 flex gap-6 overflow-x-auto border-b border-border"
          >
            {RESULT_TABS.map((tb) => {
              const active = tab === tb.id;
              return (
                <button
                  key={tb.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(tb.id)}
                  className={`-mb-px flex shrink-0 items-center border-b-2 px-0.5 pb-3 pt-1 text-[0.95rem] font-medium transition-colors ${
                    active
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:border-border-strong hover:text-foreground"
                  }`}
                >
                  {t(tb.label)}
                </button>
              );
            })}
          </div>

          <div className="space-y-12">
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
                      preferredPair={
                        analysis.summary.strongCorrelations[0]
                          ? [
                              analysis.summary.strongCorrelations[0].a,
                              analysis.summary.strongCorrelations[0].b,
                            ]
                          : undefined
                      }
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
                      numericCols={modelFields}
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
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:bg-accent-strong active:scale-[0.98]"
                  >
                    {t("reportBtn")}
                  </button>
                  <span className="text-xs text-muted">{t("reportHint")}</span>
                </div>
                <ExportPanel opts={codegenOpts} />
              </section>
            ) : null}
          </div>
        </div>

        {/* RIGHT: AI panel - persistent across tabs so there's always context. */}
        <div className="space-y-8 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
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

      {/* Hidden on screen; becomes the whole document when printing. */}
      <ReportPrint
        fileName={fileName}
        shape={shape}
        analysis={analysis}
        quality={qualityReport}
        insight={insight}
        insightStale={insightStale}
        dataset={dataset}
        regTarget={regTarget}
        changes={changes}
        excludeFromModels={[...idLikeCols]}
        panelEntity={shape === "panel" ? panelEntity : undefined}
        panelTime={shape === "panel" ? panelTime : undefined}
        tsTime={shape === "timeseries" ? tsTime : undefined}
      />
    </div>
  );
}
