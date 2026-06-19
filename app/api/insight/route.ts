// app/api/insight/route.ts
// POST { summary: StatsSummary } -> AIInsight. Server-side only; this is the
// single place the Gemini key is used. Raw data rows never arrive here.

import { NextResponse } from "next/server";
import { buildInsightPrompt } from "@/lib/prompt";
import { generateText, LLMError } from "@/lib/llm";
import { parseInsight } from "@/lib/parseInsight";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import type { StatsSummary } from "@/lib/types";

export const runtime = "nodejs";

function isStatsSummary(x: unknown): x is StatsSummary {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.rowCount === "number" &&
    typeof s.columnCount === "number" &&
    Array.isArray(s.columns)
  );
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

  const { summary, model, lang } = (body ?? {}) as {
    summary?: unknown;
    model?: string;
    lang?: string;
  };
  if (!isStatsSummary(summary)) {
    return NextResponse.json(
      { error: "Payload tidak valid: butuh { summary: StatsSummary }." },
      { status: 400 },
    );
  }
  if (summary.columns.length > 2000) {
    return NextResponse.json({ error: "Dataset terlalu besar." }, { status: 413 });
  }

  try {
    const prompt = buildInsightPrompt(summary, lang === "en" ? "en" : "id");
    const text = await generateText(prompt, model);
    return NextResponse.json(parseInsight(text));
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghasilkan insight." },
      { status: 500 },
    );
  }
}
