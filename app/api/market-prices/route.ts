import { NextRequest, NextResponse } from "next/server";
import { getMarketPrices } from "@/lib/api/clob";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { yesTokenId, noTokenId } = body;

    if (!yesTokenId && !noTokenId) {
      return NextResponse.json(
        { error: "At least one token ID is required" },
        { status: 400 }
      );
    }

    const prices = await getMarketPrices(yesTokenId, noTokenId);

    return NextResponse.json(prices);
  } catch (error) {
    console.error("Error fetching market prices:", error);
    return NextResponse.json(
      { error: "Failed to fetch market prices", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

