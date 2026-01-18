import { PriceHistoryPoint, MarketMetrics } from "@/types/market";

/**
 * Calculate market microstructure metrics
 */
export function calculateMarketMetrics(
  prices: PriceHistoryPoint[],
  bidAskSpread?: number
): MarketMetrics {
  if (prices.length === 0) {
    return {
      midpoint: 0.5,
      spread: bidAskSpread || 0.02,
      depth: 0,
      imbalance: 0,
      volatility: 0,
      momentum: 0,
      regime: "ranging",
    };
  }

  const latest = prices[prices.length - 1];
  const midpoint = latest.probability;

  // Calculate volatility (standard deviation of returns)
  const returns = calculateReturns(prices);
  const volatility = standardDeviation(returns);

  // Calculate momentum (price change over period)
  const momentum = calculateMomentum(prices);

  // Determine regime based on price action
  const regime = determineRegime(prices, volatility);

  return {
    midpoint,
    spread: bidAskSpread || 0.02,
    depth: 0, // Would need orderbook data
    imbalance: 0, // Would need orderbook data
    volatility,
    momentum,
    regime,
  };
}

/**
 * Calculate returns from price series
 */
function calculateReturns(prices: PriceHistoryPoint[]): number[] {
  const returns: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1].probability;
    const currPrice = prices[i].probability;
    
    if (prevPrice > 0) {
      returns.push((currPrice - prevPrice) / prevPrice);
    }
  }
  
  return returns;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate momentum indicator
 */
function calculateMomentum(prices: PriceHistoryPoint[], period: number = 10): number {
  if (prices.length < period) return 0;
  
  const current = prices[prices.length - 1].probability;
  const past = prices[prices.length - period].probability;
  
  return current - past;
}

/**
 * Determine market regime
 */
function determineRegime(
  prices: PriceHistoryPoint[],
  volatility: number
): "trending_up" | "trending_down" | "ranging" | "volatile" {
  if (volatility > 0.05) return "volatile";
  
  if (prices.length < 10) return "ranging";
  
  const momentum = calculateMomentum(prices, 10);
  
  if (momentum > 0.05) return "trending_up";
  if (momentum < -0.05) return "trending_down";
  
  return "ranging";
}

/**
 * Calculate rolling volatility
 */
export function calculateRollingVolatility(
  prices: PriceHistoryPoint[],
  window: number = 20
): Array<{ timestamp: number; volatility: number }> {
  const result: Array<{ timestamp: number; volatility: number }> = [];
  
  for (let i = window - 1; i < prices.length; i++) {
    const windowPrices = prices.slice(i - window + 1, i + 1);
    const returns = calculateReturns(windowPrices);
    const volatility = standardDeviation(returns);
    
    result.push({
      timestamp: prices[i].timestamp,
      volatility,
    });
  }
  
  return result;
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(
  prices: PriceHistoryPoint[],
  window: number = 20
): Array<{ timestamp: number; ma: number }> {
  const result: Array<{ timestamp: number; ma: number }> = [];
  
  for (let i = window - 1; i < prices.length; i++) {
    const windowPrices = prices.slice(i - window + 1, i + 1);
    const sum = windowPrices.reduce((acc, p) => acc + p.probability, 0);
    const ma = sum / window;
    
    result.push({
      timestamp: prices[i].timestamp,
      ma,
    });
  }
  
  return result;
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: PriceHistoryPoint[],
  window: number = 20,
  stdMultiplier: number = 2
): Array<{ timestamp: number; upper: number; middle: number; lower: number }> {
  const result: Array<{ timestamp: number; upper: number; middle: number; lower: number }> = [];
  
  for (let i = window - 1; i < prices.length; i++) {
    const windowPrices = prices.slice(i - window + 1, i + 1);
    const values = windowPrices.map(p => p.probability);
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = standardDeviation(values);
    
    result.push({
      timestamp: prices[i].timestamp,
      upper: mean + stdMultiplier * std,
      middle: mean,
      lower: mean - stdMultiplier * std,
    });
  }
  
  return result;
}
