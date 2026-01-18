import { NextRequest, NextResponse } from "next/server";

const CLOB_API_URL = "https://clob.polymarket.com";

type BookLevel = { price: number; size: number; cumulative: number };

const normalizeSide = (side: unknown): [number, number][] => {
  if (Array.isArray(side)) {
    return side
      .filter((entry): entry is [unknown, unknown] => Array.isArray(entry) && entry.length >= 2)
      .map(([price, size]): [number, number] => [Number(price), Number(size)])
      .filter(([price, size]) => Number.isFinite(price) && Number.isFinite(size));
  }

  if (side && typeof side === "object") {
    return Object.entries(side)
      .map(([price, size]): [number, number] => [Number(price), Number(size)])
      .filter(([price, size]) => Number.isFinite(price) && Number.isFinite(size));
  }

  return [];
};

export async function GET(request: NextRequest) {
  const tokenId = request.nextUrl.searchParams.get("tokenId");
  if (!tokenId) {
    return NextResponse.json({ error: "tokenId required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Book fetch failed" }, { status: response.status });
    }

    const data = await response.json();
    const bidsRaw = normalizeSide(data?.bids)
      .sort((a, b) => b[0] - a[0])
      .slice(0, 10);
    const asksRaw = normalizeSide(data?.asks)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 10);

    let bidCumulative = 0;
    const bids: BookLevel[] = bidsRaw.map(([price, size]) => {
      bidCumulative += size;
      return { price, size, cumulative: bidCumulative };
    });

    let askCumulative = 0;
    const asks: BookLevel[] = asksRaw.map(([price, size]) => {
      askCumulative += size;
      return { price, size, cumulative: askCumulative };
    });

    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    const mid =
      Number.isFinite(bestBid) && Number.isFinite(bestAsk)
        ? (bestBid + bestAsk) / 2
        : Number.isFinite(bestBid)
          ? bestBid
          : Number.isFinite(bestAsk)
            ? bestAsk
            : 0;

    return NextResponse.json({ bids, asks, mid });
  } catch (error) {
    console.error("Book fetch failed:", error);
    return NextResponse.json({ error: "Book fetch failed" }, { status: 500 });
  }
}
