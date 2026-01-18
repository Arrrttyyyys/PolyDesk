import { NextRequest, NextResponse } from "next/server";
import { mapEventsToMarkets, type PolymarketEvent } from "@/lib/api/polymarket";
import { getMarketPrices } from "@/lib/api/clob";
import { Market } from "@/lib/types";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

/**
 * Fetch prices for markets that don't have them
 */
async function enrichMarketsWithPrices(markets: Market[]): Promise<Market[]> {
  const enrichedMarkets = await Promise.all(
    markets.map(async (market) => {
      // Only fetch prices if YES price is 0 (fallback indicator)
      // Once we have a non-zero price, we never check/update it again
      if ((market.clobTokenIds?.yes || market.clobTokenIds?.no) && market.yesPrice === 0) {
        try {
          const prices = await getMarketPrices(
            market.clobTokenIds.yes,
            market.clobTokenIds.no
          );

          // Only update if we got valid prices
          if (prices.yesPrice > 0 || prices.noPrice > 0) {
            const yesPrice = prices.yesPrice || (prices.noPrice > 0 ? 1 - prices.noPrice : 0);
            const noPrice = prices.noPrice || (prices.yesPrice > 0 ? 1 - prices.yesPrice : 0.5);
            const probability = yesPrice > 0 ? Math.round(yesPrice * 100) : 50;

            return {
              ...market,
              yesPrice,
              noPrice,
              probability,
            };
          } else {
            // Log if we have token IDs but couldn't get prices
            console.warn(`Could not fetch prices for market ${market.id} with tokens:`, {
              yes: market.clobTokenIds.yes,
              no: market.clobTokenIds.no,
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch prices for market ${market.id}:`, error);
        }
      }

      return market;
    })
  );

  return enrichedMarkets;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

  if (!q) {
    return NextResponse.json({ markets: [] });
  }

  try {
    // Fetch a smaller batch for faster response
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
    const qWords = qLower.split(/\s+/).filter(w => w.length > 0);

    // Score and rank markets by relevance
    const allMarkets = mapEventsToMarkets(events);
    
    const scoredMarkets = allMarkets
      .map((market) => {
        const titleLower = market.title.toLowerCase();
        let score = 0;
        
        // Exact phrase match gets highest score
        if (titleLower.includes(qLower)) {
          score += 100;
        }
        
        // Word matches
        const matchedWords = qWords.filter(word => titleLower.includes(word)).length;
        score += matchedWords * 20;
        
        // Bonus for matches at the start of the title
        if (titleLower.startsWith(qLower)) {
          score += 50;
        }
        
        // Bonus for higher volume (more popular markets)
        const volumeNum = parseFloat(market.volume.replace(/[^0-9.]/g, '')) || 0;
        score += Math.log10(volumeNum + 1) * 5;
        
        return { market, score };
      })
      .filter(({ market }) => {
        // Only include markets that match at least one word
        const titleLower = market.title.toLowerCase();
        return qWords.some(word => titleLower.includes(word));
      })
      .sort((a, b) => b.score - a.score) // Sort by relevance score
      .map(({ market }) => market);

    // Fetch prices for markets that don't have them
    const topMarkets = scoredMarkets.slice(0, 15);
    const enrichedMarkets = await enrichMarketsWithPrices(topMarkets);

    // Return top 15 results for dropdown
    return NextResponse.json({ markets: enrichedMarkets });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to search markets", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


