"use client";

import { useMemo, useState } from "react";
import { generatePython, generateR, type CodegenOptions } from "@/lib/codegen";
import { Card } from "./ui";
import { useLang } from "./LanguageProvider";

export default function ExportPanel({ opts }: { opts: CodegenOptions }) {
  const { t } = useLang();
  const [tab, setTab] = useState<"python" | "r">("python");
  const [copied, setCopied] = useState(false);

  const python = useMemo(() => generatePython(opts), [opts]);
  const rCode = useMemo(() => generateR(opts), [opts]);
  const code = tab === "python" ? python : rCode;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  function download() {
    const ext = tab === "python" ? "py" : "R";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ceritabel-analysis.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
          {(["python", "r"] as const).map((x) => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={`rounded-md px-3 py-1 font-medium transition ${
                tab === x ? "bg-accent text-accent-ink" : "text-muted hover:text-foreground"
              }`}
            >
              {x === "python" ? "Python" : "R"}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={copy}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition hover:border-accent"
          >
            {copied ? t("exportCopied") : t("exportCopy")}
          </button>
          <button
            onClick={download}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition hover:bg-accent-strong"
          >
            {t("exportDownload")}
          </button>
        </div>
      </div>

      <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </Card>
  );
}
