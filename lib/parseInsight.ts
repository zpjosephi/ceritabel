// lib/parseInsight.ts
// Robustly turn the model's text into an AIInsight. Falls back to raw text
// (never crashes) when the model didn't return clean JSON.

import type { AIInsight } from "./types";

/** Strip ```json ... ``` / ``` ... ``` fences if the model wrapped its output. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fence ? fence[1].trim() : trimmed;
}

export function parseInsight(text: string): AIInsight {
  const cleaned = stripCodeFences(text);
  try {
    const obj = JSON.parse(cleaned) as Partial<AIInsight>;
    const summary = typeof obj.summary === "string" ? obj.summary : "";
    const findings = Array.isArray(obj.findings)
      ? obj.findings.filter((x): x is string => typeof x === "string")
      : [];
    const suggestions = Array.isArray(obj.suggestions)
      ? obj.suggestions.filter((x): x is string => typeof x === "string")
      : [];
    if (summary || findings.length || suggestions.length) {
      return { summary, findings, suggestions };
    }
  } catch {
    // fall through to raw fallback
  }
  // Fallback: show the raw model text so nothing is lost.
  return { summary: text.trim(), findings: [], suggestions: [], raw: text };
}
