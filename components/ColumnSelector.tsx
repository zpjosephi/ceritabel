"use client";

import type { ColumnKind } from "@/lib/types";
import { Card } from "./ui";
import { useLang } from "./LanguageProvider";

const KIND_DOT: Record<ColumnKind, string> = {
  numeric: "bg-accent",
  categorical: "bg-muted",
  datetime: "bg-sky-400",
  boolean: "bg-positive",
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
    <Card className="!p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs text-muted">
          {t("varsUsed", { used, total: columns.length })}
        </span>
        {excluded.size > 0 ? (
          <button
            onClick={onUseAll}
            className="ml-auto text-xs text-accent-strong hover:underline"
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                off
                  ? "border-border bg-surface text-muted line-through opacity-60 hover:opacity-90"
                  : "border-accent/40 bg-accent/10 text-foreground hover:border-accent"
              }`}
              title={c.kind}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${off ? "bg-border" : KIND_DOT[c.kind]}`}
              />
              {c.name}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
