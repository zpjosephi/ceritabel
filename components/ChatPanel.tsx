"use client";

import { useRef, useState } from "react";
import { ChatCircleDots } from "@phosphor-icons/react";
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
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <ChatCircleDots
          aria-hidden
          weight="duotone"
          className="text-accent-strong"
          size={18}
        />
        <h2 className="font-semibold text-foreground">{t("chatTitle")}</h2>
      </div>

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
            className={`max-w-[90%] rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
              m.role === "user"
                ? "ml-auto bg-accent/20 text-foreground"
                : "border border-transparent bg-surface-2 text-foreground/90 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading ? (
          <div className="bg-surface-2 max-w-[90%] rounded-lg px-3 py-2 text-sm text-muted">
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
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {t("chatSend")}
        </button>
      </div>
    </div>
  );
}
