// app/api/chat/route.ts
// (stretch) POST { summary, question } -> { answer }. Stateless: the client
// re-sends the StatsSummary each turn. Same privacy rules: no raw rows.

import { NextResponse } from "next/server";
import { buildChatPrompt } from "@/lib/prompt";
import { generateText, LLMError } from "@/lib/llm";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";
import type { StatsSummary } from "@/lib/types";

export const runtime = "nodejs";

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

  const { summary, question, model, lang } = (body ?? {}) as {
    summary?: StatsSummary;
    question?: string;
    model?: string;
    lang?: string;
  };

  if (!summary || typeof summary !== "object" || !Array.isArray(summary.columns)) {
    return NextResponse.json({ error: "Ringkasan statistik tidak valid." }, { status: 400 });
  }
  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Pertanyaan kosong." }, { status: 400 });
  }
  if (question.length > 2000 || summary.columns.length > 2000) {
    return NextResponse.json({ error: "Input terlalu besar." }, { status: 413 });
  }

  try {
    const text = await generateText(
      buildChatPrompt(summary, question.trim(), lang === "en" ? "en" : "id"),
      model,
    );
    return NextResponse.json({ answer: text.trim() });
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Gagal menjawab pertanyaan." }, { status: 500 });
  }
}
