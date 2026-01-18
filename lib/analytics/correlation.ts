import { PriceHistoryPoint } from "@/types/market";
import { CorrelationData } from "@/types/analysis";

/**
 * Calculate Pearson correlation coefficient between two price series
 */
export function calculateCorrelation(
  seriesA: PriceHistoryPoint[],
  seriesB: PriceHistoryPoint[]
): { correlation: number; pValue: number } {
  // Align series by timestamp
  const aligned = alignSeries(seriesA, seriesB);
  
  if (aligned.length < 3) {
    return { correlation: 0, pValue: 1 };
  }

  const xValues = aligned.map(p => p.a);
  const yValues = aligned.map(p => p.b);

  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return { correlation: 0, pValue: 1 };
  }

  const correlation = numerator / denominator;

  // Simple p-value approximation (t-test)
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = calculatePValue(t, n - 2);

  return { correlation, pValue };
}

/**
 * Align two price series by timestamp
 */
function alignSeries(
  seriesA: PriceHistoryPoint[],
  seriesB: PriceHistoryPoint[]
): Array<{ timestamp: number; a: number; b: number }> {
  const mapB = new Map(seriesB.map(p => [p.timestamp, p.probability]));
  
  return seriesA
    .filter(p => mapB.has(p.timestamp))
    .map(p => ({
      timestamp: p.timestamp,
      a: p.probability,
      b: mapB.get(p.timestamp)!,
    }));
}

/**
 * Calculate lead-lag correlation
 */
export function calculateLeadLag(
  seriesA: PriceHistoryPoint[],
  seriesB: PriceHistoryPoint[],
  maxLag: number = 5
): { lag: number; correlation: number } {
  let bestLag = 0;
  let bestCorr = 0;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const shiftedB = seriesB.map(p => ({
      ...p,
      timestamp: p.timestamp + lag,
    }));

    const { correlation } = calculateCorrelation(seriesA, shiftedB);
    
    if (Math.abs(correlation) > Math.abs(bestCorr)) {
      bestCorr = correlation;
      bestLag = lag;
    }
  }

  return { lag: bestLag, correlation: bestCorr };
}

/**
 * Calculate rolling correlation
 */
export function calculateRollingCorrelation(
  seriesA: PriceHistoryPoint[],
  seriesB: PriceHistoryPoint[],
  window: number = 10
): Array<{ timestamp: number; correlation: number }> {
  const aligned = alignSeries(seriesA, seriesB);
  const result: Array<{ timestamp: number; correlation: number }> = [];

  for (let i = window - 1; i < aligned.length; i++) {
    const windowData = aligned.slice(i - window + 1, i + 1);
    const xValues = windowData.map(p => p.a);
    const yValues = windowData.map(p => p.b);

    const correlation = pearsonCorrelation(xValues, yValues);
    result.push({
      timestamp: aligned[i].timestamp,
      correlation,
    });
  }

  return result;
}

/**
 * Helper: Pearson correlation for arrays
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Simple p-value approximation for t-statistic
 */
function calculatePValue(t: number, df: number): number {
  // Very rough approximation for demonstration
  const absT = Math.abs(t);
  
  if (absT > 3.0) return 0.01;
  if (absT > 2.5) return 0.02;
  if (absT > 2.0) return 0.05;
  if (absT > 1.5) return 0.10;
  return 0.20;
}

/**
 * Determine correlation confidence level
 */
export function getCorrelationConfidence(
  correlation: number,
  pValue: number
): "high" | "medium" | "low" {
  if (Math.abs(correlation) > 0.7 && pValue < 0.05) return "high";
  if (Math.abs(correlation) > 0.5 && pValue < 0.10) return "medium";
  return "low";
}
