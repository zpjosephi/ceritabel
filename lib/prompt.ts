// lib/prompt.ts
// Builds the LLM prompt from a StatsSummary. The hard rule: the model must
// ONLY interpret the numbers we computed — never calculate or invent figures.

import type { StatsSummary } from "./types";
import { INSIGHT_LANG } from "./config";
import type { Lang } from "./i18n";

const SYSTEM_RULES_ID = `Kamu adalah analis data yang menjelaskan temuan ke orang awam (non-teknis).
Kamu HANYA menerima ringkasan statistik yang SUDAH dihitung dengan benar oleh program.
ATURAN KERAS:
- JANGAN menghitung atau mengarang angka apa pun. Pakai hanya angka yang ada di ringkasan.
- Kalau suatu angka tidak ada di ringkasan, jangan dibuat-buat — katakan tidak tersedia.
- Bahasa Indonesia yang sederhana, hangat, dan mudah dipahami. Hindari jargon; kalau perlu istilah teknis, jelaskan singkat.
- Jangan menyebut "JSON", "ringkasan", atau hal teknis internal ke pembaca.`;

const SYSTEM_RULES_EN = `You are a data analyst explaining findings to a non-technical audience.
You ONLY receive statistics that were ALREADY computed correctly by a program.
HARD RULES:
- Do NOT compute or invent any numbers. Use only the numbers given in the summary.
- If a number is not in the summary, do not make it up — say it isn't available.
- Use simple, warm, easy-to-read English. Avoid jargon; briefly explain any technical term you must use.
- Do not mention "JSON", "summary", or internal technical details to the reader.`;

const TASK_ID = `Tugasmu: hasilkan TEPAT 3 bagian.
1. summary: cerita singkat "apa kira-kira isi & pesan data ini" dalam 2–4 kalimat, bahasa awam.
2. findings: daftar temuan menarik (3–6 item). Pertimbangkan: korelasi kuat antar kolom, kolom dengan banyak missing values, outlier, dan distribusi yang kemungkinan miring (mis. kalau mean jauh lebih besar dari median → kemungkinan miring ke kanan).
3. suggestions: TEPAT 3 saran analisis atau pertanyaan lanjutan yang masuk akal untuk data ini.`;

const TASK_EN = `Your task: produce EXACTLY 3 sections.
1. summary: a short 2–4 sentence plain-language story of what this data likely contains and its message.
2. findings: a list of interesting findings (3–6 items). Consider: strong correlations between columns, columns with many missing values, outliers, and likely skewed distributions (e.g. if mean is much larger than median → likely right-skewed).
3. suggestions: EXACTLY 3 sensible follow-up analyses or questions for this data.`;

const OUTPUT_FORMAT = `Balas HANYA dalam JSON valid (tanpa markdown, tanpa code fence) dengan bentuk persis:
{"summary": string, "findings": string[], "suggestions": string[]}
"suggestions" harus berisi tepat 3 elemen.`;

const OUTPUT_FORMAT_EN = `Respond ONLY with valid JSON (no markdown, no code fences) in exactly this shape:
{"summary": string, "findings": string[], "suggestions": string[]}
"suggestions" must contain exactly 3 elements.`;

export function buildInsightPrompt(
  summary: StatsSummary,
  lang: Lang = INSIGHT_LANG,
): string {
  const isId = lang === "id";
  const rules = isId ? SYSTEM_RULES_ID : SYSTEM_RULES_EN;
  const task = isId ? TASK_ID : TASK_EN;
  const format = isId ? OUTPUT_FORMAT : OUTPUT_FORMAT_EN;

  return [
    rules,
    "",
    isId ? "RINGKASAN STATISTIK (sudah dihitung program):" : "STATISTICS SUMMARY (already computed by the program):",
    "```json",
    JSON.stringify(summary, null, 2),
    "```",
    "",
    task,
    "",
    format,
  ].join("\n");
}

/** A compact problem item sent to the cleaning advisor. */
export interface AdviceProblem {
  kind: string;
  column?: string;
  detail: string;
  severity: string;
}

export function buildCleanAdvicePrompt(
  summary: StatsSummary,
  problems: AdviceProblem[],
  lang: Lang = INSIGHT_LANG,
): string {
  const isId = lang === "id";

  const rules = isId
    ? `Kamu adalah analis data yang menyarankan langkah pembersihan data.
Kamu HANYA menerima ringkasan statistik & daftar masalah yang sudah dideteksi program.
ATURAN KERAS:
- JANGAN menghitung atau mengarang angka. Pakai hanya angka di ringkasan.
- Kamu HANYA boleh menyarankan aksi dari daftar berikut (tidak ada yang lain):
  • {"op":"dropDuplicates"}  → hapus baris duplikat (tanpa kolom)
  • {"op":"fillMissing","column":<nama>,"strategy":"median"|"mean"|"mode"|"drop"}
  • {"op":"normalizeCategory","column":<nama>}  → rapikan kapital/spasi kategori
  • {"op":"dropColumn","column":<nama>}  → buang kolom
- Pilih strategy missing dengan bijak: untuk kolom numerik yang miring / punya outlier (mean jauh dari median) pakai "median"; kalau simetris boleh "mean"; untuk kategorikal pakai "mode". Kalau missing sangat banyak (mis. > 50%) atau kolom tidak berguna, pertimbangkan "drop" baris atau buang kolom.
- Jangan menyarankan aksi untuk masalah yang tidak ada di daftar.`
    : `You are a data analyst recommending data-cleaning steps.
You ONLY receive a computed statistics summary and a list of detected problems.
HARD RULES:
- Do NOT compute or invent numbers. Use only the numbers in the summary.
- You may ONLY recommend actions from this exact vocabulary (nothing else):
  • {"op":"dropDuplicates"}
  • {"op":"fillMissing","column":<name>,"strategy":"median"|"mean"|"mode"|"drop"}
  • {"op":"normalizeCategory","column":<name>}
  • {"op":"dropColumn","column":<name>}
- Choose the missing strategy wisely: for skewed numeric columns / with outliers (mean far from median) use "median"; if symmetric "mean" is fine; for categorical use "mode". If missingness is very high (e.g. > 50%) or the column is useless, consider dropping rows or the column.`;

  const task = isId
    ? `Untuk setiap masalah yang layak ditangani, beri SATU rekomendasi aksi + alasan singkat (bahasa awam, sebut angkanya). Urutkan dari yang paling penting.`
    : `For each problem worth addressing, give ONE recommended action + a short reason (plain language, cite the numbers). Order by importance.`;

  const format = isId
    ? `Balas HANYA JSON valid (tanpa markdown/code fence) bentuk persis:
{"summary": string, "recommendations": [{"op": string, "column": string|null, "strategy": string|null, "reason": string}]}`
    : `Respond ONLY with valid JSON (no markdown/code fences) in exactly this shape:
{"summary": string, "recommendations": [{"op": string, "column": string|null, "strategy": string|null, "reason": string}]}`;

  return [
    rules,
    "",
    isId ? "RINGKASAN STATISTIK:" : "STATISTICS SUMMARY:",
    "```json",
    JSON.stringify(summary, null, 2),
    "```",
    "",
    isId ? "MASALAH TERDETEKSI:" : "DETECTED PROBLEMS:",
    "```json",
    JSON.stringify(problems, null, 2),
    "```",
    "",
    task,
    "",
    format,
  ].join("\n");
}

export function buildExplainTestPrompt(
  result: unknown,
  lang: Lang = INSIGHT_LANG,
): string {
  const isId = lang === "id";
  const rules = isId
    ? `Kamu analis data. Kamu menerima HASIL uji statistik yang SUDAH dihitung program (statistik uji, derajat bebas, p-value, ukuran efek). JANGAN menghitung ulang atau mengarang angka. Jelaskan ke orang awam (non-teknis): (1) uji apa ini & untuk apa, (2) apa arti p-value-nya (signifikan di α=0,05 atau tidak) dalam bahasa sederhana, (3) seberapa besar/penting efeknya, dan (4) 1 peringatan/kehati-hatian (mis. ukuran sampel kecil, korelasi ≠ sebab-akibat). Maksimal ~6 kalimat. Jangan sebut "JSON".`
    : `You are a data analyst. You receive a statistical test RESULT already computed by a program (test statistic, degrees of freedom, p-value, effect size). Do NOT recompute or invent numbers. Explain to a non-technical reader: (1) what test this is & its purpose, (2) what the p-value means (significant at α=0.05 or not) in plain words, (3) how large/important the effect is, and (4) one caveat (e.g. small sample, correlation ≠ causation). Max ~6 sentences. Don't mention "JSON".`;
  return [
    rules,
    "",
    isId ? "HASIL UJI:" : "TEST RESULT:",
    "```json",
    JSON.stringify(result, null, 2),
    "```",
  ].join("\n");
}

export function buildChatPrompt(
  summary: StatsSummary,
  question: string,
  lang: Lang = INSIGHT_LANG,
): string {
  const isId = lang === "id";
  const rules = isId ? SYSTEM_RULES_ID : SYSTEM_RULES_EN;
  return [
    rules,
    "",
    isId
      ? "Jawab pertanyaan pengguna HANYA berdasarkan ringkasan statistik di bawah. Jangan menghitung ulang atau mengarang angka. Jawab ringkas (maksimal ~5 kalimat) dalam bahasa awam."
      : "Answer the user's question ONLY from the statistics summary below. Do not recompute or invent numbers. Answer concisely (max ~5 sentences) in plain language.",
    "",
    isId ? "RINGKASAN STATISTIK:" : "STATISTICS SUMMARY:",
    "```json",
    JSON.stringify(summary, null, 2),
    "```",
    "",
    (isId ? "PERTANYAAN: " : "QUESTION: ") + question,
  ].join("\n");
}
