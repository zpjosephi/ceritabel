"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChartLineUp,
  Check,
  Cpu,
  MathOperations,
  ShieldCheck,
  Sparkle,
  UploadSimple,
  type Icon,
} from "@phosphor-icons/react";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import AccentPicker from "@/components/AccentPicker";
import Histogram from "@/components/Histogram";
import CorrelationHeatmap from "@/components/CorrelationHeatmap";
import { useLang } from "@/components/LanguageProvider";
import type { HistogramBin, CorrelationMatrix } from "@/lib/types";

/** Bar-chart brand mark — a simple geometric glyph (allowed per icon policy). */
function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="6.5" y="5" width="3" height="10" rx="1" fill="currentColor" />
      <rect x="12" y="2" width="3" height="13" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const { t } = useLang();
  // The hero already shows the primary CTA. To avoid two identical CTAs in the
  // first viewport, the nav CTA stays hidden until the hero scrolls out of view,
  // then fades in so it's still reachable from anywhere on the page.
  const heroRef = useRef<HTMLElement>(null);
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      {/* ---- Nav: single line, sticky, ≤72px ---- */}
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border/60 bg-background/75 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/15 text-accent">
              <Mark className="h-[15px] w-[15px]" />
            </span>
            <span className="text-[17px] font-semibold tracking-tight">
              cerita<span className="text-accent">bel</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <AccentPicker />
            <LanguageToggle />
            <Link
              href="/analyze"
              aria-hidden={!pastHero}
              tabIndex={pastHero ? 0 : -1}
              className={`hidden rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-ink transition duration-300 hover:bg-accent-strong active:scale-[0.98] sm:inline-flex ${
                pastHero
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
              }`}
            >
              {t("ctaTry")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* ---- Hero: asymmetric split, left message / right live preview ---- */}
        <section ref={heroRef} className="relative">
          <div
            aria-hidden
            className="tech-grid pointer-events-none absolute inset-0 -z-10"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-24 lg:pt-24">
            <div className="fade-up-stagger">
              <span
                style={{ "--i": 0 } as React.CSSProperties}
                className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-strong"
              >
                {t("heroBadge")}
              </span>
              <h1
                style={{ "--i": 1 } as React.CSSProperties}
                className="mt-5 max-w-xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl"
              >
                {t("heroH1")}
              </h1>
              <p
                style={{ "--i": 2 } as React.CSSProperties}
                className="mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted"
              >
                {t("heroLede")}
              </p>
              <div
                style={{ "--i": 3 } as React.CSSProperties}
                className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3"
              >
                <Link
                  href="/analyze"
                  className="rounded-xl bg-accent px-6 py-3 font-medium text-accent-ink shadow-[0_8px_24px_-6px_var(--accent-glow)] transition duration-200 hover:bg-accent-strong hover:shadow-[0_12px_30px_-6px_var(--accent-glow)] active:scale-[0.98]"
                >
                  {t("ctaTry")}
                </Link>
                <a
                  href="#cara-kerja"
                  className="group inline-flex items-center gap-1.5 font-medium text-foreground/90 transition hover:text-foreground"
                >
                  {t("ctaHow")}
                  <ArrowRight
                    className="transition-transform group-hover:translate-x-0.5"
                    size={16}
                    weight="bold"
                  />
                </a>
              </div>
            </div>

            <div
              className="fade-up lg:justify-self-end"
              style={{ animationDelay: "180ms" }}
            >
              <LivePreview />
            </div>
          </div>
        </section>

        {/* ---- What you get: editorial 2-col, heading + divide-y list ---- */}
        <section className="reveal border-t border-border/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-24">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("featTitle")}
              </h2>
              <p className="mt-4 max-w-sm text-pretty leading-relaxed text-muted">
                {t("heroDesc")}
              </p>
            </div>
            <ul className="divide-y divide-border/70">
              <FeatureRow
                icon={MathOperations}
                title={t("feat1Title")}
                body={t("feat1Body")}
              />
              <FeatureRow
                icon={ChartLineUp}
                title={t("feat2Title")}
                body={t("feat2Body")}
              />
              <FeatureRow
                icon={Sparkle}
                title={t("feat3Title")}
                body={t("feat3Body")}
              />
            </ul>
          </div>
        </section>

        {/* ---- How it works: connected horizontal steps ---- */}
        <section
          id="cara-kerja"
          className="reveal border-t border-border/60 bg-surface/30"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("howTitle")}
            </h2>
            <ol className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
              {/* connecting hairline (desktop) */}
              <span
                aria-hidden
                className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
              />
              <Step
                n={1}
                icon={UploadSimple}
                title={t("step1Title")}
                body={t("step1Body")}
              />
              <Step
                n={2}
                icon={Cpu}
                title={t("step2Title")}
                body={t("step2Body")}
              />
              <Step
                n={3}
                icon={Sparkle}
                title={t("step3Title")}
                body={t("step3Body")}
              />
            </ol>
          </div>
        </section>

        {/* ---- Capabilities: 2-col checklist (not pills) ---- */}
        <section className="reveal border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("capTitle")}
            </h2>
            <ul className="mt-8 grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
              {[
                "capEda",
                "capClean",
                "capShape",
                "capHypo",
                "capReg",
                "capPanel",
                "capTs",
                "capExport",
                "capBilingual",
              ].map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 shrink-0 text-accent"
                    size={18}
                    weight="bold"
                  />
                  <span className="text-pretty text-foreground/90">{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- Privacy band ---- */}
        <section className="reveal border-t border-border/60 bg-surface/30">
          <div className="mx-auto flex max-w-6xl items-start gap-4 px-4 py-12 sm:px-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-positive/15 text-positive">
              <ShieldCheck size={20} weight="bold" />
            </span>
            <p className="max-w-2xl text-pretty leading-relaxed text-muted">
              <span className="font-medium text-foreground">
                {t("privacyLabel")}
              </span>{" "}
              {t("privacyBody")}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/** A single feature row in the editorial list (icon + title + body). */
function FeatureRow({
  icon: IconCmp,
  title,
  body,
}: {
  icon: Icon;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4 py-5 first:pt-0">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/12 text-accent">
        <IconCmp size={20} weight="duotone" />
      </span>
      <div>
        <h3 className="font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-1 text-pretty leading-relaxed text-muted">{body}</p>
      </div>
    </li>
  );
}

/** A step in the "how it works" process. The verb title IS the label. */
function Step({
  n,
  icon: IconCmp,
  title,
  body,
}: {
  n: number;
  icon: Icon;
  title: string;
  body: string;
}) {
  return (
    <li className="relative">
      <div className="flex items-center gap-3">
        <span className="tnum grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-background text-sm font-semibold text-accent-strong">
          {n}
        </span>
        <span className="text-accent">
          <IconCmp size={22} weight="duotone" />
        </span>
      </div>
      <h3 className="mt-4 font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">
        {body}
      </p>
    </li>
  );
}

/* ---- Live product preview: REAL chart components on sample data ---- */
/* These are the actual <Histogram> and <CorrelationHeatmap> the app renders,
   fed labeled sample data — a real component preview, not a fake screenshot. */

const SAMPLE_BINS: HistogramBin[] = [
  { x0: 0, x1: 10, count: 8, label: "0-10" },
  { x0: 10, x1: 20, count: 18, label: "10-20" },
  { x0: 20, x1: 30, count: 31, label: "20-30" },
  { x0: 30, x1: 40, count: 42, label: "30-40" },
  { x0: 40, x1: 50, count: 29, label: "40-50" },
  { x0: 50, x1: 60, count: 16, label: "50-60" },
  { x0: 60, x1: 70, count: 7, label: "60-70" },
];

const SAMPLE_CM: CorrelationMatrix = {
  fields: ["harga", "luas", "kamar", "umur"],
  matrix: [
    [1, 0.82, 0.61, -0.34],
    [0.82, 1, 0.55, -0.28],
    [0.61, 0.55, 1, -0.12],
    [-0.34, -0.28, -0.12, 1],
  ],
};

function LivePreview() {
  const { t } = useLang();
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-surface/80 p-5 shadow-[var(--shadow-md)] backdrop-blur-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-sm font-medium tracking-tight text-foreground">
          {t("previewHeading")}
        </span>
        <span className="tele text-[10px] text-muted">{t("previewBadge")}</span>
      </div>
      <Histogram bins={SAMPLE_BINS} />
      <div className="my-4 h-px bg-border/70" />
      <CorrelationHeatmap cm={SAMPLE_CM} />
    </div>
  );
}
