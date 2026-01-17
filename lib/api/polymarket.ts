// Polymarket Gamma API client

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  markets?: PolymarketMarket[];
  active?: boolean;
  closed?: boolean;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  // Gamma returns either:
  // - outcomes: string[] and outcomePrices: string[] and clobTokenIds: string[]
  // - OR outcomes: { outcome, price, clobTokenId }[] (legacy/alternate)
  outcomes?: string[] | { outcome: string; price: string; clobTokenId?: string }[];
  outcomePrices?: string[];
  clobTokenIds?: string[] | { yes?: string; no?: string };
  liquidity?: string | number;
  volume?: string | number;
  endDate?: string;
}

export interface SearchEventsParams {
  query?: string;
  active?: boolean;
  closed?: boolean;
  limit?: number;
  tags?: string[];
}

/**
 * Search for events on Polymarket
 */
export async function searchEvents(
  params: SearchEventsParams = {}
): Promise<PolymarketEvent[]> {
  const {
    query,
    active = true,
    closed = false,
    limit = 20,
    tags,
  } = params;

  const searchParams = new URLSearchParams();
  if (active !== undefined) searchParams.append("active", String(active));
  if (closed !== undefined) searchParams.append("closed", String(closed));
  if (limit) searchParams.append("limit", String(limit));
  if (tags && tags.length > 0) {
    tags.forEach((tag) => searchParams.append("tags", tag));
  }

  const url = `${GAMMA_API_URL}/events?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const data = await response.json();
    let events: PolymarketEvent[] = data || [];

    // Client-side filtering if query is provided
    if (query && query.trim()) {
      const queryLower = query.toLowerCase();
      events = events.filter(
        (event) =>
          event.title?.toLowerCase().includes(queryLower) ||
          event.description?.toLowerCase().includes(queryLower) ||
          event.slug?.toLowerCase().includes(queryLower) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(queryLower))
      );
    }

    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

/**
 * Get a specific event by slug
 */
export async function getEventBySlug(slug: string): Promise<PolymarketEvent | null> {
  try {
    const events = await searchEvents({ limit: 100 });
    return events.find((event) => event.slug === slug) || null;
  } catch (error) {
    console.error("Error fetching event by slug:", error);
    return null;
  }
}

/**
 * Map Polymarket events to Market objects
 * IMPORTANT: One event can have multiple markets, so we flatten the structure
 */
import { Market } from "@/lib/types";

export function mapEventsToMarkets(events: PolymarketEvent[]): Market[] {
  const markets: Market[] = [];

  const formatUsd = (n: number) => {
    if (!Number.isFinite(n)) return "0";
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${Math.round(n).toString()}`;
  };

  for (const event of events) {
    if (!event.markets || event.markets.length === 0) continue;

    for (const market of event.markets) {
      // Extract YES/NO prices from outcomes
      let yesPrice = 0;
      let noPrice = 0;
      let yesTokenId: string | undefined;
      let noTokenId: string | undefined;

      if (market.outcomes) {
        // Primary Gamma format: outcomes: string[]
        if (Array.isArray(market.outcomes) && typeof market.outcomes[0] === "string") {
          const outcomes = market.outcomes as string[];
          const prices = Array.isArray(market.outcomePrices) ? market.outcomePrices : [];
          const tokenIds = Array.isArray(market.clobTokenIds) ? (market.clobTokenIds as string[]) : [];

          const yesIdx = outcomes.findIndex((o) => ["yes", "pass"].includes(o.toLowerCase()));
          const noIdx = outcomes.findIndex((o) => ["no", "fail"].includes(o.toLowerCase()));

          if (yesIdx >= 0) {
            yesPrice = parseFloat(prices[yesIdx] ?? "") || 0;
            yesTokenId = tokenIds[yesIdx];
          }
          if (noIdx >= 0) {
            noPrice = parseFloat(prices[noIdx] ?? "") || 0;
            noTokenId = tokenIds[noIdx];
          }
        } else {
          // Alternate format: outcomes: { outcome, price, clobTokenId }[]
          for (const outcome of market.outcomes as { outcome: string; price: string; clobTokenId?: string }[]) {
            const name = outcome.outcome?.toLowerCase?.() ?? "";
            if (name === "yes" || name === "pass") {
              yesPrice = parseFloat(outcome.price) || 0;
              yesTokenId = outcome.clobTokenId;
            } else if (name === "no" || name === "fail") {
              noPrice = parseFloat(outcome.price) || 0;
              noTokenId = outcome.clobTokenId;
            }
          }
        }
      }

      // Fallback to clobTokenIds if outcomes don't have prices
      if (yesPrice === 0 && noPrice === 0 && market.clobTokenIds && !Array.isArray(market.clobTokenIds)) {
        const ids = market.clobTokenIds as { yes?: string; no?: string };
        yesTokenId = ids.yes;
        noTokenId = ids.no;
        // Prices will need to be fetched from CLOB API
      }

      // Calculate probability from YES price (or default to 50% if no price)
      const probability = yesPrice > 0 ? Math.round(yesPrice * 100) : 50;
      const inferredNo = noPrice === 0 && yesPrice > 0 && yesPrice < 1 ? 1 - yesPrice : noPrice;

      markets.push({
        id: market.id, // Market ID, NOT event ID
        eventId: event.id, // Parent event ID
        title: market.question || event.title,
        yesPrice,
        noPrice: inferredNo || (yesPrice > 0 ? 1 - yesPrice : 0.5),
        volume:
          typeof market.volume === "number"
            ? formatUsd(market.volume)
            : typeof market.volume === "string" && market.volume.trim() !== ""
              ? formatUsd(Number(market.volume))
              : "0",
        resolution: market.endDate || (event as any).endDate || "",
        probability,
        clobTokenIds: {
          yes:
            yesTokenId ||
            (!Array.isArray(market.clobTokenIds) ? (market.clobTokenIds as any)?.yes : undefined),
          no:
            noTokenId ||
            (!Array.isArray(market.clobTokenIds) ? (market.clobTokenIds as any)?.no : undefined),
        },
      });
    }
  }

  return markets;
}
