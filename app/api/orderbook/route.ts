import { NextRequest, NextResponse } from "next/server";

const CLOB_API_URL = "https://clob.polymarket.com";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("token_id");

    if (!tokenId) {
      return NextResponse.json(
        { error: "token_id parameter is required" },
        { status: 400 }
      );
    }

    console.log(`[ORDERBOOK] Fetching orderbook for token_id=${tokenId}`);

    // Proxy to CLOB API
    const url = `${CLOB_API_URL}/book?token_id=${tokenId}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[ORDERBOOK] No orderbook found for token_id=${tokenId}`);
        return NextResponse.json(
          { error: "No orderbook exists for this token", tokenId },
          { status: 404 }
        );
      }

      const errorText = await response.text();
      console.error(`[ORDERBOOK] CLOB API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `CLOB API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Parse and compute orderbook features
    const features = computeOrderbookFeatures(data);

    return NextResponse.json({
      tokenId,
      timestamp: new Date().toISOString(),
      ...features,
    });
  } catch (error) {
    console.error("[ORDERBOOK] Error fetching orderbook:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch orderbook", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * Parse orderbook data and compute features
 */
function computeOrderbookFeatures(data: any) {
  const bids: Array<{ price: number; size: number }> = [];
  const asks: Array<{ price: number; size: number }> = [];

  // Parse bids
  if (data.bids && Array.isArray(data.bids)) {
    for (const bid of data.bids) {
      bids.push({
        price: parseFloat(bid.price || "0"),
        size: parseFloat(bid.size || "0"),
      });
    }
  }

  // Parse asks
  if (data.asks && Array.isArray(data.asks)) {
    for (const ask of data.asks) {
      asks.push({
        price: parseFloat(ask.price || "0"),
        size: parseFloat(ask.size || "0"),
      });
    }
  }

  // Sort bids descending (highest first), asks ascending (lowest first)
  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  // Calculate features
  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const spreadPercent = bestAsk > 0 ? (spread / bestAsk) * 100 : 0;

  // Calculate depth
  const bidDepth = bids.reduce((sum, b) => sum + b.size, 0);
  const askDepth = asks.reduce((sum, a) => sum + a.size, 0);
  const totalDepth = bidDepth + askDepth;

  // Calculate imbalance (-1 to 1, positive = more bids)
  const imbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0;

  // Calculate slippage for different order sizes
  const slippage = {
    small: calculateSlippage(asks, 100),
    medium: calculateSlippage(asks, 500),
    large: calculateSlippage(asks, 1000),
  };

  // Get top levels for display
  const topBids = bids.slice(0, 10).map(b => ({
    price: b.price,
    size: b.size,
    type: "bid" as const,
  }));

  const topAsks = asks.slice(0, 10).map(a => ({
    price: a.price,
    size: a.size,
    type: "ask" as const,
  }));

  return {
    spread,
    spreadPercent: parseFloat(spreadPercent.toFixed(4)),
    depth: {
      bid: bidDepth,
      ask: askDepth,
      total: totalDepth,
    },
    imbalance: parseFloat(imbalance.toFixed(4)),
    slippage: {
      small: parseFloat(slippage.small.toFixed(4)),
      medium: parseFloat(slippage.medium.toFixed(4)),
      large: parseFloat(slippage.large.toFixed(4)),
    },
    bestBid,
    bestAsk,
    midPrice: bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0,
    levels: {
      bids: topBids,
      asks: topAsks,
    },
    interpretation: interpretOrderbook({
      spread,
      spreadPercent,
      imbalance,
      totalDepth,
      slippage,
    }),
  };
}

/**
 * Calculate slippage for a given order size
 */
function calculateSlippage(
  asks: Array<{ price: number; size: number }>,
  orderSize: number
): number {
  if (asks.length === 0) return 999; // No liquidity

  let remaining = orderSize;
  let totalCost = 0;

  for (const ask of asks) {
    if (remaining <= 0) break;
    const fillSize = Math.min(remaining, ask.size);
    totalCost += fillSize * ask.price;
    remaining -= fillSize;
  }

  if (remaining > 0) return 999; // Not enough liquidity

  const avgPrice = totalCost / orderSize;
  const bestAsk = asks[0].price;
  
  return bestAsk > 0 ? (avgPrice - bestAsk) / bestAsk : 0;
}

/**
 * Generate human-readable interpretation of orderbook
 */
function interpretOrderbook(features: {
  spread: number;
  spreadPercent: number;
  imbalance: number;
  totalDepth: number;
  slippage: { small: number; medium: number; large: number };
}): string {
  const interpretations: string[] = [];

  // Spread analysis
  if (features.spreadPercent < 0.5) {
    interpretations.push("Very tight spread indicates high liquidity");
  } else if (features.spreadPercent < 2) {
    interpretations.push("Tight spread indicates good liquidity");
  } else if (features.spreadPercent < 5) {
    interpretations.push("Moderate spread");
  } else {
    interpretations.push("Wide spread suggests low liquidity or high uncertainty");
  }

  // Imbalance analysis
  if (features.imbalance > 0.3) {
    interpretations.push("Strong bid pressure (bullish sentiment)");
  } else if (features.imbalance < -0.3) {
    interpretations.push("Strong ask pressure (bearish sentiment)");
  } else {
    interpretations.push("Balanced orderbook");
  }

  // Depth analysis
  if (features.totalDepth > 1000) {
    interpretations.push("Deep orderbook with strong liquidity");
  } else if (features.totalDepth > 100) {
    interpretations.push("Adequate liquidity");
  } else {
    interpretations.push("Shallow orderbook, low liquidity");
  }

  // Slippage analysis
  if (features.slippage.medium > 0.05) {
    interpretations.push("High slippage for medium orders");
  } else if (features.slippage.large > 0.05) {
    interpretations.push("High slippage for large orders");
  }

  return interpretations.join(". ") + ".";
}
