"use client";

import { useCallback, useRef, useState } from "react";
import { useLang } from "./LanguageProvider";

interface FileUploadProps {
  onFile: (file: File) => void;
  /** Optional: load a bundled sample dataset instead of uploading. */
  onSample?: () => void;
  disabled?: boolean;
}

export default function FileUpload({
  onFile,
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
          dragging
            ? "border-accent bg-accent/10"
            : "border-border bg-surface hover:border-accent/60 hover:bg-surface-2"
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
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-3 text-accent"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
          />
        </svg>
        <p className="text-base font-medium text-foreground">
          {t("dropTitle")}
        </p>
        <p className="mt-1 text-sm text-muted">{t("dropOr")}</p>
        <p className="mt-3 text-xs text-muted/70">{t("dropPrivacy")}</p>
      </div>

      {localError ? (
        <p className="mt-3 text-sm text-negative">{localError}</p>
      ) : null}

      {onSample ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onSample}
            disabled={disabled}
            className="text-sm text-accent-strong underline-offset-4 hover:underline disabled:opacity-50"
          >
            {t("sampleLink")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
