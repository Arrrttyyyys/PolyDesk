export interface Market {
  id: string; // Market ID
  eventId: string; // Parent event ID
  title: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  liquidity?: string;
  resolution: string;
  probability: number;
  closed?: boolean;
  clobTokenIds?: {
    yes?: string;
    no?: string;
  };
  spread?: number;
  volume24h?: string;
  tags?: string[];
}

export interface OrderbookLevel {
  price: number;
  size: number;
  cumulative: number;
  type: "bid" | "ask";
}

export interface Orderbook {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  spread: number;
  midpoint: number;
  depth: number;
}

export interface PriceHistoryPoint {
  timestamp: number;
  date: string;
  probability: number;
  volume?: number;
}

export interface MarketMetrics {
  midpoint: number;
  spread: number;
  depth: number;
  imbalance: number;
  volatility: number;
  momentum: number;
  regime: "trending_up" | "trending_down" | "ranging" | "volatile";
}
