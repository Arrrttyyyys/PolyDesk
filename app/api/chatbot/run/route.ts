import { NextRequest, NextResponse } from "next/server";
import { searchEvents, mapEventsToMarkets } from "@/lib/api/polymarket";
import { Market } from "@/types/market";

// Mock data fallback when API is unavailable
const mockMarkets: Record<string, Market[]> = {
  soccer: [
    {
      id: "soccer-1",
      eventId: "event-soccer-1",
      title: "Manchester City to win Premier League 2024",
      yesPrice: 0.75,
      noPrice: 0.25,
      volume: "$2.1M",
      resolution: "2024-05-30",
      probability: 75,
    },
    {
      id: "soccer-2",
      eventId: "event-soccer-2",
      title: "Real Madrid to win Champions League 2024",
      yesPrice: 0.62,
      noPrice: 0.38,
      volume: "$1.8M",
      resolution: "2024-06-01",
      probability: 62,
    },
    {
      id: "soccer-3",
      eventId: "event-soccer-3",
      title: "England to reach Euro 2024 Final",
      yesPrice: 0.45,
      noPrice: 0.55,
      volume: "$1.2M",
      resolution: "2024-07-14",
      probability: 45,
    },
  ],
  elections: [
    {
      id: "election-1",
      eventId: "event-election-1",
      title: "Democrats to win 2024 Presidential Election",
      yesPrice: 0.52,
      noPrice: 0.48,
      volume: "$45M",
      resolution: "2024-11-05",
      probability: 52,
    },
    {
      id: "election-2",
      eventId: "event-election-2",
      title: "Republicans to control Senate after 2024",
      yesPrice: 0.58,
      noPrice: 0.42,
      volume: "$12M",
      resolution: "2024-11-05",
      probability: 58,
    },
  ],
  crypto: [
    {
      id: "crypto-1",
      eventId: "event-crypto-1",
      title: "Bitcoin to reach $100k by end of 2024",
      yesPrice: 0.38,
      noPrice: 0.62,
      volume: "$8.5M",
      resolution: "2024-12-31",
      probability: 38,
    },
    {
      id: "crypto-2",
      eventId: "event-crypto-2",
      title: "Ethereum ETF approved by June 2024",
      yesPrice: 0.72,
      noPrice: 0.28,
      volume: "$3.2M",
      resolution: "2024-06-30",
      probability: 72,
    },
  ],
};

function getMockMarkets(query: string): Market[] {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes("soccer") || lowerQuery.includes("football")) {
    return mockMarkets.soccer;
  }
  if (lowerQuery.includes("election") || lowerQuery.includes("trump") || lowerQuery.includes("biden")) {
    return mockMarkets.elections;
  }
  if (lowerQuery.includes("crypto") || lowerQuery.includes("bitcoin") || lowerQuery.includes("btc") || lowerQuery.includes("eth")) {
    return mockMarkets.crypto;
  }
  
  // Return all markets if no specific category
  return [...mockMarkets.soccer, ...mockMarkets.elections, ...mockMarkets.crypto].slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, action = "search" } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // For now, implement basic market search
    // In full implementation, this would use Gemini API for intent understanding
    // and orchestrate multiple tools (search, news, analytics, etc.)
    
    if (action === "search") {
      console.log(`[CHATBOT] Searching for markets matching: "${query}"`);
      
      let markets: Market[] = [];
      
      try {
        // Try to search for real markets
        const events = await searchEvents({ query, limit: 10 });
        markets = mapEventsToMarkets(events);
      } catch (error) {
        console.log(`[CHATBOT] API unavailable, using mock data`);
        // Fallback to mock data
        markets = getMockMarkets(query);
      }

      if (markets.length === 0) {
        return NextResponse.json({
          response: `I couldn't find any active markets matching "${query}". Try different keywords or check back later as new markets are added regularly.`,
          markets: [],
          action: "search",
        });
      }

      return NextResponse.json({
        response: `I found ${markets.length} market${markets.length > 1 ? "s" : ""} related to "${query}". Here are the top results:`,
        markets: markets.slice(0, 5),
        action: "search",
        metadata: {
          totalFound: markets.length,
          query,
        },
      });
    }

    // Default response for other actions
    return NextResponse.json({
      response: `I'm currently being built out. For now, I can search for Polymarket markets. Try asking me about specific topics like "soccer", "elections", or "crypto".`,
      markets: [],
      action: "info",
    });

  } catch (error) {
    console.error("[CHATBOT] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process request", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
