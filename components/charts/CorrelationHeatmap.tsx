"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

interface CorrelationData {
  marketA: string;
  marketB: string;
  correlation: number;
}

interface CorrelationHeatmapProps {
  data: CorrelationData[];
  marketNames: Record<string, string>;
}

export default function CorrelationHeatmap({ data, marketNames }: CorrelationHeatmapProps) {
  // Get unique markets
  const markets = Array.from(new Set([
    ...data.map(d => d.marketA),
    ...data.map(d => d.marketB),
  ]));

  // Build correlation matrix
  const matrix: Record<string, Record<string, number>> = {};
  markets.forEach(m => {
    matrix[m] = {};
    markets.forEach(n => {
      matrix[m][n] = m === n ? 1 : 0;
    });
  });

  // Fill in correlations
  data.forEach(d => {
    matrix[d.marketA][d.marketB] = d.correlation;
    matrix[d.marketB][d.marketA] = d.correlation;
  });

  // Helper to get color for correlation value
  const getColor = (correlation: number) => {
    if (correlation > 0.7) return "bg-emerald-600";
    if (correlation > 0.4) return "bg-emerald-500";
    if (correlation > 0.1) return "bg-emerald-400/50";
    if (correlation > -0.1) return "bg-gray-700";
    if (correlation > -0.4) return "bg-red-400/50";
    if (correlation > -0.7) return "bg-red-500";
    return "bg-red-600";
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${markets.length}, 60px)` }}>
        {/* Header row */}
        <div className="h-16"></div>
        {markets.map(market => (
          <div key={`header-${market}`} className="h-16 flex items-end justify-center pb-1">
            <div className="text-xs text-gray-400 transform -rotate-45 origin-bottom-left whitespace-nowrap">
              {marketNames[market]?.substring(0, 15) || market}
            </div>
          </div>
        ))}

        {/* Matrix rows */}
        {markets.map(rowMarket => (
          <div key={`row-${rowMarket}`} className="contents">
            <div className="h-16 flex items-center pr-2">
              <div className="text-xs text-gray-400 truncate text-right">
                {marketNames[rowMarket]?.substring(0, 15) || rowMarket}
              </div>
            </div>
            {markets.map(colMarket => {
              const correlation = matrix[rowMarket][colMarket];
              return (
                <div
                  key={`cell-${rowMarket}-${colMarket}`}
                  className={`h-16 flex items-center justify-center ${getColor(correlation)} border border-gray-800`}
                  title={`${marketNames[rowMarket]} vs ${marketNames[colMarket]}: ${(correlation * 100).toFixed(0)}%`}
                >
                  <span className="text-xs text-white font-medium">
                    {(correlation * 100).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <span>Correlation:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600"></div>
          <span>-1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-700"></div>
          <span>0.0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-600"></div>
          <span>+1.0</span>
        </div>
      </div>
    </div>
  );
}
