"use client";

import { LinkedinLogo, Envelope } from "@phosphor-icons/react";
import { useLang } from "./LanguageProvider";
import AccentPicker from "./AccentPicker";

const LINKEDIN_URL = "https://www.linkedin.com/in/joseph-irawan";
const EMAIL = "josephirawan07@gmail.com";

const linkClass =
  "inline-flex items-center gap-1.5 rounded-sm text-muted-strong transition-colors hover:text-foreground";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="gutter mt-auto grid gap-8 border-t border-border py-10 text-sm md:grid-cols-12">
      <div className="md:col-span-6">
        <p className="measure font-serif text-base leading-relaxed text-muted-strong text-pretty">
          {t("footerThesis")}
        </p>
        <p className="mt-4 text-muted">
          {t("footerMadeBy")}{" "}
          <span className="text-foreground">Joseph Irawan</span>, {year}.{" "}
          {t("footerTech")}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 md:col-span-6 md:justify-end">
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <LinkedinLogo size={16} aria-hidden />
          LinkedIn
        </a>
        <a href={`mailto:${EMAIL}`} className={linkClass}>
          <Envelope size={16} aria-hidden />
          Email
        </a>
        {/* the floating button is hidden on small screens, this is its stand-in */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-feedback"))}
          className={`${linkClass} md:hidden`}
        >
          {t("fbButton")}
        </button>
        <div className="flex items-center gap-2 text-muted">
          <span>{t("accentLabel")}</span>
          <AccentPicker label={t("accentLabel")} />
        </div>
      </div>
    </footer>
  );
}
