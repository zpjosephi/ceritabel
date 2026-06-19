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
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-24 text-center sm:px-6">
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
      </section>

      {/* What you get */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Feature title={t("feat1Title")} body={t("feat1Body")} />
          <Feature title={t("feat2Title")} body={t("feat2Body")} />
          <Feature title={t("feat3Title")} body={t("feat3Body")} />
        </div>
      </section>

      {/* How it works */}
      <section
        id="cara-kerja"
        className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6"
      >
        <h2 className="mb-6 text-center text-2xl font-semibold">
          {t("howTitle")}
        </h2>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Step n={1} title={t("step1Title")} body={t("step1Body")} />
          <Step n={2} title={t("step2Title")} body={t("step2Body")} />
          <Step n={3} title={t("step3Title")} body={t("step3Body")} />
        </ol>
      </section>

      {/* Capabilities */}
      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-semibold">
          {t("capTitle")}
        </h2>
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

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
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
