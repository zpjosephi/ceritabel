"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LanguageProvider";

type Status = "idle" | "sending" | "done" | "error";

const MOODS = ["😞", "😐", "🙂", "😍"];

export default function FeedbackWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // auto-close shortly after a successful send
  useEffect(() => {
    if (status !== "done") return;
    const id = setTimeout(() => close(), 1800);
    return () => clearTimeout(id);
  }, [status]);

  const cats: { key: string; label: string; icon: string }[] = [
    { key: t("fbCatBug"), label: t("fbCatBug"), icon: "🐞" },
    { key: t("fbCatIdea"), label: t("fbCatIdea"), icon: "💡" },
    { key: t("fbCatOther"), label: t("fbCatOther"), icon: "💬" },
  ];

  async function send() {
    if (!message.trim()) {
      setError(t("fbEmpty"));
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          email,
          category,
          mood: mood ?? "",
          page: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t("fbFail"));
      setStatus("done");
      setMessage("");
      setEmail("");
      setMood(null);
      setCategory("");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : t("fbFail"));
    }
  }

  function close() {
    setOpen(false);
    setStatus("idle");
    setError(null);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open ? (
        <div className="w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-accent/30 bg-surface/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {/* gradient header */}
          <div className="relative bg-gradient-to-br from-accent/30 via-accent/10 to-transparent px-4 pb-3 pt-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {t("fbTitle")}
              </h2>
              <button
                onClick={close}
                aria-label={t("fbClose")}
                className="ml-auto grid h-6 w-6 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="mt-0.5 text-xs text-muted">{t("fbDesc")}</p>
          </div>

          <div className="px-4 pb-4 pt-1">
            {status === "done" ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="grid h-12 w-12 animate-[pop_0.3s_ease-out] place-items-center rounded-full bg-accent/20 text-2xl">
                  ✓
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t("fbThanks")}
                </p>
              </div>
            ) : (
              <>
                {/* mood */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMood(mood === m ? null : m)}
                      aria-label={m}
                      className={`grid h-10 flex-1 place-items-center rounded-xl border text-xl transition ${
                        mood === m
                          ? "scale-105 border-accent bg-accent/15"
                          : "border-border bg-surface-2 grayscale hover:grayscale-0"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* category chips */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {cats.map((c) => (
                    <button
                      key={c.key}
                      onClick={() =>
                        setCategory(category === c.key ? "" : c.key)
                      }
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        category === c.key
                          ? "border-accent/50 bg-accent/15 text-accent-strong"
                          : "border-border bg-surface-2 text-muted hover:text-foreground"
                      }`}
                    >
                      <span aria-hidden>{c.icon}</span>
                      {c.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("fbPlaceholder")}
                  rows={4}
                  maxLength={1500}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("fbEmail")}
                  className="mt-2 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
                />
                {error ? (
                  <p className="mt-2 text-xs text-negative">{error}</p>
                ) : null}
                <button
                  onClick={send}
                  disabled={status === "sending"}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-accent to-accent-strong px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:opacity-60"
                >
                  {status === "sending" ? t("fbSending") : `${t("fbSend")} →`}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2 rounded-full border border-accent/40 bg-gradient-to-r from-surface to-surface-2 py-2.5 pl-3 pr-4 text-sm font-medium text-foreground shadow-lg shadow-black/40 transition hover:border-accent hover:shadow-accent/20"
        >
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-full bg-accent/20 text-accent-strong transition group-hover:bg-accent/30"
          >
            💬
          </span>
          {t("fbButton")}
        </button>
      )}
    </div>
  );
}
