// TEMPORARY preview page — compare candidate accent colors in context.
// Delete this route once an accent is chosen.

type Swatch = {
  id: string;
  name: string;
  vibe: string;
  accent: string;
  strong: string;
  soft: string;
  note?: string;
};

const CANDIDATES: Swatch[] = [
  {
    id: "amber",
    name: "Amber / emas hangat",
    vibe: "editorial · premium · hangat",
    accent: "#e0a44a",
    strong: "#f2bd6b",
    soft: "rgba(224,164,74,0.12)",
    note: "Aman — tidak bentrok hijau/merah",
  },
  {
    id: "teal",
    name: "Teal / cyan dingin",
    vibe: "clean · teknikal · modern",
    accent: "#22c0ad",
    strong: "#4dd6c4",
    soft: "rgba(34,192,173,0.12)",
    note: "Dekat hijau positive",
  },
  {
    id: "coral",
    name: "Coral / oranye-merah",
    vibe: "bold · ekspresif · panas",
    accent: "#f2603f",
    strong: "#ff7d5e",
    soft: "rgba(242,96,63,0.12)",
    note: "Dekat rose negative",
  },
  {
    id: "lime",
    name: "Lime / chartreuse",
    vibe: "energik · techy · berani",
    accent: "#b5e048",
    strong: "#c9ee6e",
    soft: "rgba(181,224,72,0.12)",
    note: "Sinyal data, sedikit neon",
  },
];

const BARS = [42, 70, 55, 86, 64, 95, 58, 74];

export default function PreviewColors() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Pilih aksen <span className="text-muted">ceritabel</span>
        </h1>
        <p className="mt-3 text-muted">
          Empat kandidat di canvas gelap yang sama. Lihat mana yang paling
          &ldquo;kamu&rdquo;.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {CANDIDATES.map((c) => (
          <article
            key={c.id}
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-md)]"
            style={{ borderColor: `${c.accent}33` }}
          >
            {/* big swatch band */}
            <div
              className="relative h-28"
              style={{
                background: `linear-gradient(135deg, ${c.accent}, ${c.strong})`,
              }}
            >
              <span className="absolute bottom-3 left-4 font-mono text-sm font-medium text-black/70">
                {c.accent}
              </span>
              <span className="absolute right-4 top-3 rounded-md bg-black/25 px-2 py-0.5 font-mono text-xs text-white/90">
                {c.id}
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {c.name}
                </h2>
                <p className="text-sm text-muted">{c.vibe}</p>
              </div>

              {/* headline sample with accent word */}
              <p className="text-xl font-semibold tracking-tight">
                cerita
                <span style={{ color: c.accent }}>bel</span>{" "}
                <span className="text-muted">menjelaskan datamu</span>
              </p>

              {/* mini bar chart */}
              <div className="flex h-20 items-end gap-1.5 rounded-lg border border-border bg-surface-2 p-3">
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      height: `${h}%`,
                      background: c.accent,
                      opacity: 0.55 + (i / BARS.length) * 0.45,
                    }}
                    className="flex-1 rounded-t"
                  />
                ))}
              </div>

              {/* controls row */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  className="rounded-xl px-4 py-2 text-sm font-medium text-black transition active:scale-[0.98]"
                  style={{
                    background: c.accent,
                    boxShadow: `0 8px 24px -8px ${c.accent}`,
                  }}
                >
                  Jalankan analisis
                </button>
                <button
                  className="rounded-xl border px-4 py-2 text-sm font-medium transition active:scale-[0.98]"
                  style={{ borderColor: `${c.accent}55`, color: c.strong }}
                >
                  Pelajari
                </button>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: c.soft,
                    borderColor: `${c.accent}40`,
                    color: c.strong,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: c.accent }}
                  />
                  AI INSIGHT
                </span>
              </div>

              {/* stat + correlation cell sample */}
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-lg border border-border bg-surface-2 px-4 py-3">
                  <div className="text-xs text-muted">Korelasi tertinggi</div>
                  <div
                    className="tnum mt-1 text-2xl font-semibold tracking-tight"
                    style={{ color: c.strong }}
                  >
                    0.87
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[0.9, 0.4, -0.3, 0.4, 0.9, 0.1, -0.3, 0.1, 0.9].map(
                    (r, i) => (
                      <div
                        key={i}
                        className="grid h-7 w-7 place-items-center rounded text-[10px]"
                        style={{
                          background:
                            r >= 0
                              ? `${c.accent}${Math.round(
                                  (0.15 + Math.abs(r) * 0.7) * 255,
                                )
                                  .toString(16)
                                  .padStart(2, "0")}`
                              : "rgba(251,113,133,0.45)",
                          color: "#0a0a0f",
                        }}
                      >
                        {r.toFixed(1)}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {c.note ? (
                <p className="text-xs text-muted/80">ⓘ {c.note}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted">
        Udah nemu? Bilang aja nomornya / namanya — gw terapin ke seluruh app.
      </p>
    </main>
  );
}
