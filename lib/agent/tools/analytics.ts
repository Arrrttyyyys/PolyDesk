// Analytics agent tools
import {
  PriceDataPoint,
  OrderbookFeatures,
  MicrostructureAnalysis,
  TrendRegime,
} from "@/lib/agent/schemas";

// ============================================================================
// MARKET METRICS
// ============================================================================

/**
 * Compute market metrics from price history and orderbook
 */
export async function tool_computeMarketMetrics(params: {
  priceHistory: PriceDataPoint[];
  orderbookFeatures?: OrderbookFeatures;
}): Promise<{
  volatility: number;
  momentum: number;
  drawdown: number;
  healthScore: number;
  trendRegime: TrendRegime;
  microstructure?: MicrostructureAnalysis;
  error?: string;
}> {
  const { priceHistory, orderbookFeatures } = params;

  try {
    if (priceHistory.length < 2) {
      throw new Error("Insufficient price history");
    }

    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const ret =
        (priceHistory[i].price - priceHistory[i - 1].price) /
        priceHistory[i - 1].price;
      returns.push(ret);
    }

    // Volatility (standard deviation of returns)
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
      returns.length;
    const volatility = Math.sqrt(variance);

    // Momentum (recent trend)
    const recentWindow = Math.min(10, priceHistory.length);
    const recentPrices = priceHistory.slice(-recentWindow);
    const momentum =
      (recentPrices[recentPrices.length - 1].price - recentPrices[0].price) /
      recentPrices[0].price;

    // Maximum drawdown
    let maxPrice = priceHistory[0].price;
    let maxDrawdown = 0;
    for (const point of priceHistory) {
      maxPrice = Math.max(maxPrice, point.price);
      const drawdown = (maxPrice - point.price) / maxPrice;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Health score (based on volatility, drawdown, and orderbook depth)
    let healthScore = 0.5;
    if (volatility < 0.1) healthScore += 0.2;
    if (maxDrawdown < 0.1) healthScore += 0.15;
    if (orderbookFeatures && orderbookFeatures.depth.bid > 100) healthScore += 0.15;
    healthScore = Math.max(0, Math.min(1, healthScore));

    // Trend regime
    let trend: "uptrend" | "downtrend" | "sideways" | "volatile";
    if (volatility > 0.15) {
      trend = "volatile";
    } else if (momentum > 0.05) {
      trend = "uptrend";
    } else if (momentum < -0.05) {
      trend = "downtrend";
    } else {
      trend = "sideways";
    }

    const trendStrength = Math.abs(momentum) / (volatility + 0.01);

    const trendRegime: TrendRegime = {
      trend,
      strength: Math.min(1, trendStrength),
      volatility,
      momentum,
      recentDrawdown: maxDrawdown,
    };

    // Microstructure analysis
    let microstructure: MicrostructureAnalysis | undefined;
    if (orderbookFeatures) {
      const interpretation = interpretMicrostructure(orderbookFeatures);
      microstructure = {
        ...orderbookFeatures,
        interpretation,
      };
    }

    return {
      volatility,
      momentum,
      drawdown: maxDrawdown,
      healthScore,
      trendRegime,
      microstructure,
    };
  } catch (error) {
    throw new Error(
      `Failed to compute metrics: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================================================
// CORRELATION ANALYSIS
// ============================================================================

/**
 * Compute correlations between tokens
 */
export async function tool_computeCorrelations(params: {
  histories: Array<{
    tokenId: string;
    priceHistory: PriceDataPoint[];
  }>;
}): Promise<{
  correlationMatrix: Array<{
    token1: string;
    token2: string;
    correlation: number;
    leadLag?: { direction: "leads" | "lags" | "none"; lagHours: number };
  }>;
  error?: string;
}> {
  const { histories } = params;

  try {
    if (histories.length < 2) {
      throw new Error("Need at least 2 token histories");
    }

    const correlationMatrix: Array<{
      token1: string;
      token2: string;
      correlation: number;
      leadLag?: { direction: "leads" | "lags" | "none"; lagHours: number };
    }> = [];

    // Compute pairwise correlations
    for (let i = 0; i < histories.length; i++) {
      for (let j = i + 1; j < histories.length; j++) {
        const hist1 = histories[i];
        const hist2 = histories[j];

        // Align timestamps
        const { series1, series2 } = alignTimeSeries(
          hist1.priceHistory,
          hist2.priceHistory
        );

        if (series1.length < 2) continue;

        // Calculate correlation
        const correlation = pearsonCorrelation(series1, series2);

        // Calculate lead/lag
        const leadLag = calculateLeadLag(series1, series2);

        correlationMatrix.push({
          token1: hist1.tokenId,
          token2: hist2.tokenId,
          correlation,
          leadLag,
        });
      }
    }

    return { correlationMatrix };
  } catch (error) {
    return {
      correlationMatrix: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// INEFFICIENCY DETECTION
// ============================================================================

/**
 * Detect market inefficiencies
 */
export async function tool_detectInefficiencies(params: {
  primaryTokenId: string;
  relatedTokenIds: string[];
  histories: Array<{
    tokenId: string;
    priceHistory: PriceDataPoint[];
  }>;
  correlations: Array<{
    token1: string;
    token2: string;
    correlation: number;
  }>;
}): Promise<{
  inefficiencies: Array<{
    type: "mispricing" | "arbitrage" | "momentum" | "mean_reversion";
    primaryMarketId: string;
    relatedMarketId?: string;
    score: number;
    description: string;
    confidence: number;
  }>;
  error?: string;
}> {
  const { primaryTokenId, relatedTokenIds, histories, correlations } = params;

  try {
    const inefficiencies: Array<{
      type: "mispricing" | "arbitrage" | "momentum" | "mean_reversion";
      primaryMarketId: string;
      relatedMarketId?: string;
      score: number;
      description: string;
      confidence: number;
    }> = [];

    const primaryHistory = histories.find((h) => h.tokenId === primaryTokenId);
    if (!primaryHistory || primaryHistory.priceHistory.length < 2) {
      throw new Error("Primary token history not found");
    }

    // 1. Momentum inefficiency
    const recentPrices = primaryHistory.priceHistory.slice(-10);
    const momentum =
      (recentPrices[recentPrices.length - 1].price - recentPrices[0].price) /
      recentPrices[0].price;

    if (Math.abs(momentum) > 0.1) {
      inefficiencies.push({
        type: "momentum",
        primaryMarketId: primaryTokenId,
        score: Math.abs(momentum),
        description: `Strong ${momentum > 0 ? "bullish" : "bearish"} momentum detected (${(momentum * 100).toFixed(1)}%)`,
        confidence: 0.7,
      });
    }

    // 2. Mean reversion opportunity
    const prices = primaryHistory.priceHistory.map((p) => p.price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const stdDev = Math.sqrt(
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length
    );
    const currentPrice = prices[prices.length - 1];
    const zScore = (currentPrice - mean) / stdDev;

    if (Math.abs(zScore) > 1.5) {
      inefficiencies.push({
        type: "mean_reversion",
        primaryMarketId: primaryTokenId,
        score: Math.abs(zScore) / 3,
        description: `Price is ${Math.abs(zScore).toFixed(1)} standard deviations from mean`,
        confidence: 0.6,
      });
    }

    // 3. Pair divergence (correlation-based)
    for (const corr of correlations) {
      if (
        corr.correlation > 0.7 &&
        (corr.token1 === primaryTokenId || corr.token2 === primaryTokenId)
      ) {
        const relatedId =
          corr.token1 === primaryTokenId ? corr.token2 : corr.token1;
        const relatedHistory = histories.find((h) => h.tokenId === relatedId);

        if (relatedHistory && relatedHistory.priceHistory.length > 0) {
          const { series1, series2 } = alignTimeSeries(
            primaryHistory.priceHistory,
            relatedHistory.priceHistory
          );

          if (series1.length > 0) {
            const recentDiff =
              Math.abs(series1[series1.length - 1] - series2[series2.length - 1]);
            const avgDiff =
              series1.reduce(
                (sum, p, i) => sum + Math.abs(p - series2[i]),
                0
              ) / series1.length;

            if (recentDiff > avgDiff * 1.5) {
              inefficiencies.push({
                type: "arbitrage",
                primaryMarketId: primaryTokenId,
                relatedMarketId: relatedId,
                score: (recentDiff / avgDiff - 1) / 2,
                description: `Divergence detected with correlated market (${(corr.correlation * 100).toFixed(0)}% correlation)`,
                confidence: 0.8,
              });
            }
          }
        }
      }
    }

    return { inefficiencies };
  } catch (error) {
    return {
      inefficiencies: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function interpretMicrostructure(features: OrderbookFeatures): string {
  const { spread, depth, imbalance, slippage } = features;
  const lines: string[] = [];

  if (spread < 0.01) {
    lines.push("Tight spread indicates high liquidity");
  } else if (spread > 0.05) {
    lines.push("Wide spread suggests low liquidity or high uncertainty");
  }

  if (imbalance > 0.3) {
    lines.push("Strong bid pressure (bullish)");
  } else if (imbalance < -0.3) {
    lines.push("Strong ask pressure (bearish)");
  }

  if (slippage.medium > 0.05) {
    lines.push("High slippage for medium orders");
  }

  return lines.join(". ");
}

function alignTimeSeries(
  series1: PriceDataPoint[],
  series2: PriceDataPoint[]
): { series1: number[]; series2: number[] } {
  const aligned1: number[] = [];
  const aligned2: number[] = [];

  // Simple alignment: use overlapping timestamps
  for (const point1 of series1) {
    const point2 = series2.find((p) => p.timestamp === point1.timestamp);
    if (point2) {
      aligned1.push(point1.price);
      aligned2.push(point2.price);
    }
  }

  return { series1: aligned1, series2: aligned2 };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : numerator / denom;
}

function calculateLeadLag(
  series1: number[],
  series2: number[]
): { direction: "leads" | "lags" | "none"; lagHours: number } {
  if (series1.length < 3) return { direction: "none", lagHours: 0 };

  // Calculate correlation at different lags
  const maxLag = Math.min(5, Math.floor(series1.length / 2));
  let bestCorr = pearsonCorrelation(series1, series2);
  let bestLag = 0;

  // Test positive lags (series1 leads series2)
  for (let lag = 1; lag <= maxLag; lag++) {
    const s1 = series1.slice(0, -lag);
    const s2 = series2.slice(lag);
    const corr = pearsonCorrelation(s1, s2);
    if (Math.abs(corr) > Math.abs(bestCorr)) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  // Test negative lags (series2 leads series1)
  for (let lag = 1; lag <= maxLag; lag++) {
    const s1 = series1.slice(lag);
    const s2 = series2.slice(0, -lag);
    const corr = pearsonCorrelation(s1, s2);
    if (Math.abs(corr) > Math.abs(bestCorr)) {
      bestCorr = corr;
      bestLag = -lag;
    }
  }

  if (Math.abs(bestLag) < 2) {
    return { direction: "none", lagHours: 0 };
  }

  return {
    direction: bestLag > 0 ? "leads" : "lags",
    lagHours: Math.abs(bestLag),
  };
}
