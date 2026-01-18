import { NextRequest, NextResponse } from "next/server";
import { type PolymarketEvent } from "@/lib/api/polymarket";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

const normalizeTag = (tag: unknown) => {
  if (typeof tag === "string") return tag;
  if (tag && typeof tag === "object") {
    const candidate =
      (tag as { label?: string; slug?: string }).label ??
      (tag as { slug?: string }).slug;
    return candidate || "";
  }
  return "";
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const limitParam = Number(searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 500;

  if (!q) {
    return NextResponse.json({ events: [] });
  }

  try {
    const res = await fetch(
      `${GAMMA_API_URL}/events?active=true&closed=false&limit=${limit}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const details = await res.text();
      return NextResponse.json(
        { error: `Gamma API error: ${res.status}`, details },
        { status: res.status }
      );
    }

    const events = (await res.json()) as PolymarketEvent[];

    const scored = events
      .map((event) => {
        const title = (event.title ?? "").toLowerCase();
        const description = (event.description ?? "").toLowerCase();
        const slug = (event.slug ?? "").toLowerCase();
        const tags = (event.tags || [])
          .map((tag) => normalizeTag(tag).toLowerCase())
          .filter(Boolean);
        const marketQuestions = (event.markets || [])
          .map((market) => (market.question ?? "").toLowerCase())
          .filter(Boolean);

        let score = 0;
        if (title.includes(q)) score += 6;
        if (description.includes(q)) score += 3;
        if (slug.includes(q)) score += 2;
        if (tags.some((tag) => tag.includes(q))) score += 2;
        if (marketQuestions.some((question) => question.includes(q))) score += 1;

        return { event, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ events: scored.map((item) => item.event) });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to search events", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

