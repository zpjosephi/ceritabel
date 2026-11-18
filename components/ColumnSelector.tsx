"use client";

import type { ColumnKind } from "@/lib/types";
import { useLang } from "./LanguageProvider";

const KIND_DOT: Record<ColumnKind, string> = {
  numeric: "bg-data",
  categorical: "bg-muted",
  datetime: "ring-1 ring-inset ring-data",
  boolean: "ring-1 ring-inset ring-muted",
};

export default function ColumnSelector({
  columns,
  excluded,
  onToggle,
  onUseAll,
}: {
  columns: { name: string; kind: ColumnKind }[];
  excluded: Set<string>;
  onToggle: (name: string) => void;
  onUseAll: () => void;
}) {
  const { t } = useLang();
  const used = columns.length - excluded.size;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-muted">
          {t("varsUsed", { used, total: columns.length })}
        </span>
        {excluded.size > 0 ? (
          <button
            onClick={onUseAll}
            className="ml-auto rounded-sm text-sm text-muted-strong underline underline-offset-4 hover:text-foreground"
          >
            {t("varsUseAll")}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {columns.map((c) => {
          const off = excluded.has(c.name);
          return (
            <button
              key={c.name}
              onClick={() => onToggle(c.name)}
              aria-pressed={!off}
              className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[0.8rem] transition-colors ${
                off
                  ? "border-border text-muted line-through hover:border-border-strong hover:text-muted-strong"
                  : "border-border-strong bg-surface-2 text-foreground hover:border-muted"
              }`}
              title={c.kind}
            >
              <span
                className={`h-2 w-2 rounded-full ${off ? "bg-border" : KIND_DOT[c.kind]}`}
              />
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
