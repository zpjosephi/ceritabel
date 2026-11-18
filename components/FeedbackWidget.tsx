"use client";

import { useEffect, useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  ChatCircleDots,
  ChatCircle,
  Bug,
  Lightbulb,
  X,
  Check,
  ArrowRight,
  SmileySad,
  SmileyMeh,
  Smiley,
  SmileyWink,
} from "@phosphor-icons/react";
import { useLang } from "./LanguageProvider";

type Status = "idle" | "sending" | "done" | "error";

const MOODS: { value: string; Icon: Icon; labelKey: string }[] = [
  { value: "bad", Icon: SmileySad, labelKey: "fbMoodBad" },
  { value: "meh", Icon: SmileyMeh, labelKey: "fbMoodMeh" },
  { value: "good", Icon: Smiley, labelKey: "fbMoodGood" },
  { value: "love", Icon: SmileyWink, labelKey: "fbMoodLove" },
];

export default function FeedbackWidget() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // the footer has a plain "Feedback" link for small screens, where a floating
  // button would sit on top of the content
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("open-feedback", show);
    return () => window.removeEventListener("open-feedback", show);
  }, []);

  // auto-close shortly after a successful send
  useEffect(() => {
    if (status !== "done") return;
    const id = setTimeout(() => close(), 1800);
    return () => clearTimeout(id);
  }, [status]);

  const cats: { key: string; label: string; Icon: Icon }[] = [
    { key: t("fbCatBug"), label: t("fbCatBug"), Icon: Bug },
    { key: t("fbCatIdea"), label: t("fbCatIdea"), Icon: Lightbulb },
    { key: t("fbCatOther"), label: t("fbCatOther"), Icon: ChatCircle },
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
        <div className="w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border-strong bg-surface shadow-[var(--shadow-lg)]">
          {/* header - flat accent-tinted surface, hairline underline */}
          <div className="relative border-b border-border px-4 pb-3 pt-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {t("fbTitle")}
              </h2>
              <button
                onClick={close}
                aria-label={t("fbClose")}
                className="ml-auto grid h-6 w-6 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-foreground"
              >
                <X size={14} weight="bold" aria-hidden />
              </button>
            </div>
            <p className="mt-0.5 text-xs text-muted">{t("fbDesc")}</p>
          </div>

          <div className="px-4 pb-4 pt-1">
            {status === "done" ? (
              <div className="flex flex-col items-center gap-2 py-6">
                <div className="grid h-12 w-12 animate-[fade-in_0.25s_ease-out] place-items-center rounded-full bg-accent/20 text-accent-strong">
                  <Check size={24} weight="bold" aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t("fbThanks")}
                </p>
              </div>
            ) : (
              <>
                {/* mood */}
                <div
                  role="radiogroup"
                  aria-label={t("fbMood")}
                  className="mb-3 flex items-center justify-between gap-2"
                >
                  {MOODS.map(({ value, Icon: MoodIcon, labelKey }) => {
                    const selected = mood === value;
                    return (
                      <button
                        key={value}
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setMood(selected ? null : value)}
                        aria-label={t(labelKey)}
                        title={t(labelKey)}
                        className={`grid h-10 flex-1 place-items-center rounded-lg border transition ${
                          selected
                            ? "scale-105 border-accent bg-accent/15 text-accent-strong"
                            : "border-border bg-surface-2 text-muted hover:text-foreground"
                        }`}
                      >
                        <MoodIcon
                          size={22}
                          weight={selected ? "fill" : "regular"}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>

                {/* category chips */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {cats.map(({ key, label, Icon: CatIcon }) => (
                    <button
                      key={key}
                      aria-pressed={category === key}
                      onClick={() =>
                        setCategory(category === key ? "" : key)
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        category === key
                          ? "border-accent/50 bg-accent/15 text-accent-strong"
                          : "border-border bg-surface-2 text-muted hover:text-foreground"
                      }`}
                    >
                      <CatIcon size={14} weight="bold" aria-hidden />
                      {label}
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
                  className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground transition focus:border-muted"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("fbEmail")}
                  className="mt-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground transition focus:border-muted"
                />
                {error ? (
                  <p className="mt-2 text-xs text-negative">{error}</p>
                ) : null}
                <button
                  onClick={send}
                  disabled={status === "sending"}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-ink shadow-[0_8px_24px_-6px_var(--accent-glow)] transition duration-200 hover:bg-accent-strong active:scale-[0.99] disabled:opacity-60"
                >
                  {status === "sending" ? (
                    t("fbSending")
                  ) : (
                    <>
                      {t("fbSend")}
                      <ArrowRight size={15} weight="bold" aria-hidden />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="hidden items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-muted-strong shadow-[var(--shadow-md)] transition-colors hover:border-muted hover:text-foreground active:translate-y-px md:flex"
        >
          <ChatCircleDots size={16} aria-hidden />
          {t("fbButton")}
        </button>
      )}
    </div>
  );
}
