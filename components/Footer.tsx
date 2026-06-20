"use client";

import { GithubLogo, Envelope } from "@phosphor-icons/react";
import { useLang } from "./LanguageProvider";

const REPO_URL = "https://github.com/zpjosephi/ceritabel";
const PROFILE_URL = "https://github.com/zpjosephi";
const EMAIL = "josephirawan07@gmail.com";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
        {/* Thesis — the idea is the selling point, so it leads. */}
        <p className="mx-auto max-w-md text-pretty text-sm leading-relaxed text-muted">
          {t("footerThesis")}
        </p>

        {/* Portfolio bridge: source + contact */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-muted-strong transition hover:text-accent-strong"
          >
            <GithubLogo size={16} weight="bold" aria-hidden />
            {t("footerSource")}
          </a>
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex items-center gap-1.5 text-muted-strong transition hover:text-accent-strong"
          >
            <Envelope size={16} weight="bold" aria-hidden />
            Email
          </a>
        </div>

        {/* Colophon + credit */}
        <p className="mt-6 text-xs text-muted">{t("footerTech")}</p>
        <p className="mt-1 text-xs text-muted">
          {t("footerMadeBy")}{" "}
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-strong transition hover:text-accent"
          >
            Joseph Irawan
          </a>{" "}
          · © {year}
        </p>
      </div>
    </footer>
  );
}
