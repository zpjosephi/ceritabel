"use client";

import { useCallback, useRef, useState } from "react";
import { useLang } from "./LanguageProvider";

export interface SampleDataset {
  file: string; // public path
  name: string; // download/display name
  labelKey: string;
  descKey: string;
}

interface FileUploadProps {
  onFile: (file: File) => void;
  /** Optional: bundled sample datasets the user can load with one click. */
  samples?: SampleDataset[];
  onSample?: (s: SampleDataset) => void;
  disabled?: boolean;
}

export default function FileUpload({
  onFile,
  samples,
  onSample,
  disabled = false,
}: FileUploadProps) {
  const { t } = useLang();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      setLocalError(null);
      if (!file) return;
      const lower = file.name.toLowerCase();
      const ok =
        lower.endsWith(".csv") ||
        lower.endsWith(".xlsx") ||
        lower.endsWith(".xls") ||
        lower.endsWith(".xlsm");
      if (!ok) {
        setLocalError(t("errFile"));
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setLocalError(t("errSize"));
        return;
      }
      onFile(file);
    },
    [onFile, t],
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Unggah file CSV dengan klik atau seret ke sini"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer items-start gap-4 rounded-lg border border-dashed px-6 py-10 transition-colors sm:px-8 sm:py-12 ${
          dragging
            ? "border-accent bg-accent/[0.06]"
            : "border-border-strong bg-surface hover:border-muted hover:bg-surface-2"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.xlsm,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
        />
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mt-0.5 shrink-0 text-muted-strong"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
          />
        </svg>
        <div>
          <p className="text-lg font-medium text-foreground">
            {t("dropTitle")}
          </p>
          <p className="mt-1 text-muted">{t("dropOr")}</p>
          <p className="mt-4 text-sm text-muted">{t("dropPrivacy")}</p>
        </div>
      </div>

      {localError ? (
        <p className="mt-3 text-sm text-negative">{localError}</p>
      ) : null}

      {samples && samples.length > 0 && onSample ? (
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            {t("sampleTitle")}
          </h2>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {samples.map((s) => (
              <li key={s.file}>
                <button
                  type="button"
                  onClick={() => onSample(s)}
                  disabled={disabled}
                  className="group grid w-full gap-x-6 gap-y-1 py-3.5 text-left transition-colors hover:bg-surface disabled:opacity-50 sm:grid-cols-[14rem_1fr_auto] sm:items-baseline sm:px-2"
                >
                  <span className="font-medium text-foreground">{t(s.labelKey)}</span>
                  <span className="text-sm text-muted">{t(s.descKey)}</span>
                  <span className="hidden font-mono text-xs text-muted transition-colors group-hover:text-foreground sm:inline">
                    {s.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
