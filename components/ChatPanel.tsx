"use client";

import { useRef, useState } from "react";
import type { StatsSummary } from "@/lib/types";
import { useLang } from "./LanguageProvider";

interface Msg {
  role: "user" | "ai";
  text: string;
}

export default function ChatPanel({
  summary,
  modelId,
}: {
  summary: StatsSummary;
  modelId: string;
}) {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, question, model: modelId, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("chatFail"));
      setMessages((m) => [...m, { role: "ai", text: data.answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chatFail"));
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  }

  return (
    <section className="border-t border-border pt-4">
      <h2 className="mb-3 font-serif text-xl font-semibold text-foreground">
        {t("chatTitle")}
      </h2>

      <div
        ref={listRef}
        className="mb-3 max-h-72 space-y-3 overflow-y-auto"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            {t("chatExample", { col: summary.columns[0]?.name ?? "X" })}
          </p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-md px-3 py-2 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-surface-3 text-foreground"
                : "bg-surface text-foreground/90"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading ? (
          <div className="max-w-[90%] rounded-md bg-surface px-3 py-2 text-sm text-muted">
            {t("chatTyping")}
          </div>
        ) : null}
      </div>

      {error ? <p className="mb-2 text-sm text-negative">{error}</p> : null}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={t("chatPlaceholder")}
          aria-label={t("chatPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-muted focus-visible:outline-offset-0"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-md border border-border-strong px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-muted active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("chatSend")}
        </button>
      </div>
    </section>
  );
}
