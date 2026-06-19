"use client";

import { useState } from "react";
import { useLang } from "./LanguageProvider";

type Status = "idle" | "sending" | "done" | "error";

export default function FeedbackWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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
          page: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t("fbFail"));
      setStatus("done");
      setMessage("");
      setEmail("");
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
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open ? (
        <div className="w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span aria-hidden>💬</span>
            <h2 className="text-sm font-semibold text-foreground">{t("fbTitle")}</h2>
            <button
              onClick={close}
              aria-label={t("fbClose")}
              className="ml-auto text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="p-4">
            {status === "done" ? (
              <p className="py-4 text-center text-sm text-foreground">{t("fbThanks")}</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted">{t("fbDesc")}</p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("fbPlaceholder")}
                  rows={4}
                  maxLength={1500}
                  className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("fbEmail")}
                  className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                {error ? <p className="mt-2 text-xs text-negative">{error}</p> : null}
                <button
                  onClick={send}
                  disabled={status === "sending"}
                  className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                >
                  {status === "sending" ? t("fbSending") : t("fbSend")}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-accent/40 bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-lg shadow-black/30 transition hover:border-accent hover:bg-surface-2"
        >
          <span aria-hidden>💬</span>
          {t("fbButton")}
        </button>
      )}
    </div>
  );
}
