export type Domain = "markets" | "news" | "sports";

export interface Market {
  id: string; // Market ID (from event.markets[].id), NOT event.id
  eventId: string; // Parent event ID
  title: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  resolution: string;
  probability: number;
  clobTokenIds?: {
    yes?: string;
    no?: string;
  };
}

export interface Article {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  relevance: "High" | "Medium" | "Low";
  compressed?: boolean;
}

export interface Thesis {
  summary: string;
  evidence: string[];
  counterpoints: string[];
  catalysts: {
    bullish: string[];
    bearish: string[];
  };
  recommendation: "BUY YES" | "BUY NO" | "WAIT";
  confidence: number;
  riskLevel: "Low" | "Medium" | "High";
}

export interface PortfolioLeg {
  id: string;
  marketId: string;
  marketTitle: string;
  side: "buy" | "sell";
  outcome: "yes" | "no";
  size: number;
  entryPrice: number;
  currentMid: number;
}

export interface OrderbookLevel {
  price: number;
  size: number;
  cumulative: number;
  type: "bid" | "ask";
}

export interface PriceHistoryPoint {
  date: string;
  probability: number;
}

