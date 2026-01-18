// Polymarket agent tools
import { MarketCard, MarketCardSchema, PriceDataPoint, PriceDataPointSchema, OrderbookFeatures, OrderbookFeaturesSchema, OrderbookLevel } from "@/lib/agent/schemas";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const CLOB_API_URL = "https://clob.polymarket.com";

// ============================================================================
// GAMMA API TOOLS
// ============================================================================

/**
 * Get available sports leagues, series, and tags from Gamma
 */
export async function tool_listSportsLeagues(): Promise<{
  tags: string[];
  error?: string;
}> {
  try {
    // Fetch active events with sports tags
    const response = await fetch(`${GAMMA_API_URL}/events?active=true&limit=100`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const events = await response.json();
    
    // Extract unique tags
    const tagsSet = new Set<string>();
    for (const event of events || []) {
      if (event.tags && Array.isArray(event.tags)) {
        event.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    }

    return { tags: Array.from(tagsSet).sort() };
  } catch (error) {
    return {
      tags: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Find markets by league/series query
 */
export async function tool_findMarketsByLeague(params: {
  leagueQuery: string;
  limit?: number;
}): Promise<{
  markets: MarketCard[];
  error?: string;
}> {
  const { leagueQuery, limit = 20 } = params;

  try {
    const response = await fetch(
      `${GAMMA_API_URL}/events?active=true&limit=${limit}`,
      {
        headers: { "Accept": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const events = await response.json();
    const queryLower = leagueQuery.toLowerCase();
    
    // Filter events by tag/title match
    const matchedEvents = (events || []).filter((event: any) => {
      const titleMatch = event.title?.toLowerCase().includes(queryLower);
      const tagMatch = event.tags?.some((tag: string) =>
        tag.toLowerCase().includes(queryLower)
      );
      return titleMatch || tagMatch;
    });

    // Convert to market cards
    const markets: MarketCard[] = [];
    for (const event of matchedEvents) {
      if (event.markets && Array.isArray(event.markets)) {
        for (const market of event.markets) {
          try {
            const card = parseMarketCard(market, event);
            markets.push(card);
          } catch (err) {
            // Skip invalid markets
            continue;
          }
        }
      }
    }

    return { markets: markets.slice(0, limit) };
  } catch (error) {
    return {
      markets: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search markets by query with relevance scoring
 */
export async function tool_searchMarkets(params: {
  query: string;
  limit?: number;
}): Promise<{
  markets: MarketCard[];
  error?: string;
}> {
  const { query, limit = 20 } = params;

  try {
    const response = await fetch(
      `${GAMMA_API_URL}/events?active=true&limit=100`,
      {
        headers: { "Accept": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const events = await response.json();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

    // Score markets by relevance
    const scoredMarkets: Array<{ market: MarketCard; score: number }> = [];

    for (const event of events || []) {
      if (event.markets && Array.isArray(event.markets)) {
        for (const market of event.markets) {
          try {
            const card = parseMarketCard(market, event);
            const score = computeRelevanceScore(card, queryTerms);
            if (score > 0) {
              scoredMarkets.push({ market: card, score });
            }
          } catch (err) {
            continue;
          }
        }
      }
    }

    // Sort by score descending
    scoredMarkets.sort((a, b) => b.score - a.score);

    return {
      markets: scoredMarkets.slice(0, limit).map((sm) => sm.market),
    };
  } catch (error) {
    return {
      markets: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get market snapshot from Gamma
 */
export async function tool_getMarketSnapshot(params: {
  marketId: string;
}): Promise<{
  market: MarketCard | null;
  error?: string;
}> {
  const { marketId } = params;

  try {
    // Search all events to find the market
    const response = await fetch(`${GAMMA_API_URL}/events?limit=500`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const events = await response.json();

    for (const event of events || []) {
      if (event.markets && Array.isArray(event.markets)) {
        const market = event.markets.find((m: any) => m.id === marketId);
        if (market) {
          const card = parseMarketCard(market, event);
          return { market: card };
        }
      }
    }

    return { market: null, error: "Market not found" };
  } catch (error) {
    return {
      market: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// CLOB API TOOLS
// ============================================================================

/**
 * Get live prices for YES and NO tokens
 */
export async function tool_getLivePrices(params: {
  yesTokenId?: string;
  noTokenId?: string;
}): Promise<{
  yesPrice: number | null;
  noPrice: number | null;
  error?: string;
}> {
  const { yesTokenId, noTokenId } = params;

  try {
    const [yesResult, noResult] = await Promise.all([
      yesTokenId ? fetchTokenPrice(yesTokenId) : Promise.resolve(null),
      noTokenId ? fetchTokenPrice(noTokenId) : Promise.resolve(null),
    ]);

    let yesPrice = yesResult;
    let noPrice = noResult;

    // Infer missing price
    if (yesPrice !== null && noPrice === null && yesPrice > 0 && yesPrice < 1) {
      noPrice = 1 - yesPrice;
    } else if (noPrice !== null && yesPrice === null && noPrice > 0 && noPrice < 1) {
      yesPrice = 1 - noPrice;
    }

    return { yesPrice, noPrice };
  } catch (error) {
    return {
      yesPrice: null,
      noPrice: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get orderbook with features (spread, depth, imbalance, slippage)
 */
export async function tool_getOrderbook(params: {
  tokenId: string;
}): Promise<{
  orderbook: OrderbookFeatures | null;
  error?: string;
}> {
  const { tokenId } = params;

  try {
    const response = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { orderbook: null, error: "No orderbook exists" };
      }
      throw new Error(`CLOB API error: ${response.status}`);
    }

    const data = await response.json();
    
    const bids: OrderbookLevel[] = [];
    const asks: OrderbookLevel[] = [];

    // Parse bids
    if (data.bids && Array.isArray(data.bids)) {
      for (const bid of data.bids) {
        bids.push({
          price: parseFloat(bid.price || "0"),
          size: parseFloat(bid.size || "0"),
          type: "bid" as const,
        });
      }
    }

    // Parse asks
    if (data.asks && Array.isArray(data.asks)) {
      for (const ask of data.asks) {
        asks.push({
          price: parseFloat(ask.price || "0"),
          size: parseFloat(ask.size || "0"),
          type: "ask" as const,
        });
      }
    }

    // Calculate features
    const bestBid = bids.length > 0 ? bids[0].price : 0;
    const bestAsk = asks.length > 0 ? asks[0].price : 0;
    const spread = bestAsk - bestBid;

    const bidDepth = bids.reduce((sum, b) => sum + b.size, 0);
    const askDepth = asks.reduce((sum, a) => sum + a.size, 0);
    const totalDepth = bidDepth + askDepth;
    const imbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0;

    // Calculate slippage for different sizes
    const slippage = {
      small: calculateSlippage(asks, 100),
      medium: calculateSlippage(asks, 500),
      large: calculateSlippage(asks, 1000),
    };

    const orderbook: OrderbookFeatures = {
      spread,
      depth: { bid: bidDepth, ask: askDepth },
      imbalance,
      slippage,
      levels: [...bids.slice(0, 10), ...asks.slice(0, 10)],
    };

    return { orderbook: OrderbookFeaturesSchema.parse(orderbook) };
  } catch (error) {
    return {
      orderbook: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get price history for a token
 */
export async function tool_getPriceHistory(params: {
  tokenId: string;
  interval?: "1m" | "5m" | "1h" | "1d";
  fidelity?: number;
}): Promise<{
  history: PriceDataPoint[];
  error?: string;
}> {
  const { tokenId, interval = "1h", fidelity = 100 } = params;

  try {
    // CLOB doesn't have a direct history endpoint, so we'll use a placeholder
    // In production, you'd integrate with a historical data provider
    const response = await fetch(
      `${CLOB_API_URL}/price?token_id=${tokenId}&side=BUY`,
      {
        headers: { "Accept": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status}`);
    }

    const data = await response.json();
    const currentPrice = parseFloat(data.price || "0");

    // Generate mock historical data (in production, use real data source)
    const history: PriceDataPoint[] = [];
    const now = Date.now();
    const intervalMs = parseIntervalMs(interval);

    for (let i = fidelity - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs).toISOString();
      // Mock price with random walk
      const variance = 0.02;
      const randomWalk = (Math.random() - 0.5) * variance;
      const price = Math.max(0.01, Math.min(0.99, currentPrice + randomWalk));
      
      history.push(
        PriceDataPointSchema.parse({
          timestamp,
          price,
          volume: Math.random() * 10000,
        })
      );
    }

    return { history };
  } catch (error) {
    return {
      history: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseMarketCard(market: any, event: any): MarketCard {
  let yesTokenId: string | undefined;
  let noTokenId: string | undefined;
  let yesPrice = 0;
  let noPrice = 0;

  // Parse outcomes
  let outcomes: string[] = [];
  let prices: string[] = [];
  let tokenIds: string[] = [];

  if (market.outcomes) {
    if (typeof market.outcomes === "string") {
      outcomes = JSON.parse(market.outcomes);
    } else if (Array.isArray(market.outcomes)) {
      outcomes = market.outcomes;
    }
  }

  if (market.outcomePrices) {
    if (typeof market.outcomePrices === "string") {
      prices = JSON.parse(market.outcomePrices);
    } else if (Array.isArray(market.outcomePrices)) {
      prices = market.outcomePrices;
    }
  }

  if (market.clobTokenIds) {
    if (typeof market.clobTokenIds === "string") {
      tokenIds = JSON.parse(market.clobTokenIds);
    } else if (Array.isArray(market.clobTokenIds)) {
      tokenIds = market.clobTokenIds;
    } else if (typeof market.clobTokenIds === "object") {
      const ids = market.clobTokenIds as { yes?: string; no?: string };
      if (ids.yes) tokenIds.push(ids.yes);
      if (ids.no) tokenIds.push(ids.no);
    }
  }

  // Extract YES/NO
  if (outcomes.length > 0) {
    const yesIdx = outcomes.findIndex((o) =>
      ["yes", "pass"].includes(o.toLowerCase())
    );
    const noIdx = outcomes.findIndex((o) =>
      ["no", "fail"].includes(o.toLowerCase())
    );

    if (yesIdx >= 0) {
      yesPrice = parseFloat(prices[yesIdx] ?? "0") || 0;
      yesTokenId = tokenIds[yesIdx];
    }
    if (noIdx >= 0) {
      noPrice = parseFloat(prices[noIdx] ?? "0") || 0;
      noTokenId = tokenIds[noIdx];
    }
  }

  // Infer missing price
  if (yesPrice > 0 && noPrice === 0 && yesPrice < 1) {
    noPrice = 1 - yesPrice;
  } else if (noPrice > 0 && yesPrice === 0 && noPrice < 1) {
    yesPrice = 1 - noPrice;
  }

  return MarketCardSchema.parse({
    id: market.id,
    question: market.question || event.title,
    yesTokenId,
    noTokenId,
    yesPrice,
    noPrice,
    volume: market.volume || 0,
    liquidity: market.liquidity,
    endDate: market.endDate || event.endDate,
    tags: event.tags || [],
  });
}

async function fetchTokenPrice(tokenId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${CLOB_API_URL}/price?token_id=${tokenId}&side=BUY`,
      {
        headers: { "Accept": "application/json" },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = parseFloat(data.price || "0");
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

function computeRelevanceScore(market: MarketCard, terms: string[]): number {
  let score = 0;
  const questionLower = market.question.toLowerCase();
  const tagsLower = market.tags.map((t) => t.toLowerCase());

  for (const term of terms) {
    if (questionLower.includes(term)) score += 2;
    if (tagsLower.some((tag) => tag.includes(term))) score += 1;
  }

  return score;
}

function calculateSlippage(asks: OrderbookLevel[], size: number): number {
  let remaining = size;
  let totalCost = 0;

  for (const ask of asks) {
    if (remaining <= 0) break;
    const fillSize = Math.min(remaining, ask.size);
    totalCost += fillSize * ask.price;
    remaining -= fillSize;
  }

  if (remaining > 0) return 999; // Not enough liquidity

  const avgPrice = totalCost / size;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  return bestAsk > 0 ? (avgPrice - bestAsk) / bestAsk : 0;
}

function parseIntervalMs(interval: string): number {
  switch (interval) {
    case "1m":
      return 60 * 1000;
    case "5m":
      return 5 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}
