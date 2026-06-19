// app/api/clean-advice/route.ts
// POST { summary, problems, model } -> { summary, recommendations }
// The AI only PROPOSES cleaning actions; this route validates each one against
// our action vocabulary and the real column names before it ever reaches the
// client. Code stays the single source of truth for what can be executed.

import { NextResponse } from "next/server";
import { buildCleanAdvicePrompt, type AdviceProblem } from "@/lib/prompt";
import { generateText, LLMError } from "@/lib/llm";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import type { StatsSummary } from "@/lib/types";
import type { CleaningAction, MissingStrategy } from "@/lib/cleaning";

export const runtime = "nodejs";

const VALID_STRATEGIES = new Set<MissingStrategy>([
  "median",
  "mean",
  "mode",
  "drop",
]);

interface RawRec {
  op?: unknown;
  column?: unknown;
  strategy?: unknown;
  reason?: unknown;
}

function validate(
  rec: RawRec,
  columnNames: Set<string>,
): { action: CleaningAction; reason: string } | null {
  const reason = typeof rec.reason === "string" ? rec.reason : "";
  const column = typeof rec.column === "string" ? rec.column : undefined;

  switch (rec.op) {
    case "dropDuplicates":
      return { action: { op: "dropDuplicates" }, reason };
    case "fillMissing": {
      if (!column || !columnNames.has(column)) return null;
      const strategy = rec.strategy as MissingStrategy;
      if (!VALID_STRATEGIES.has(strategy)) return null;
      return { action: { op: "fillMissing", column, strategy }, reason };
    }
    case "normalizeCategory":
      if (!column || !columnNames.has(column)) return null;
      return { action: { op: "normalizeCategory", column }, reason };
    case "dropColumn":
      if (!column || !columnNames.has(column)) return null;
      return { action: { op: "dropColumn", column }, reason };
    default:
      return null;
  }
}

function stripFences(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return m ? m[1].trim() : t;
}

export async function POST(req: Request) {
  const rl = rateLimit(req);
  if (!rl.ok) {
    const r = rateLimitResponse(rl.retryAfter);
    return NextResponse.json(r.body, r.init);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON yang valid." }, { status: 400 });
  }

  const { summary, problems, model, lang } = (body ?? {}) as {
    summary?: StatsSummary;
    problems?: AdviceProblem[];
    model?: string;
    lang?: string;
  };

  if (!summary || typeof summary !== "object" || !Array.isArray(summary.columns)) {
    return NextResponse.json({ error: "Ringkasan statistik tidak valid." }, { status: 400 });
  }
  const safeProblems = Array.isArray(problems) ? problems : [];

  try {
    const prompt = buildCleanAdvicePrompt(
      summary,
      safeProblems,
      lang === "en" ? "en" : "id",
    );
    const text = await generateText(prompt, model);

    const columnNames = new Set(summary.columns.map((c) => c.name));
    let parsed: { summary?: unknown; recommendations?: unknown } = {};
    try {
      parsed = JSON.parse(stripFences(text));
    } catch {
      return NextResponse.json(
        { summary: text.trim(), recommendations: [] },
        { status: 200 },
      );
    }

    const recsRaw = Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as RawRec[])
      : [];
    const recommendations = recsRaw
      .map((r) => validate(r, columnNames))
      .filter((r): r is { action: CleaningAction; reason: string } => r !== null);

    return NextResponse.json({
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      recommendations,
    });
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Gagal mendapatkan saran pembersihan." },
      { status: 500 },
    );
  }
}
