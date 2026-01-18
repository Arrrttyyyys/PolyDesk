import { PriceHistoryPoint } from "@/types/market";
import { InefficiencyAlert } from "@/types/analysis";
import { calculateCorrelation } from "./correlation";

/**
 * Detect market inefficiencies using statistical methods
 */
export function detectInefficiencies(
  marketA: { id: string; title: string; prices: PriceHistoryPoint[] },
  marketB: { id: string; title: string; prices: PriceHistoryPoint[] }
): InefficiencyAlert[] {
  const alerts: InefficiencyAlert[] = [];

  // 1. Check for divergence (cointegration-like)
  const divergence = detectDivergence(marketA, marketB);
  if (divergence) {
    alerts.push(divergence);
  }

  // 2. Check for spread opportunities
  const spread = detectSpreadOpportunity(marketA, marketB);
  if (spread) {
    alerts.push(spread);
  }

  return alerts;
}

/**
 * Detect divergence between correlated markets
 */
function detectDivergence(
  marketA: { id: string; title: string; prices: PriceHistoryPoint[] },
  marketB: { id: string; title: string; prices: PriceHistoryPoint[] }
): InefficiencyAlert | null {
  const { correlation } = calculateCorrelation(marketA.prices, marketB.prices);

  // Only check for divergence if markets are correlated
  if (Math.abs(correlation) < 0.5) {
    return null;
  }

  // Calculate residuals using linear regression
  const { residuals, zScore } = calculateResiduals(marketA.prices, marketB.prices);

  // Alert if z-score is significant (> 2 standard deviations)
  if (Math.abs(zScore) > 2.0) {
    const confidence = Math.abs(zScore) > 3.0 ? "high" : Math.abs(zScore) > 2.5 ? "medium" : "low";
    
    return {
      id: `divergence-${marketA.id}-${marketB.id}-${Date.now()}`,
      type: "divergence",
      marketA: marketA.id,
      marketB: marketB.id,
      zScore,
      residual: residuals[residuals.length - 1] || 0,
      confidence,
      description: `Detected ${zScore > 0 ? "positive" : "negative"} divergence between ${marketA.title} and ${marketB.title}. Markets historically correlated (r=${correlation.toFixed(2)}) but current spread is ${Math.abs(zScore).toFixed(1)} standard deviations from mean.`,
      timestamp: Date.now(),
    };
  }

  return null;
}

/**
 * Detect spread trading opportunities
 */
function detectSpreadOpportunity(
  marketA: { id: string; title: string; prices: PriceHistoryPoint[] },
  marketB: { id: string; title: string; prices: PriceHistoryPoint[] }
): InefficiencyAlert | null {
  if (marketA.prices.length === 0 || marketB.prices.length === 0) {
    return null;
  }

  const priceA = marketA.prices[marketA.prices.length - 1].probability;
  const priceB = marketB.prices[marketB.prices.length - 1].probability;

  // Check if sum is far from 1.0 (potential arbitrage for complementary events)
  const sum = priceA + priceB;
  const deviation = Math.abs(sum - 1.0);

  if (deviation > 0.05) {
    return {
      id: `spread-${marketA.id}-${marketB.id}-${Date.now()}`,
      type: "spread",
      marketA: marketA.id,
      marketB: marketB.id,
      zScore: deviation / 0.02, // Normalize by typical spread
      residual: sum - 1.0,
      confidence: deviation > 0.10 ? "high" : deviation > 0.07 ? "medium" : "low",
      description: `Potential spread opportunity: ${marketA.title} (${(priceA * 100).toFixed(0)}¢) + ${marketB.title} (${(priceB * 100).toFixed(0)}¢) = ${(sum * 100).toFixed(0)}¢ (expected: 100¢)`,
      timestamp: Date.now(),
    };
  }

  return null;
}

/**
 * Calculate residuals using simple linear regression
 */
function calculateResiduals(
  seriesA: PriceHistoryPoint[],
  seriesB: PriceHistoryPoint[]
): { residuals: number[]; zScore: number } {
  // Align series
  const mapB = new Map(seriesB.map(p => [p.timestamp, p.probability]));
  const aligned = seriesA
    .filter(p => mapB.has(p.timestamp))
    .map(p => ({ x: p.probability, y: mapB.get(p.timestamp)! }));

  if (aligned.length < 3) {
    return { residuals: [], zScore: 0 };
  }

  // Calculate linear regression coefficients
  const n = aligned.length;
  const sumX = aligned.reduce((sum, p) => sum + p.x, 0);
  const sumY = aligned.reduce((sum, p) => sum + p.y, 0);
  const sumXY = aligned.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = aligned.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate residuals
  const residuals = aligned.map(p => p.y - (slope * p.x + intercept));

  // Calculate z-score of latest residual
  const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance = residuals.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / residuals.length;
  const std = Math.sqrt(variance);

  const latestResidual = residuals[residuals.length - 1];
  const zScore = std > 0 ? (latestResidual - mean) / std : 0;

  return { residuals, zScore };
}

/**
 * Detect single-market inefficiencies
 */
export function detectSingleMarketInefficiencies(
  market: { id: string; title: string; prices: PriceHistoryPoint[] }
): InefficiencyAlert[] {
  const alerts: InefficiencyAlert[] = [];

  // Check for extreme prices
  if (market.prices.length > 0) {
    const latestPrice = market.prices[market.prices.length - 1].probability;
    
    // Prices too close to 0 or 1 may indicate low liquidity
    if (latestPrice < 0.05 || latestPrice > 0.95) {
      alerts.push({
        id: `extreme-price-${market.id}-${Date.now()}`,
        type: "arbitrage",
        marketA: market.id,
        zScore: latestPrice < 0.05 ? -10 : 10,
        residual: latestPrice < 0.05 ? latestPrice : 1 - latestPrice,
        confidence: "low",
        description: `Extreme price detected: ${(latestPrice * 100).toFixed(0)}¢. May indicate low liquidity or high certainty.`,
        timestamp: Date.now(),
      });
    }
  }

  return alerts;
}
