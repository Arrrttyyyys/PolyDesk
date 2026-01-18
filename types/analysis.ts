export interface CorrelationData {
  marketA: string;
  marketB: string;
  correlation: number;
  pValue: number;
  confidence: "high" | "medium" | "low";
  lag: number; // Periods of lead/lag
}

export interface InefficiencyAlert {
  id: string;
  type: "divergence" | "spread" | "arbitrage";
  marketA: string;
  marketB?: string;
  zScore: number;
  residual: number;
  confidence: "high" | "medium" | "low";
  description: string;
  timestamp: number;
}

export interface Recommendation {
  id: string;
  type: "hedge" | "spread" | "directional";
  description: string;
  markets: Array<{
    marketId: string;
    side: "buy" | "sell";
    outcome: "yes" | "no";
  }>;
  rationale: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  expectedReturn?: string;
  warnings: string[];
}

export interface AnalyticsData {
  marketMetrics: {
    midpoint: number;
    spread: number;
    depth: number;
    imbalance: number;
    volatility: number;
    momentum: number;
    regime: string;
  };
  correlations: CorrelationData[];
  inefficiencies: InefficiencyAlert[];
  recommendations: Recommendation[];
}
