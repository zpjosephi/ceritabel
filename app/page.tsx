"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import LanguageToggle from "@/components/LanguageToggle";
import { Mark } from "@/components/ui";
import { useLang } from "@/components/LanguageProvider";

// Copied from the app's own output on the "siswa" sample (OLS, target
// final_score). If the sample data or the regression code changes, rerun the
// sample and update these, the hero promises they are real.
const EXAMPLE_ROWS = [
  { name: "(Intercept)", b: "-10.07", se: "24.06", t: "-0.42", p: "0.6787" },
  { name: "study_hours", b: "0.95", se: "0.37", t: "2.58", p: "0.0149" },
  { name: "attendance_pct", b: "0.57", se: "0.22", t: "2.59", p: "0.0145" },
  { name: "age", b: "1.42", se: "0.95", t: "1.50", p: "0.1447" },
];

export default function Home() {
  const { t } = useLang();

  return (
    <div className="flex flex-1 flex-col">
      <header className="gutter flex h-16 items-center justify-between border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm text-foreground"
        >
          <Mark className="h-4 w-4 text-accent" />
          <span className="text-[17px] font-semibold">ceritabel</span>
        </Link>
        <div className="flex items-center gap-5">
          <LanguageToggle />
          <Link
            href="/analyze"
            className="hidden text-sm font-medium text-muted-strong underline-offset-4 transition-colors hover:text-foreground hover:underline sm:inline"
          >
            {t("ctaOpen")}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="gutter grid gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-28 lg:pt-24">
          <div className="min-w-0 lg:col-span-6">
            <h1 className="font-serif text-[clamp(3rem,7.4vw,6.75rem)] font-semibold leading-[0.98] tracking-[-0.018em] text-balance">
              {t("heroTitle")}
            </h1>
            <p className="measure mt-7 text-pretty text-lg leading-relaxed text-muted-strong">
              {t("heroLede")}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/analyze?sample=siswa"
                className="rounded-md bg-accent px-5 py-3 font-medium text-accent-ink transition-colors hover:bg-accent-strong active:translate-y-px"
              >
                {t("ctaSample")}
              </Link>
              <Link
                href="/analyze"
                className="font-medium text-foreground underline decoration-border-strong underline-offset-[6px] transition-colors hover:decoration-foreground"
              >
                {t("ctaUpload")}
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">{t("heroNote")}</p>
          </div>

          <figure className="min-w-0 self-end lg:col-span-5 lg:col-start-8">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3 text-sm">
              <span className="text-muted-strong">{t("exampleCaption")}</span>
              <span className="text-muted">{t("exampleTarget")}</span>
            </figcaption>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className="py-3 pr-4 text-left font-medium">{t("regTerm")}</th>
                    <th className="py-3 pl-3 text-right font-medium">b</th>
                    <th className="hidden py-3 pl-3 text-right font-medium sm:table-cell">SE</th>
                    <th className="hidden py-3 pl-3 text-right font-medium sm:table-cell">t</th>
                    <th className="py-3 pl-3 text-right font-medium">p</th>
                  </tr>
                </thead>
                <tbody className="font-mono tnum">
                  {EXAMPLE_ROWS.map((r) => {
                    const sig = Number(r.p) < 0.05;
                    return (
                      <tr key={r.name} className="border-t border-border">
                        <td className="py-2.5 pr-4 font-sans text-foreground">
                          {r.name}
                        </td>
                        <td className="py-2.5 pl-3 text-right">{r.b}</td>
                        <td className="hidden py-2.5 pl-3 text-right text-muted sm:table-cell">{r.se}</td>
                        <td className="hidden py-2.5 pl-3 text-right text-muted sm:table-cell">{r.t}</td>
                        <td
                          className={`py-2.5 pl-3 text-right ${sig ? "text-accent-strong" : "text-muted"}`}
                        >
                          {r.p}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <blockquote className="mt-8 border-t border-border pt-6">
              <p className="font-serif text-[1.3rem] leading-relaxed text-foreground text-pretty">
                {t("exampleStory")}
              </p>
              <footer className="mt-3 text-sm text-muted">
                {t("exampleStoryNote")}
              </footer>
            </blockquote>
          </figure>
        </section>

        <section className="gutter grid gap-12 border-t border-border py-20 lg:grid-cols-12 lg:gap-8 lg:py-28">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-[clamp(2rem,3.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.01em]">
              {t("computeTitle")}
            </h2>
            <p className="measure mt-5 text-pretty leading-relaxed text-muted">
              {t("computeBody")}
            </p>
          </div>
          <dl className="grid gap-x-14 gap-y-10 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {(["Desc", "Test", "Model", "Data"] as const).map((k) => (
              <div key={k}>
                <dt className="font-semibold text-foreground">
                  {t(`cmp${k}Title`)}
                </dt>
                <dd className="mt-2 text-pretty leading-relaxed text-muted">
                  {t(`cmp${k}Body`)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="gutter grid gap-8 border-t border-border py-20 lg:grid-cols-12 lg:py-28">
          <h2 className="font-serif text-[clamp(2rem,3.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.01em] lg:col-span-5">
            {t("trustTitle")}
          </h2>
          <div className="measure space-y-5 font-serif text-[1.2rem] leading-relaxed text-muted-strong lg:col-span-6 lg:col-start-7">
            <p className="text-pretty">{t("trustBody")}</p>
            <p className="text-pretty">{t("trustBody2")}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
