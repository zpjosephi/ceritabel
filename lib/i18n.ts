// lib/i18n.ts
// Lightweight i18n: a flat string dictionary + a t() helper with {param}
// interpolation, plus formatters for the dynamically generated data-quality
// issues and cleaning changes (so even computed text gets localised).
// Pure module — safe to import on client or server.

import type { DataQualityIssue } from "./dataQuality";
import type { CleaningChange } from "./cleaning";

export type Lang = "id" | "en";

type Dict = Record<string, string>;

const ID: Dict = {
  // header / common
  analyzeOther: "Analisis file lain",
  tryAgain: "Coba lagi",
  cancel: "Batal",

  // landing
  heroBadge: "Auto-EDA + AI · gratis",
  heroTitleRest: "— ngobrol sama data kamu",
  heroDesc:
    "Upload CSV/Excel. ceritabel mendeteksi bentuk datamu (cross-section, time series, panel), menghitung statistik yang benar di browser — EDA, uji hipotesis, regresi + uji asumsi klasik, panel FE/RE — lalu AI menjelaskannya dengan bahasa sederhana.",
  ctaTry: "Coba sekarang →",
  ctaHow: "Cara kerja",
  feat1Title: "Statistik beneran",
  feat1Body:
    "Mean, median, std (n−1), kuartil, korelasi Pearson, outlier IQR — semua dihitung di kode, bukan ditebak AI.",
  feat2Title: "Visual yang rapi",
  feat2Body:
    "Histogram, bar kategori, heatmap korelasi, dan scatter plot dengan garis regresi opsional.",
  feat3Title: "AI yang menjelaskan",
  feat3Body:
    "AI menerjemahkan angka jadi cerita + memberi 3 saran analisis lanjutan. Tidak menghitung sendiri.",
  howTitle: "Bagaimana cara kerjanya",
  step1Title: "Upload CSV",
  step1Body: "Drag & drop file kamu. Parsing terjadi di browser.",
  step2Title: "Hitung EDA",
  step2Body: "Statistik & korelasi dihitung langsung di perangkatmu.",
  step3Title: "AI menjelaskan",
  step3Body: "Hanya ringkasan angka yang dikirim ke AI untuk diceritakan.",
  privacyLabel: "Privasi:",
  privacyBody:
    "file diproses di memori dan tidak disimpan. Yang dikirim ke AI hanya ringkasan statistik (bukan baris data mentah).",
  capTitle: "Apa yang bisa dilakukan",
  capEda: "EDA & statistik otomatis",
  capClean: "Pembersihan data (kode + AI)",
  capShape: "Deteksi bentuk data otomatis",
  capHypo: "Uji hipotesis (t, ANOVA, chi-square, korelasi)",
  capReg: "Regresi + uji asumsi klasik",
  capPanel: "Data panel: Pooled / FE / RE + Hausman",
  capTs: "Analisis time series",
  capExport: "Export ke Python (pandas) & R",
  capBilingual: "Bilingual ID / EN, multi-model AI",
  fbButton: "Feedback",
  fbTitle: "Kirim feedback",
  fbDesc: "Saran, bug, atau ide? Aku baca semua 🙌",
  fbCatBug: "Bug",
  fbCatIdea: "Ide",
  fbCatOther: "Lainnya",
  fbMood: "Gimana pengalamannya?",
  fbPlaceholder: "Tulis feedback kamu di sini…",
  fbEmail: "Email (opsional)",
  fbSend: "Kirim",
  fbSending: "Mengirim…",
  fbThanks: "Makasih atas feedback-nya! 🙌",
  fbEmpty: "Tulis dulu feedback-nya.",
  fbFail: "Gagal mengirim. Coba lagi.",
  fbClose: "Tutup",
  footerTech: "Dibuat dengan Next.js, TypeScript & simple-statistics",

  // upload / analyze
  uploadTitle: "Unggah data kamu",
  uploadDesc:
    "Pilih file CSV atau Excel. Semua diproses di browser kamu; hanya ringkasan angka yang dikirim ke AI.",
  sheetTitle: "Pilih sheet untuk dianalisis",
  sheetHint: "{n} sheet ditemukan di file Excel ini",
  sheetRows: "{rows} baris × {cols} kolom",
  analyzingFile: "Menganalisis {file}…",
  analyzingSteps: "Parsing → menghitung statistik → menyiapkan insight",
  parseFail: "Gagal memproses file. Pastikan formatnya CSV yang valid.",
  sampleFail: "Gagal memuat data contoh.",

  // file upload
  dropTitle: "Seret & lepas file CSV atau Excel di sini",
  dropOr: "atau klik untuk memilih file",
  dropPrivacy:
    "Diproses sepenuhnya di browser. File kamu tidak diunggah ke server.",
  errFile: "File harus CSV atau Excel (.csv, .xlsx, .xls)",
  errSize: "Ukuran file maksimal 25 MB.",
  excelNoData: "File Excel tidak punya sheet berisi data.",
  sampleLink: "atau coba dengan data contoh →",
  sampleTitle: "atau coba dengan data contoh",
  sampleCross: "Nilai siswa",
  sampleCrossDesc: "cross-sectional",
  sampleTs: "Penjualan bulanan",
  sampleTsDesc: "time series",
  samplePanel: "GDP ASEAN",
  samplePanelDesc: "panel · negara × tahun",

  // sections
  tabOverview: "Ringkasan",
  tabCharts: "Grafik",
  tabTests: "Uji & Model",
  tabData: "Data & Bersihkan",
  tabExport: "Export",
  tabTestsEmpty: "Butuh ≥ 2 kolom numerik untuk uji & regresi.",
  secHighlights: "Sorotan",
  secHighlightsHint: "Ringkasan cepat sekali lihat",
  hlShape: "Bentuk data",
  hlQuality: "Skor kualitas",
  hlComposition: "Komposisi kolom",
  hlTopCorr: "Korelasi terkuat",
  hlTopOutlier: "Outlier terbanyak",
  hlMissing: "Total missing",
  hlNumeric: "numerik",
  hlCategorical: "kategorikal",
  hlNone: "tidak ada",
  secPreview: "Pratinjau data",
  secPreviewHint: "Lihat baris data (setelah dibersihkan)",
  previewShowing: "Menampilkan {shown} dari {total} baris",
  downloadCsv: "Unduh CSV bersih",
  secDataset: "Ringkasan dataset",
  secVars: "Variabel",
  secVarsHint: "Klik chip untuk pakai/buang kolom dari analisis",
  varsUsed: "{used}/{total} dipakai",
  varsUseAll: "Pakai semua",
  secQuality: "Kualitas data",
  secQualityHint: "Deteksi & pembersihan otomatis (di kode)",
  secCorr: "Matriks korelasi",
  secCorrHint: "Pearson, pairwise complete",
  secScatter: "Scatter plot",
  secScatterHint: "Pilih 2 kolom numerik",
  secColumns: "Ringkasan per kolom",
  secExport: "Export & reproduksi",
  secExportHint: "Script yang mereproduksi analisis ini",
  exportCopy: "Salin",
  exportCopied: "Tersalin!",
  exportDownload: "Unduh",
  secColumnsHint: "{n} kolom",

  // dataset overview
  ovRows: "Baris",
  ovCols: "Kolom",
  ovNumCat: "Numerik / Kategorikal",
  ovMissing: "Missing values",

  // column summary
  typeNumeric: "numerik",
  typeCategorical: "kategorikal",
  typeDatetime: "tanggal",
  typeBoolean: "boolean",
  missingLine: "{n} missing ({pct}%)",
  noMissing: "Tidak ada missing value",
  uniqueCats: "{n} kategori unik",
  statOutlier: "outlier",

  // charts
  noNumeric: "Tidak ada data numerik.",
  noCategory: "Tidak ada kategori.",
  count: "Jumlah",
  rangeLabel: "Rentang {x}",
  corrNeed2: "Butuh minimal 2 kolom numerik untuk matriks korelasi.",
  corrUndef: "(— = tak terdefinisi)",
  scatterNeed2: "Butuh minimal 2 kolom numerik untuk scatter plot.",
  regLine: "Garis regresi",
  regUnavailable:
    "Regresi tidak tersedia (butuh ≥ 3 pasangan data & variasi cukup).",

  // hypothesis testing
  secHypo: "Uji hipotesis",
  secHypoHint: "Pilih 2 kolom — uji statistik dipilih otomatis",
  hypoColA: "Kolom A",
  hypoColB: "Kolom B",
  hypoRun: "Jalankan uji",
  hypoPickTwo: "Pilih dua kolom yang berbeda.",
  hypoSignificant: "Signifikan secara statistik (p < 0,05)",
  hypoNotSig: "Tidak signifikan (p ≥ 0,05)",
  hypoExplain: "Jelaskan dengan AI",
  hypoExplaining: "Menjelaskan…",
  hypoStatistic: "Statistik",
  hypoEffect: "Ukuran efek",
  hypoMeanDiff: "Selisih rata-rata",
  hypoCI: "Selang kepercayaan 95%",
  testTtest: "Uji t dua sampel (Welch)",
  testAnova: "ANOVA satu arah",
  testChi: "Uji chi-square independensi",
  testCorr: "Uji signifikansi korelasi (Pearson)",
  secReg: "Regresi berganda",
  secRegHint: "Pilih target (Y) - uji serentak (F) & partial (t)",
  regTargetLabel: "Variabel target (Y)",
  regPredictorsNote: "Prediktor (X): semua kolom numerik aktif lainnya. Matikan yang tak perlu di Variabel.",
  regNeedNumeric: "Butuh minimal 2 kolom numerik.",
  regTerm: "Variabel",
  regCoef: "Koefisien",
  regOverall: "Uji serentak (F)",
  regMethod: "Metode",
  regPooled: "Pooled OLS",
  regFE: "Fixed Effects",
  regFENote: "Mengontrol perbedaan antar {entity} (efek tetap per entitas)",
  regWithinR2: "R² (within)",
  regRE: "Random Effects",
  hausman: "Uji Hausman (FE vs RE)",
  hausmanFe: "disarankan Fixed Effects",
  hausmanRe: "disarankan Random Effects",
  assumTitle: "Uji asumsi klasik (OLS)",
  assumNormality: "Normalitas (Jarque-Bera)",
  assumVif: "Multikolinearitas (VIF)",
  assumHetero: "Heteroskedastisitas (Breusch-Pagan)",
  assumAutocorr: "Autokorelasi (Durbin-Watson)",
  assumPass: "lolos",
  assumFail: "perlu dicek",
  assumDwNote: "≈2 = tidak ada autokorelasi",
  assumVifMax: "VIF maks",
  regTheta: "theta (RE)",
  regSig: "signifikan",
  regNotSig: "tidak signifikan",

  // panel data
  shapeLabel: "Bentuk data",
  shapeAuto: "auto",
  shapeCross: "Cross-sectional",
  shapeTs: "Time series",
  shapePanel: "Panel",
  secTs: "Analisis time series",
  secTsHint: "Tren, perubahan & autokorelasi",
  tsValue: "Kolom nilai",
  tsNeedValue: "Butuh kolom numerik untuk dianalisis.",
  tsTrend: "Tren",
  tsUp: "naik",
  tsDown: "turun",
  tsFlat: "datar",
  tsTotalChange: "Perubahan total",
  tsAvgChange: "Rata-rata per periode",
  tsAutocorr: "Autokorelasi (lag 1)",
  tsMa: "Rata-rata bergerak ({n})",
  tsValueLabel: "Nilai",
  secPanel: "Data panel",
  secPanelHint: "Terdeteksi otomatis (bisa diganti)",
  panelDetected: "Terdeteksi struktur data panel",
  panelEntityLabel: "Entitas",
  panelTimeLabel: "Waktu",
  panelEntities: "Entitas",
  panelPeriods: "Periode",
  panelObs: "Observasi",
  panelBalanced: "Balanced",
  panelUnbalanced: "Unbalanced",
  panelCompleteness: "Kelengkapan grid",
  panelMessy: "Struktur kurang rapi: ada pasangan (entitas, waktu) ganda.",
  panelDecomp: "Dekomposisi variasi",
  panelOverall: "Overall",
  panelBetween: "Between",
  panelWithin: "Within",
  panelLegend: "Between = variasi antar-entitas; Within = variasi dari waktu ke waktu dalam tiap entitas.",
  panelDominBetween: "beda antar-entitas",
  panelDominWithin: "berubah lintas waktu",

  // AI insight
  aiInsight: "AI Insight",
  aiStale: "Data sudah dibersihkan — insight ini dari versi sebelumnya.",
  aiRefresh: "Perbarui insight",
  aiLoading: "AI sedang membaca ringkasan statistik…",
  aiGenerate: "✨ Mulai analisis AI",
  aiIdleDesc: "AI akan membaca ringkasan statistik & menjelaskan temuannya. Klik untuk mulai (biar hemat kuota).",
  aiStory: "Cerita data",
  aiFindings: "Temuan menarik",
  aiSuggestions: "Saran analisis lanjutan",
  loadFail: "Gagal memuat insight.",

  // chat
  chatTitle: "Tanya tentang data",
  chatExample: 'Contoh: “Kolom mana yang paling berhubungan dengan {col}?”',
  chatPlaceholder: "Tulis pertanyaanmu…",
  chatSend: "Kirim",
  chatTyping: "mengetik…",
  chatFail: "Gagal menjawab.",

  // data quality panel
  qScore: "Skor kualitas data",
  qNoIssues: "Tidak ada masalah terdeteksi 🎉",
  qIssueCount: "{n} hal yang bisa dibersihkan",
  sevHigh: "Tinggi",
  sevMedium: "Sedang",
  sevLow: "Rendah",
  actDropDup: "Hapus duplikat",
  actFillMedian: "Isi median",
  actFillMean: "Isi mean",
  actFillMode: "Isi modus",
  actDropRows: "Drop baris",
  actNormalize: "Normalisasi",
  actDropCol: "Buang kolom",

  // cleaning bar
  cbAuto: "Rapikan otomatis",
  cbAutoNone: "Tidak ada yang perlu dirapikan",
  cbAutoTip: "Terapkan {n} perbaikan baku",
  cbUndo: "↩ Undo",
  cbReset: "Reset",
  cbShowHistory: "Lihat riwayat ({n})",
  cbHideHistory: "Sembunyikan riwayat ({n})",
  cbNoChanges: "Data asli · belum ada perubahan",

  // clean advisor
  advTitle: "Saran pembersihan dari AI",
  advAsk: "Minta saran AI",
  advAnalyzing: "Menganalisis…",
  advDesc:
    "AI membaca ringkasan masalah (bukan data mentah) lalu menyarankan aksi. Kamu yang memutuskan — kode yang menjalankan.",
  advClean: "Data sudah bersih 🎉",
  advNoProblems: "Tidak ada masalah untuk dianalisis",
  advNoRecs: "AI tidak menyarankan perubahan untuk data ini.",
  advApply: "Terapkan yang dicentang ({n})",
  advFail: "Gagal meminta saran.",
  advLabelDropDup: "Hapus baris duplikat",
  advLabelFill: 'Kolom "{col}" — {strategy}',
  advLabelNormalize: 'Normalisasi kategori "{col}"',
  advLabelDropCol: 'Buang kolom "{col}"',
  advStratMedian: "isi median",
  advStratMean: "isi mean",
  advStratMode: "isi modus",
  advStratDrop: "drop baris kosong",
};

const EN: Dict = {
  analyzeOther: "Analyze another file",
  tryAgain: "Try again",
  cancel: "Cancel",

  heroBadge: "Auto-EDA + AI · free",
  heroTitleRest: "— chat with your data",
  heroDesc:
    "Upload CSV/Excel. ceritabel detects your data shape (cross-section, time series, panel), computes correct statistics in your browser — EDA, hypothesis tests, regression + classical assumptions, panel FE/RE — then AI explains it in plain language.",
  ctaTry: "Try it now →",
  ctaHow: "How it works",
  feat1Title: "Real statistics",
  feat1Body:
    "Mean, median, std (n−1), quartiles, Pearson correlation, IQR outliers — all computed in code, not guessed by AI.",
  feat2Title: "Clean visuals",
  feat2Body:
    "Histograms, category bars, a correlation heatmap, and a scatter plot with an optional regression line.",
  feat3Title: "AI that explains",
  feat3Body:
    "AI turns the numbers into a story + gives 3 follow-up analysis ideas. It never computes the numbers itself.",
  howTitle: "How it works",
  step1Title: "Upload CSV",
  step1Body: "Drag & drop your file. Parsing happens in the browser.",
  step2Title: "Compute EDA",
  step2Body: "Statistics & correlations are computed right on your device.",
  step3Title: "AI explains",
  step3Body: "Only the numeric summary is sent to the AI to narrate.",
  privacyLabel: "Privacy:",
  privacyBody:
    "files are processed in memory and never stored. Only the statistics summary is sent to the AI (never raw data rows).",
  capTitle: "What it can do",
  capEda: "Automatic EDA & statistics",
  capClean: "Data cleaning (code + AI)",
  capShape: "Automatic data-shape detection",
  capHypo: "Hypothesis tests (t, ANOVA, chi-square, correlation)",
  capReg: "Regression + classical assumption tests",
  capPanel: "Panel data: Pooled / FE / RE + Hausman",
  capTs: "Time series analysis",
  capExport: "Export to Python (pandas) & R",
  capBilingual: "Bilingual ID / EN, multi-model AI",
  fbButton: "Feedback",
  fbTitle: "Send feedback",
  fbDesc: "A suggestion, bug, or idea? I read them all 🙌",
  fbCatBug: "Bug",
  fbCatIdea: "Idea",
  fbCatOther: "Other",
  fbMood: "How was it?",
  fbPlaceholder: "Write your feedback here…",
  fbEmail: "Email (optional)",
  fbSend: "Send",
  fbSending: "Sending…",
  fbThanks: "Thanks for the feedback! 🙌",
  fbEmpty: "Write your feedback first.",
  fbFail: "Couldn't send. Try again.",
  fbClose: "Close",
  footerTech: "Built with Next.js, TypeScript & simple-statistics",

  uploadTitle: "Upload your data",
  uploadDesc:
    "Choose a CSV or Excel file. Everything is processed in your browser; only the numeric summary is sent to the AI.",
  sheetTitle: "Pick a sheet to analyze",
  sheetHint: "{n} sheets found in this Excel file",
  sheetRows: "{rows} rows × {cols} columns",
  analyzingFile: "Analyzing {file}…",
  analyzingSteps: "Parsing → computing statistics → preparing insight",
  parseFail: "Couldn't process the file. Make sure it's a valid CSV.",
  sampleFail: "Couldn't load the sample data.",

  dropTitle: "Drag & drop a CSV or Excel file here",
  dropOr: "or click to choose a file",
  dropPrivacy:
    "Processed entirely in your browser. Your file is never uploaded to a server.",
  errFile: "File must be CSV or Excel (.csv, .xlsx, .xls)",
  errSize: "Maximum file size is 25 MB.",
  excelNoData: "The Excel file has no sheets with data.",
  sampleLink: "or try with sample data →",
  sampleTitle: "or try a sample dataset",
  sampleCross: "Student scores",
  sampleCrossDesc: "cross-sectional",
  sampleTs: "Monthly sales",
  sampleTsDesc: "time series",
  samplePanel: "ASEAN GDP",
  samplePanelDesc: "panel · country × year",

  tabOverview: "Overview",
  tabCharts: "Charts",
  tabTests: "Tests & models",
  tabData: "Data & cleaning",
  tabExport: "Export",
  tabTestsEmpty: "Need ≥ 2 numeric columns for tests & regression.",
  secHighlights: "Highlights",
  secHighlightsHint: "Quick at-a-glance summary",
  hlShape: "Data shape",
  hlQuality: "Quality score",
  hlComposition: "Column mix",
  hlTopCorr: "Strongest correlation",
  hlTopOutlier: "Most outliers",
  hlMissing: "Total missing",
  hlNumeric: "numeric",
  hlCategorical: "categorical",
  hlNone: "none",
  secPreview: "Data preview",
  secPreviewHint: "See the data rows (after cleaning)",
  previewShowing: "Showing {shown} of {total} rows",
  downloadCsv: "Download clean CSV",
  secDataset: "Dataset overview",
  secVars: "Variables",
  secVarsHint: "Click a chip to include/exclude a column",
  varsUsed: "{used}/{total} used",
  varsUseAll: "Use all",
  secQuality: "Data quality",
  secQualityHint: "Detected & cleaned automatically (in code)",
  secCorr: "Correlation matrix",
  secCorrHint: "Pearson, pairwise complete",
  secScatter: "Scatter plot",
  secScatterHint: "Pick 2 numeric columns",
  secColumns: "Per-column summary",
  secExport: "Export & reproduce",
  secExportHint: "A script that reproduces this analysis",
  exportCopy: "Copy",
  exportCopied: "Copied!",
  exportDownload: "Download",
  secColumnsHint: "{n} columns",

  ovRows: "Rows",
  ovCols: "Columns",
  ovNumCat: "Numeric / Categorical",
  ovMissing: "Missing values",

  typeNumeric: "numeric",
  typeCategorical: "categorical",
  typeDatetime: "date",
  typeBoolean: "boolean",
  missingLine: "{n} missing ({pct}%)",
  noMissing: "No missing values",
  uniqueCats: "{n} unique categories",
  statOutlier: "outliers",

  noNumeric: "No numeric data.",
  noCategory: "No categories.",
  count: "Count",
  rangeLabel: "Range {x}",
  corrNeed2: "Need at least 2 numeric columns for a correlation matrix.",
  corrUndef: "(— = undefined)",
  scatterNeed2: "Need at least 2 numeric columns for a scatter plot.",
  regLine: "Regression line",
  regUnavailable:
    "Regression unavailable (needs ≥ 3 data pairs & enough variation).",

  // hypothesis testing
  secHypo: "Hypothesis testing",
  secHypoHint: "Pick 2 columns - the test is auto-selected",
  hypoColA: "Column A",
  hypoColB: "Column B",
  hypoRun: "Run test",
  hypoPickTwo: "Pick two different columns.",
  hypoSignificant: "Statistically significant (p < 0.05)",
  hypoNotSig: "Not significant (p >= 0.05)",
  hypoExplain: "Explain with AI",
  hypoExplaining: "Explaining...",
  hypoStatistic: "Statistic",
  hypoEffect: "Effect size",
  hypoMeanDiff: "Mean difference",
  hypoCI: "95% confidence interval",
  testTtest: "Two-sample t-test (Welch)",
  testAnova: "One-way ANOVA",
  testChi: "Chi-square test of independence",
  testCorr: "Correlation significance (Pearson)",
  secReg: "Multiple regression",
  secRegHint: "Pick a target (Y) - joint (F) & partial (t) tests",
  regTargetLabel: "Target variable (Y)",
  regPredictorsNote: "Predictors (X): all other active numeric columns. Turn off any you do not want under Variables.",
  regNeedNumeric: "Need at least 2 numeric columns.",
  regTerm: "Term",
  regCoef: "Coefficient",
  regOverall: "Overall F-test",
  regMethod: "Method",
  regPooled: "Pooled OLS",
  regFE: "Fixed Effects",
  regFENote: "Controls for differences across {entity} (per-entity fixed effects)",
  regWithinR2: "R² (within)",
  regRE: "Random Effects",
  hausman: "Hausman test (FE vs RE)",
  hausmanFe: "Fixed Effects recommended",
  hausmanRe: "Random Effects recommended",
  assumTitle: "Classical OLS assumptions",
  assumNormality: "Normality (Jarque-Bera)",
  assumVif: "Multicollinearity (VIF)",
  assumHetero: "Heteroscedasticity (Breusch-Pagan)",
  assumAutocorr: "Autocorrelation (Durbin-Watson)",
  assumPass: "pass",
  assumFail: "check",
  assumDwNote: "≈2 = no autocorrelation",
  assumVifMax: "max VIF",
  regTheta: "theta (RE)",
  regSig: "significant",
  regNotSig: "not significant",

  // panel data
  shapeLabel: "Data shape",
  shapeAuto: "auto",
  shapeCross: "Cross-sectional",
  shapeTs: "Time series",
  shapePanel: "Panel",
  secTs: "Time series analysis",
  secTsHint: "Trend, change & autocorrelation",
  tsValue: "Value column",
  tsNeedValue: "Need a numeric column to analyze.",
  tsTrend: "Trend",
  tsUp: "rising",
  tsDown: "falling",
  tsFlat: "flat",
  tsTotalChange: "Total change",
  tsAvgChange: "Avg per period",
  tsAutocorr: "Autocorrelation (lag 1)",
  tsMa: "Moving average ({n})",
  tsValueLabel: "Value",
  secPanel: "Panel data",
  secPanelHint: "Auto-detected (you can change it)",
  panelDetected: "Panel data structure detected",
  panelEntityLabel: "Entity",
  panelTimeLabel: "Time",
  panelEntities: "Entities",
  panelPeriods: "Periods",
  panelObs: "Observations",
  panelBalanced: "Balanced",
  panelUnbalanced: "Unbalanced",
  panelCompleteness: "Grid completeness",
  panelMessy: "Loose structure: some (entity, time) pairs are duplicated.",
  panelDecomp: "Variance decomposition",
  panelOverall: "Overall",
  panelBetween: "Between",
  panelWithin: "Within",
  panelLegend: "Between = variation across entities; Within = variation over time inside each entity.",
  panelDominBetween: "differs across entities",
  panelDominWithin: "changes over time",

  aiInsight: "AI Insight",
  aiStale: "Data was cleaned — this insight is from an earlier version.",
  aiRefresh: "Refresh insight",
  aiLoading: "AI is reading the statistics summary…",
  aiGenerate: "✨ Generate AI insight",
  aiIdleDesc: "AI will read the statistics summary and explain the findings. Click to start (saves your quota).",
  aiStory: "Data story",
  aiFindings: "Notable findings",
  aiSuggestions: "Suggested next analyses",
  loadFail: "Couldn't load the insight.",

  chatTitle: "Ask about the data",
  chatExample: 'Example: “Which column is most related to {col}?”',
  chatPlaceholder: "Type your question…",
  chatSend: "Send",
  chatTyping: "typing…",
  chatFail: "Couldn't answer.",

  qScore: "Data quality score",
  qNoIssues: "No issues detected 🎉",
  qIssueCount: "{n} things to clean up",
  sevHigh: "High",
  sevMedium: "Medium",
  sevLow: "Low",
  actDropDup: "Remove duplicates",
  actFillMedian: "Fill median",
  actFillMean: "Fill mean",
  actFillMode: "Fill mode",
  actDropRows: "Drop rows",
  actNormalize: "Normalize",
  actDropCol: "Drop column",

  cbAuto: "Auto-clean",
  cbAutoNone: "Nothing to clean up",
  cbAutoTip: "Apply {n} standard fixes",
  cbUndo: "↩ Undo",
  cbReset: "Reset",
  cbShowHistory: "Show history ({n})",
  cbHideHistory: "Hide history ({n})",
  cbNoChanges: "Original data · no changes yet",

  advTitle: "AI cleaning suggestions",
  advAsk: "Ask AI for suggestions",
  advAnalyzing: "Analyzing…",
  advDesc:
    "AI reads a summary of the problems (not raw data) and suggests actions. You decide — code executes.",
  advClean: "Data is already clean 🎉",
  advNoProblems: "No problems to analyze",
  advNoRecs: "AI suggested no changes for this data.",
  advApply: "Apply selected ({n})",
  advFail: "Couldn't get suggestions.",
  advLabelDropDup: "Remove duplicate rows",
  advLabelFill: 'Column "{col}" — {strategy}',
  advLabelNormalize: 'Normalize category "{col}"',
  advLabelDropCol: 'Drop column "{col}"',
  advStratMedian: "fill median",
  advStratMean: "fill mean",
  advStratMode: "fill mode",
  advStratDrop: "drop empty rows",
};

const DICTS: Record<Lang, Dict> = { id: ID, en: EN };

export function t(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>,
): string {
  let s = DICTS[lang][key] ?? ID[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}

// --- formatters for computed text -----------------------------------------

function f1(n: unknown): string {
  return typeof n === "number" ? n.toFixed(1) : String(n ?? "");
}

/** Localised title + detail for a detected data-quality issue. */
export function formatIssue(
  lang: Lang,
  issue: DataQualityIssue,
): { title: string; detail: string } {
  const col = issue.column ?? "";
  const m = issue.meta;
  const id = lang === "id";
  switch (issue.kind) {
    case "duplicateRows":
      return {
        title: id ? "Baris duplikat" : "Duplicate rows",
        detail: id
          ? `${m.count} baris identik (${f1(m.pct)}% dari data).`
          : `${m.count} identical rows (${f1(m.pct)}% of the data).`,
      };
    case "missing":
      return {
        title: id ? "Nilai kosong (missing)" : "Missing values",
        detail: id
          ? `Kolom "${col}": ${m.missing} kosong (${f1(m.missingPct)}%).`
          : `Column "${col}": ${m.missing} missing (${f1(m.missingPct)}%).`,
      };
    case "constantColumn":
      return {
        title: id ? "Kolom konstan" : "Constant column",
        detail: id
          ? `Kolom "${col}" isinya satu nilai saja — tidak menambah informasi.`
          : `Column "${col}" holds a single value — it adds no information.`,
      };
    case "emptyColumn":
      return {
        title: id ? "Kolom kosong total" : "Fully empty column",
        detail: id
          ? `Kolom "${col}" tidak punya nilai sama sekali.`
          : `Column "${col}" has no values at all.`,
      };
    case "inconsistentCategory": {
      const ex = Array.isArray(m.examples) ? (m.examples as string[])[0] : "";
      return {
        title: id ? "Kategori tidak konsisten" : "Inconsistent categories",
        detail: id
          ? `Kolom "${col}": ${m.groups} kelompok nilai sama tapi beda penulisan (mis. ${ex}).`
          : `Column "${col}": ${m.groups} groups of same value written differently (e.g. ${ex}).`,
      };
    }
    case "idLike":
      return {
        title: id ? "Kemungkinan kolom ID" : "Possible ID column",
        detail: id
          ? `Kolom "${col}" terlihat seperti pengenal unik — biasanya tidak dipakai untuk analisis statistik.`
          : `Column "${col}" looks like a unique identifier — usually not used for statistical analysis.`,
      };
    case "outliers":
      return {
        title: id ? "Outlier (nilai ekstrem)" : "Outliers (extreme values)",
        detail: id
          ? `Kolom "${col}": ${m.count} outlier (${f1(m.pct)}%) menurut metode IQR.`
          : `Column "${col}": ${m.count} outliers (${f1(m.pct)}%) by the IQR method.`,
      };
    default:
      return { title: issue.title, detail: issue.detail };
  }
}

const STRAT_LABEL: Record<Lang, Record<string, string>> = {
  id: { median: "median", mean: "mean", mode: "modus", drop: "drop" },
  en: { median: "median", mean: "mean", mode: "mode", drop: "drop" },
};

/** Localised description for a cleaning change. */
export function formatChange(lang: Lang, change: CleaningChange): string {
  const col = change.column ?? "";
  const m = change.meta;
  const id = lang === "id";
  switch (change.op) {
    case "dropDuplicates":
      return id
        ? `Menghapus ${m.removed} baris duplikat.`
        : `Removed ${m.removed} duplicate rows.`;
    case "fillMissing":
      if (m.strategy === "drop") {
        return id
          ? `Menghapus ${m.removed} baris yang kosong di "${col}".`
          : `Dropped ${m.removed} rows missing in "${col}".`;
      }
      return id
        ? `Mengisi ${m.filled} nilai kosong di "${col}" dengan ${STRAT_LABEL.id[String(m.strategy)]} (${m.value}).`
        : `Filled ${m.filled} missing values in "${col}" with ${STRAT_LABEL.en[String(m.strategy)]} (${m.value}).`;
    case "normalizeCategory":
      return id
        ? `Merapikan ${m.changed} nilai di "${col}" (${m.mergedGroups} kelompok digabung/dirapikan).`
        : `Tidied ${m.changed} values in "${col}" (${m.mergedGroups} groups merged/cleaned).`;
    case "dropColumn":
      return id ? `Membuang kolom "${col}".` : `Dropped column "${col}".`;
    default:
      return change.description;
  }
}
