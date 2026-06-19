// lib/llm.ts
// SERVER-ONLY. Multi-provider LLM access. API keys are read from process.env
// and NEVER reach the client. Do not import this file from a client component.
//
// Providers:
//  - Gemini via the official unified SDK (@google/genai)
//  - Groq via its OpenAI-compatible REST endpoint (no extra dependency)

import { GoogleGenAI } from "@google/genai";
import { getModelOption, type ModelOption } from "./config";

export class LLMError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

// --- Gemini ---------------------------------------------------------------

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "GEMINI_API_KEY belum di-set di server. Tambahkan di .env.local (lokal) atau Environment Variables (Vercel).",
      500,
    );
  }
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

async function generateGemini(prompt: string, model: string): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({ model, contents: prompt });
  const text = response.text;
  if (!text || !text.trim()) {
    throw new LLMError("Model mengembalikan jawaban kosong.", 502);
  }
  return text;
}

// --- Groq (OpenAI-compatible) ---------------------------------------------

async function generateGroq(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "GROQ_API_KEY belum di-set di server. Tambahkan di .env.local atau pilih model Gemini.",
      500,
    );
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    let msg = `Groq error (${res.status}).`;
    try {
      const j = await res.json();
      msg = j?.error?.message ?? msg;
    } catch {
      /* keep default */
    }
    throw new LLMError(msg, res.status);
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new LLMError("Model mengembalikan jawaban kosong.", 502);
  }
  return text;
}

// --- Public API: dispatch + shared retry ----------------------------------

function dispatch(m: ModelOption, prompt: string): Promise<string> {
  return m.provider === "gemini"
    ? generateGemini(prompt, m.model)
    : generateGroq(prompt, m.model);
}

/**
 * Generate text with the given model id (falls back to the default model).
 * Retries once on transient rate-limit / server errors (free-tier friendly).
 */
export async function generateText(
  prompt: string,
  modelId?: string,
): Promise<string> {
  const m = getModelOption(modelId);
  try {
    return await dispatch(m, prompt);
  } catch (err) {
    const status = extractStatus(err);
    if (status === 429 || (status >= 500 && status < 600)) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        return await dispatch(m, prompt);
      } catch (err2) {
        throw toLLMError(err2);
      }
    }
    throw toLLMError(err);
  }
}

function extractStatus(err: unknown): number {
  if (err instanceof LLMError) return err.status;
  const anyErr = err as { status?: number; code?: number } | undefined;
  return anyErr?.status ?? anyErr?.code ?? 500;
}

function toLLMError(err: unknown): LLMError {
  if (err instanceof LLMError) return err;
  const status = extractStatus(err);
  if (status === 429) {
    return new LLMError(
      "Batas penggunaan gratis AI tercapai sebentar. Coba lagi, atau ganti model.",
      429,
    );
  }
  const msg = err instanceof Error ? err.message : "Gagal memanggil AI.";
  return new LLMError(msg, status >= 400 && status < 600 ? status : 502);
}
