export interface StrategyLeg {
  id: string;
  marketId: string;
  marketTitle: string;
  side: "buy" | "sell";
  outcome: "yes" | "no";
  size: number;
  entryPrice: number;
}

export interface Strategy {
  id: string;
  name: string;
  legs: StrategyLeg[];
  createdAt: number;
  updatedAt: number;
  description?: string;
}

export interface PayoffPoint {
  probability: number;
  pnl: number;
}

export interface ScenarioResult {
  probability: number;
  timeframe: string; // "1d", "7d", "30d"
  pnl: number;
}

export interface BacktestResult {
  winRate: number;
  avgPnL: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  timeline: Array<{
    date: string;
    pnl: number;
    cumulativePnl: number;
  }>;
}

export interface Trigger {
  id: string;
  type: "price" | "time" | "event";
  condition: string;
  action: "alert" | "review" | "close";
  active: boolean;
}
