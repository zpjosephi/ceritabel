// lib/config.ts
// Small, central knobs. No secrets here — safe to import on the client.

/** Language for AI-generated insight text. Switch to "en" for English. */
export const INSIGHT_LANG: "id" | "en" = "id";

/** Threshold for a correlation to be considered "strong" and sent to the AI. */
export const STRONG_CORRELATION_THRESHOLD = 0.5;

/** How many top categories to keep for categorical summaries. */
export const TOP_CATEGORIES = 5;

// ---------------------------------------------------------------------------
// AI model registry (multi-provider). The `id` is the stable value passed
// between client and server; provider keys live only in lib/llm.ts (server).
// ---------------------------------------------------------------------------

export type LLMProvider = "gemini" | "groq";

export interface ModelOption {
  id: string; // stable id used in API requests
  label: string; // shown in the picker
  provider: LLMProvider;
  model: string; // the provider's own model name
  /** Short note shown under the label. */
  note: string;
  /** Requires this env var to be set on the server. */
  requiresEnv: "GEMINI_API_KEY" | "GROQ_API_KEY";
}

export const MODELS: ModelOption[] = [
  {
    id: "gemini-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    note: "Cepat & seimbang · default",
    requiresEnv: "GEMINI_API_KEY",
  },
  {
    id: "gemini-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    note: "Paling ringan & hemat kuota",
    requiresEnv: "GEMINI_API_KEY",
  },
  {
    id: "groq-llama-70b",
    label: "Llama 3.3 70B",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    note: "Groq · sangat cepat",
    requiresEnv: "GROQ_API_KEY",
  },
  {
    id: "groq-llama-8b",
    label: "Llama 3.1 8B",
    provider: "groq",
    model: "llama-3.1-8b-instant",
    note: "Groq · paling ringan",
    requiresEnv: "GROQ_API_KEY",
  },
];

export const DEFAULT_MODEL_ID = "gemini-flash";

export function getModelOption(id: string | undefined): ModelOption {
  return (
    MODELS.find((m) => m.id === id) ??
    MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!
  );
}
