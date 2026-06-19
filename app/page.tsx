"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import { useLang } from "@/components/LanguageProvider";

export default function Home() {
  const { t } = useLang();
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="glow-accent relative">
        <div className="absolute right-4 top-4 sm:right-6">
          <LanguageToggle />
        </div>
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-10 pt-20 text-center sm:px-6">
          <span className="mb-5 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-strong">
            {t("heroBadge")}
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            cerita<span className="text-accent">bel</span> {t("heroTitleRest")}
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-muted">
            {t("heroDesc")}
          </p>
          <p className="mt-2 text-sm text-muted/80">
            Upload your data, understand it in plain English.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/analyze"
              className="rounded-xl bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent-strong"
            >
              {t("ctaTry")}
            </Link>
            <a
              href="#cara-kerja"
              className="rounded-xl border border-border bg-surface px-6 py-3 font-medium text-foreground transition hover:border-accent"
            >
              {t("ctaHow")}
            </a>
          </div>
        </div>

        {/* Mock dashboard preview */}
        <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
          <HeroPreview />
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Feature icon="🧮" title={t("feat1Title")} body={t("feat1Body")} />
          <Feature icon="📊" title={t("feat2Title")} body={t("feat2Body")} />
          <Feature icon="🤖" title={t("feat3Title")} body={t("feat3Body")} />
        </div>
      </section>

      {/* How it works */}
      <section id="cara-kerja" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-semibold">{t("howTitle")}</h2>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Step n={1} title={t("step1Title")} body={t("step1Body")} />
          <Step n={2} title={t("step2Title")} body={t("step2Body")} />
          <Step n={3} title={t("step3Title")} body={t("step3Body")} />
        </ol>
      </section>

      {/* Capabilities */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-semibold">{t("capTitle")}</h2>
        <div className="flex flex-wrap justify-center gap-2.5">
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
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-foreground/90"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t(k)}
            </span>
          ))}
        </div>
      </section>

      {/* Privacy note */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
          🔒 <span className="text-foreground">{t("privacyLabel")}</span>{" "}
          {t("privacyBody")}
        </div>
      </section>

      <Footer />
    </main>
  );
}

/** A stylised, non-interactive mock of the results dashboard. */
function HeroPreview() {
  const { t } = useLang();
  const bars = [42, 70, 55, 86, 64, 95, 58, 74];
  // diverging heatmap values (-1..1)
  const heat = [1, 0.7, -0.3, 0.7, 1, 0.1, -0.3, 0.1, 1];
  const heatColor = (r: number) =>
    r >= 0
      ? `rgba(124,92,252,${0.15 + Math.abs(r) * 0.7})`
      : `rgba(251,113,133,${0.15 + Math.abs(r) * 0.7})`;

  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-accent/10 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40">
        {/* window bar */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-negative/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-positive/70" />
          <span className="ml-3 rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted">
            cerita<span className="text-accent">bel</span> · {t("previewBadge")}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 text-left md:grid-cols-[1.4fr_1fr]">
          {/* left: stats + chart + heatmap */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: t("ovRows"), v: "1.240" },
                { l: t("ovCols"), v: "8" },
                { l: t("qScore"), v: "92" },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2"
                >
                  <div className="truncate text-[10px] text-muted">{s.l}</div>
                  <div
                    className={`text-lg font-semibold tabular-nums ${i === 0 ? "text-accent" : "text-foreground"}`}
                  >
                    {s.v}
                  </div>
                </div>
              ))}
            </div>

            {/* mini bar chart */}
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 h-1.5 w-16 rounded bg-border" />
              <div className="flex h-24 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-t bg-accent/80"
                  />
                ))}
              </div>
            </div>

            {/* mini heatmap */}
            <div className="grid w-fit grid-cols-3 gap-1">
              {heat.map((r, i) => (
                <div
                  key={i}
                  style={{ background: heatColor(r) }}
                  className="grid h-7 w-7 place-items-center rounded text-[10px] text-foreground/80"
                >
                  {r.toFixed(1)}
                </div>
              ))}
            </div>
          </div>

          {/* right: AI insight card */}
          <div className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/10 to-surface p-3.5">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              🤖 {t("aiInsight")}
            </div>
            <p className="text-xs leading-relaxed text-foreground/85">
              {t("previewInsight")}
            </p>
            <div className="mt-3 space-y-1.5">
              {[80, 95, 70].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  <span
                    style={{ width: `${w}%` }}
                    className="h-2 rounded bg-surface-2"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent/50">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-lg">
        {icon}
      </div>
      <h3 className="mb-1.5 font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent-strong">
        {n}
      </div>
      <h3 className="mb-1 font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
    </li>
  );
}
