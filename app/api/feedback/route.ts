// app/api/feedback/route.ts
// POST { message, email?, page? } -> forwards to a Discord webhook.
// The webhook URL stays server-side (env) so it can't be scraped/abused.

import { NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rl = rateLimit(req);
  if (!rl.ok) {
    const r = rateLimitResponse(rl.retryAfter);
    return NextResponse.json(r.body, r.init);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON yang valid." }, { status: 400 });
  }

  const { message, email, page, category, mood } = (body ?? {}) as {
    message?: string;
    email?: string;
    page?: string;
    category?: string;
    mood?: string;
  };

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Pesan feedback kosong." }, { status: 400 });
  }
  if (message.length > 1500) {
    return NextResponse.json({ error: "Pesan terlalu panjang (maks 1500)." }, { status: 413 });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json(
      { error: "Feedback belum dikonfigurasi di server." },
      { status: 500 },
    );
  }

  const from =
    typeof email === "string" && email.trim() ? email.trim().slice(0, 200) : "anonim";
  const where = typeof page === "string" ? page.slice(0, 200) : "";
  const cat = typeof category === "string" ? category.slice(0, 40) : "";
  const moodStr = typeof mood === "string" ? mood.slice(0, 16) : "";
  const title = `${moodStr ? moodStr + " " : ""}💬 Feedback baru${cat ? ` · ${cat}` : ""}`;

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ceritabel feedback",
        embeds: [
          {
            title: title.slice(0, 250),
            description: message.trim().slice(0, 1500),
            color: 0x7c5cfc,
            fields: [
              { name: "Dari", value: from, inline: true },
              ...(where ? [{ name: "Halaman", value: where, inline: true }] : []),
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Gagal mengirim feedback." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal mengirim feedback." }, { status: 502 });
  }
}
