import { Recommendation, CorrelationData } from "@/types/analysis";
import { Market } from "@/types/market";

/**
 * Generate trade recommendations based on analytics
 */
export function generateRecommendations(
  targetMarket: Market,
  correlations: CorrelationData[],
  inefficiencies: Array<{ type: string; marketB?: string; zScore: number }>
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Hedging recommendations based on negative correlations
  const hedgingRecs = generateHedgingRecommendations(targetMarket, correlations);
  recommendations.push(...hedgingRecs);

  // 2. Spread trade recommendations based on inefficiencies
  const spreadRecs = generateSpreadRecommendations(targetMarket, inefficiencies);
  recommendations.push(...spreadRecs);

  // 3. Directional recommendations based on momentum
  const directionalRecs = generateDirectionalRecommendations(targetMarket);
  recommendations.push(...directionalRecs);

  return recommendations;
}

/**
 * Generate hedging recommendations
 */
function generateHedgingRecommendations(
  targetMarket: Market,
  correlations: CorrelationData[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Find negatively correlated markets for hedging
  const hedges = correlations.filter(c => c.correlation < -0.5 && c.confidence !== "low");

  hedges.forEach(hedge => {
    recommendations.push({
      id: `hedge-${targetMarket.id}-${hedge.marketB}-${Date.now()}`,
      type: "hedge",
      description: `Risk-reduction hedge opportunity`,
      markets: [
        { marketId: targetMarket.id, side: "buy", outcome: "yes" },
        { marketId: hedge.marketB, side: "buy", outcome: "yes" },
      ],
      rationale: `Market ${hedge.marketB} has negative correlation (${hedge.correlation.toFixed(2)}) with ${targetMarket.title}. Taking positions in both can reduce overall portfolio variance.`,
      confidence: hedge.confidence === "high" ? 0.8 : 0.6,
      risk: "medium",
      warnings: [
        "Correlations can change over time",
        "Not a perfect hedge - residual risk remains",
        "Consider position sizing based on correlation strength",
      ],
    });
  });

  return recommendations;
}

/**
 * Generate spread trade recommendations
 */
function generateSpreadRecommendations(
  targetMarket: Market,
  inefficiencies: Array<{ type: string; marketB?: string; zScore: number }>
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const spreads = inefficiencies.filter(i => i.type === "spread" && i.marketB);

  spreads.forEach(spread => {
    const isPositiveDivergence = spread.zScore > 0;

    recommendations.push({
      id: `spread-${targetMarket.id}-${spread.marketB}-${Date.now()}`,
      type: "spread",
      description: `Mean reversion spread trade`,
      markets: [
        { 
          marketId: targetMarket.id, 
          side: isPositiveDivergence ? "sell" : "buy", 
          outcome: "yes" 
        },
        { 
          marketId: spread.marketB!, 
          side: isPositiveDivergence ? "buy" : "sell", 
          outcome: "yes" 
        },
      ],
      rationale: `Detected ${Math.abs(spread.zScore).toFixed(1)} standard deviation divergence. Historical relationship suggests mean reversion opportunity.`,
      confidence: Math.abs(spread.zScore) > 3.0 ? 0.7 : 0.5,
      risk: Math.abs(spread.zScore) > 3.0 ? "medium" : "high",
      expectedReturn: `Potential ${(Math.abs(spread.zScore) * 2).toFixed(0)}% if mean reversion occurs`,
      warnings: [
        "Mean reversion is not guaranteed",
        "Markets may remain diverged or diverge further",
        "Consider wider stop losses for spread trades",
        "Monitor both markets closely",
      ],
    });
  });

  return recommendations;
}

/**
 * Generate directional recommendations
 */
function generateDirectionalRecommendations(
  targetMarket: Market
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Simple directional recommendation based on current price
  const currentPrice = targetMarket.yesPrice;

  // If price is in mid-range and no strong signal, suggest waiting
  if (currentPrice > 0.35 && currentPrice < 0.65) {
    recommendations.push({
      id: `wait-${targetMarket.id}-${Date.now()}`,
      type: "directional",
      description: `Wait for clearer signal`,
      markets: [{ marketId: targetMarket.id, side: "buy", outcome: "yes" }],
      rationale: `Current price ${(currentPrice * 100).toFixed(0)}¢ is in the uncertain range. Wait for price to move to extremes or for new information.`,
      confidence: 0.3,
      risk: "low",
      warnings: [
        "Market may be fairly priced",
        "Consider additional research before entry",
        "Set price alerts for movements above 65¢ or below 35¢",
      ],
    });
  }

  return recommendations;
}

/**
 * Sort recommendations by confidence
 */
export function sortRecommendationsByConfidence(
  recommendations: Recommendation[]
): Recommendation[] {
  return [...recommendations].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Filter recommendations by risk level
 */
export function filterRecommendationsByRisk(
  recommendations: Recommendation[],
  maxRisk: "low" | "medium" | "high"
): Recommendation[] {
  const riskLevels = { low: 1, medium: 2, high: 3 };
  const maxLevel = riskLevels[maxRisk];

  return recommendations.filter(rec => riskLevels[rec.risk] <= maxLevel);
}
