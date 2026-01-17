import { NextRequest, NextResponse } from "next/server";
import { mapEventsToMarkets, type PolymarketEvent } from "@/lib/api/polymarket";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitParam = Number(searchParams.get("limit") ?? "250");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 250;

  if (!q) {
    return NextResponse.json({ markets: [] });
  }

  try {
    // Gamma doesn't reliably support server-side query search parameters,
    // so we pull a batch and filter server-side.
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
    const qLower = q.toLowerCase();

    const filteredEvents = events.filter((e: any) => {
      const hay = `${e.title ?? ""} ${e.description ?? ""} ${e.slug ?? ""} ${e.ticker ?? ""}`.toLowerCase();
      return hay.includes(qLower);
    });

    // Flatten into markets, then filter markets again by question/title.
    const markets = mapEventsToMarkets(filteredEvents).filter((m) =>
      m.title.toLowerCase().includes(qLower)
    );

    // Cap results for UI dropdown
    return NextResponse.json({ markets: markets.slice(0, 25) });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to search markets", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


