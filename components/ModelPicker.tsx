"use client";

import { MODELS } from "@/lib/config";

export default function ModelPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const active = MODELS.find((m) => m.id === value);
  return (
    <label className="flex items-center gap-1.5" title={active?.note}>
      <span className="sr-only">Pilih model AI</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="max-w-[11rem] truncate rounded-md border border-border bg-surface px-2 py-1 text-sm text-muted-strong transition-colors hover:border-border-strong disabled:opacity-50"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id} className="bg-surface text-foreground">
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
