import { NextRequest, NextResponse } from "next/server";

const CLOB_API_URL = "https://clob.polymarket.com";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("token_id");
    const interval = searchParams.get("interval") || "1h";
    const fidelity = searchParams.get("fidelity") || "100";

    if (!tokenId) {
      return NextResponse.json(
        { error: "token_id parameter is required" },
        { status: 400 }
      );
    }

    // Validate interval
    const validIntervals = ["1m", "5m", "1h", "1d"];
    if (!validIntervals.includes(interval)) {
      return NextResponse.json(
        { error: `Invalid interval. Must be one of: ${validIntervals.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate fidelity
    const fidelityNum = parseInt(fidelity);
    if (isNaN(fidelityNum) || fidelityNum < 1 || fidelityNum > 1000) {
      return NextResponse.json(
        { error: "Fidelity must be a number between 1 and 1000" },
        { status: 400 }
      );
    }

    console.log(`[HISTORY] Fetching price history: token_id=${tokenId}, interval=${interval}, fidelity=${fidelity}`);

    // Proxy to CLOB API
    const url = `${CLOB_API_URL}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HISTORY] CLOB API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `CLOB API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize response to standard format
    const normalized = {
      tokenId,
      interval,
      fidelity: fidelityNum,
      history: normalizeHistoryData(data),
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("[HISTORY] Error fetching price history:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch price history", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * Normalize CLOB price history response to standard format
 */
function normalizeHistoryData(data: any): Array<{
  timestamp: string;
  price: number;
  volume?: number;
}> {
  // CLOB returns different formats, handle both arrays and objects
  if (Array.isArray(data)) {
    return data.map((point: any) => ({
      timestamp: point.t || point.timestamp || new Date().toISOString(),
      price: parseFloat(point.p || point.price || "0"),
      volume: point.v || point.volume ? parseFloat(point.v || point.volume) : undefined,
    }));
  }

  // Handle object with nested history array
  if (data.history && Array.isArray(data.history)) {
    return data.history.map((point: any) => ({
      timestamp: point.t || point.timestamp || new Date().toISOString(),
      price: parseFloat(point.p || point.price || "0"),
      volume: point.v || point.volume ? parseFloat(point.v || point.volume) : undefined,
    }));
  }

  // If data is in key-value format (timestamp: price)
  if (typeof data === "object" && !Array.isArray(data)) {
    return Object.entries(data).map(([timestamp, priceValue]) => ({
      timestamp,
      price: typeof priceValue === "number" ? priceValue : parseFloat(String(priceValue)),
      volume: undefined,
    }));
  }

  return [];
}
