import { NextRequest, NextResponse } from "next/server";
import { mapEventsToMarkets, type PolymarketEvent } from "@/lib/api/polymarket";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200;

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
    const markets = mapEventsToMarkets(events);

    return NextResponse.json({ markets });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch markets", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


