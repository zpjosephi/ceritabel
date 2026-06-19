// app/api/explain-test/route.ts
// POST { result, model, lang } -> { explanation }
// The test result is computed in code (lib/inference.ts); the AI only explains.

import { NextResponse } from "next/server";
import { buildExplainTestPrompt } from "@/lib/prompt";
import { generateText, LLMError } from "@/lib/llm";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

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

  const { result, model, lang } = (body ?? {}) as {
    result?: unknown;
    model?: string;
    lang?: string;
  };
  if (!result || typeof result !== "object") {
    return NextResponse.json({ error: "Hasil uji tidak valid." }, { status: 400 });
  }

  try {
    const text = await generateText(
      buildExplainTestPrompt(result, lang === "en" ? "en" : "id"),
      model,
    );
    return NextResponse.json({ explanation: text.trim() });
  } catch (err) {
    if (err instanceof LLMError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Gagal menjelaskan hasil uji." }, { status: 500 });
  }
}
