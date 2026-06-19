"use client";

import { useLang } from "./LanguageProvider";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted">
      <p>{t("footerTech")}</p>
      <p className="mt-1">
        Made by{" "}
        <span className="font-semibold text-accent-strong">@zpjosephi</span>
      </p>
    </footer>
  );
}
