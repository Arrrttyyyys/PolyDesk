import { NextRequest, NextResponse } from "next/server";
import { mapEventsToMarkets, type PolymarketEvent } from "@/lib/api/polymarket";
import { getMarketPrices } from "@/lib/api/clob";
import { Market } from "@/lib/types";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

/**
 * Batch process with rate limiting to avoid overwhelming CLOB API
 */
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayMs: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // Add delay between batches to avoid rate limiting (except for last batch)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

/**
 * Fetch prices for markets that don't have them (with rate limiting)
 */
async function enrichMarketsWithPrices(markets: Market[]): Promise<Market[]> {
  // Only fetch prices for markets that have yesPrice === 0 (no valid price yet)
  // Once we have a non-zero price, we never check/update it again
  const marketsNeedingPrices = markets.filter(
    (market) =>
      (market.clobTokenIds?.yes || market.clobTokenIds?.no) &&
      market.yesPrice === 0 // Only fetch if YES price is 0 (fallback)
  );

  // Limit to first 50 markets to avoid long waits
  const marketsToFetch = marketsNeedingPrices.slice(0, 50);

  console.log(
    `[PRICE FETCH] Fetching prices for ${marketsToFetch.length} out of ${markets.length} markets (${marketsNeedingPrices.length} needed prices)`
  );

  const enrichedMap = new Map<string, Market>();

  // Process in batches of 10 with 100ms delay between batches
  const enrichedMarkets = await processBatch(
    marketsToFetch,
    async (market) => {
      if (market.clobTokenIds?.yes || market.clobTokenIds?.no) {
        try {
          const prices = await getMarketPrices(
            market.clobTokenIds.yes,
            market.clobTokenIds.no
          );

          // Calculate new prices
          const newYesPrice = prices.yesPrice > 0 ? prices.yesPrice : (prices.noPrice > 0 ? 1 - prices.noPrice : null);
          const newNoPrice = prices.noPrice > 0 ? prices.noPrice : (prices.yesPrice > 0 ? 1 - prices.yesPrice : null);
          
          // Only update if we got valid non-zero prices
          // Preserve existing non-zero prices - never overwrite with 0
          const yesPrice = newYesPrice && newYesPrice > 0 ? newYesPrice : (market.yesPrice > 0 ? market.yesPrice : 0);
          const noPrice = newNoPrice && newNoPrice > 0 ? newNoPrice : (market.noPrice > 0 && market.noPrice !== 0.5 ? market.noPrice : (newNoPrice || 0.5));
          const probability = yesPrice > 0 ? Math.round(yesPrice * 100) : market.probability;

          // Only update if we got a valid YES price (never show 0)
          if (newYesPrice && newYesPrice > 0) {
            enrichedMap.set(market.id, {
              ...market,
              yesPrice,
              noPrice,
              probability,
            });
          } else if (market.yesPrice > 0) {
            // Preserve existing valid price
            enrichedMap.set(market.id, market);
          }
        } catch (error) {
          // Preserve existing market on error if it has valid prices
          if (market.yesPrice > 0) {
            enrichedMap.set(market.id, market);
          }
        }
      } else if (market.yesPrice > 0) {
        // Preserve existing market if it has valid prices
        enrichedMap.set(market.id, market);
      }
      return market;
    },
    10, // batch size
    100 // 100ms delay between batches
  );

  // Merge enriched markets back into full list
  return markets.map((market) => enrichedMap.get(market.id) || market);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = Number(searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200;
  const fetchPrices = searchParams.get("fetchPrices") === "true"; // Default to false to avoid long waits

  try {
    // Try fetching markets directly instead of events - markets endpoint might have clobTokenIds
    const marketsRes = await fetch(
      `${GAMMA_API_URL}/markets?active=true&closed=false&limit=${limit}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    let markets: Market[] = [];

    if (marketsRes.ok) {
      try {
        const marketsData = await marketsRes.json();
        // If markets endpoint returns array of markets directly
        if (Array.isArray(marketsData)) {
          // We need to map these differently - they might already be in Market format or need different mapping
          // For now, fall through to events endpoint as fallback
        } else if (marketsData.markets && Array.isArray(marketsData.markets)) {
          // Markets endpoint returns { markets: [...] }
          // We can process these directly since they're already markets
          console.log("[DEBUG] Using /markets endpoint, sample market:", JSON.stringify(marketsData.markets[0], null, 2).substring(0, 500));
        }
      } catch (e) {
        console.warn("[DEBUG] /markets endpoint parsing failed, falling back to /events:", e);
      }
    }

    // Fallback to events endpoint if markets endpoint didn't work or returned unexpected format
    if (markets.length === 0) {
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
      markets = mapEventsToMarkets(events);
    }

    // Fetch prices from CLOB API if requested and markets are missing prices
    if (fetchPrices) {
      markets = await enrichMarketsWithPrices(markets);
    }

    return NextResponse.json({ markets });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch markets", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}


