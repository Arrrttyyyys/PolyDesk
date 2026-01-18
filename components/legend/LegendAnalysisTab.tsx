"use client";

import { AnalysisBoard } from "@/lib/agent/schemas";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  GitBranch,
  Target,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  ComposedChart,
} from "recharts";

interface LegendAnalysisTabProps {
  analysisBoard?: AnalysisBoard | null;
}

export function LegendAnalysisTab({ analysisBoard }: LegendAnalysisTabProps) {
  if (!analysisBoard) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No analysis data available</p>
      </div>
    );
  }

  const getLiquidityColor = (depth: number) => {
    if (depth > 5000) return "text-green-500";
    if (depth > 1000) return "text-yellow-500";
    return "text-red-500";
  };

  const getImbalanceColor = (imbalance: number) => {
    const abs = Math.abs(imbalance);
    if (abs > 0.5) return "text-red-500";
    if (abs > 0.2) return "text-yellow-500";
    return "text-green-500";
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "uptrend":
        return "text-green-500";
      case "downtrend":
        return "text-red-500";
      case "volatile":
        return "text-purple-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Market Microstructure Panel */}
      {analysisBoard.microstructure && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Market Microstructure
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-gray-400">Spread</div>
              <div className="text-lg font-bold text-white">
                {(analysisBoard.microstructure.spread * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Depth</div>
              <div
                className={`text-lg font-bold ${getLiquidityColor(
                  analysisBoard.microstructure.depth.bid +
                    analysisBoard.microstructure.depth.ask
                )}`}
              >
                ${(
                  analysisBoard.microstructure.depth.bid +
                  analysisBoard.microstructure.depth.ask
                ).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Imbalance</div>
              <div
                className={`text-lg font-bold ${getImbalanceColor(
                  analysisBoard.microstructure.imbalance
                )}`}
              >
                {(analysisBoard.microstructure.imbalance * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Slippage (Med)</div>
              <div className="text-lg font-bold text-white">
                {(analysisBoard.microstructure.slippage.medium * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Warnings */}
          {analysisBoard.microstructure.spread > 0.05 && (
            <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 rounded px-2 py-1">
              <AlertCircle className="w-3 h-3" />
              Wide spread detected
            </div>
          )}
          {(analysisBoard.microstructure.depth.bid +
            analysisBoard.microstructure.depth.ask) < 1000 && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 rounded px-2 py-1 mt-2">
              <AlertTriangle className="w-3 h-3" />
              Low liquidity warning
            </div>
          )}

          {analysisBoard.microstructure.interpretation && (
            <p className="text-xs text-gray-400 mt-3">
              {analysisBoard.microstructure.interpretation}
            </p>
          )}
        </div>
      )}

      {/* Trend + Regime Panel */}
      {analysisBoard.trendRegime && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trend & Regime
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xs text-gray-400">Trend</div>
              <div
                className={`text-lg font-bold capitalize ${getTrendColor(
                  analysisBoard.trendRegime.trend
                )}`}
              >
                {analysisBoard.trendRegime.trend}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Strength</div>
              <div className="text-lg font-bold text-white">
                {(analysisBoard.trendRegime.strength * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Volatility</div>
              <div className="text-lg font-bold text-purple-500">
                {(analysisBoard.trendRegime.volatility * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Momentum</div>
              <div
                className={`text-lg font-bold ${
                  analysisBoard.trendRegime.momentum > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {analysisBoard.trendRegime.momentum > 0 ? "+" : ""}
                {(analysisBoard.trendRegime.momentum * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {analysisBoard.trendRegime.recentDrawdown !== undefined && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 rounded px-2 py-1">
              <AlertCircle className="w-3 h-3" />
              Recent drawdown: {(analysisBoard.trendRegime.recentDrawdown * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}

      {/* Cross-Market Relationships Panel */}
      {analysisBoard.relationships && analysisBoard.relationships.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Cross-Market Relationships
          </h3>

          <div className="space-y-2">
            {analysisBoard.relationships.slice(0, 5).map((rel, i) => (
              <div
                key={i}
                className="bg-white/5 rounded p-2 border border-white/5"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400 truncate flex-1">
                    {rel.marketTitle}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      rel.correlation > 0.5
                        ? "text-green-500"
                        : rel.correlation < -0.5
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {rel.correlation > 0 ? "+" : ""}
                    {rel.correlation.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      rel.correlation > 0 ? "bg-green-500" : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.abs(rel.correlation) * 100}%`,
                    }}
                  />
                </div>
                {rel.leadLag && rel.leadLag.direction !== "none" && (
                  <div className="text-xs text-blue-400 mt-1">
                    {rel.leadLag.direction === "leads" ? "⟶" : "⟵"} Lag:{" "}
                    {rel.leadLag.lagHours}h
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inefficiency Scanner Panel */}
      {analysisBoard.inefficiencies && analysisBoard.inefficiencies.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Inefficiency Scanner
          </h3>

          <div className="space-y-3">
            {analysisBoard.inefficiencies.map((ineff, i) => (
              <div
                key={i}
                className="bg-white/5 rounded p-3 border border-white/5"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-white capitalize">
                    {ineff.type.replace("_", " ")}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                    Score: {(ineff.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{ineff.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Confidence: {(ineff.confidence * 100).toFixed(0)}%
                  </span>
                  {ineff.score > 0.7 && (
                    <span className="text-xs text-yellow-500">⚠ High divergence</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-gray-500 italic">
            Note: Divergence detected - possible hedge consideration. Educational only.
          </div>
        </div>
      )}

      {/* Correlation-Aware Recommendations */}
      {analysisBoard.recommendations && analysisBoard.recommendations.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Strategy Considerations
          </h3>

          <div className="space-y-3">
            {analysisBoard.recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-white/5 rounded p-3 border border-white/5"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span
                      className={`text-xs font-semibold uppercase ${
                        rec.action === "buy"
                          ? "text-green-500"
                          : rec.action === "sell"
                          ? "text-red-500"
                          : rec.action === "hedge"
                          ? "text-blue-500"
                          : "text-gray-400"
                      }`}
                    >
                      {rec.action} {rec.outcome.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    {(rec.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{rec.rationale}</p>
                {rec.entryPrice && (
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>Entry: ${rec.entryPrice.toFixed(2)}</span>
                    {rec.targetPrice && (
                      <span>Target: ${rec.targetPrice.toFixed(2)}</span>
                    )}
                    {rec.stopLoss && <span>Stop: ${rec.stopLoss.toFixed(2)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-500">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Educational/simulation only; not financial advice.
          </div>
        </div>
      )}

      {/* Context & Sentiment Panel */}
      {analysisBoard.context && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">
            Market Context
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {analysisBoard.context}
          </p>
        </div>
      )}
    </div>
  );
}
