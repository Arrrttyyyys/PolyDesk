"use client";

import { useState } from "react";
import { Strategy, StrategyLeg, Trigger } from "@/lib/agent/schemas";
import {
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface LegendStrategyTabProps {
  strategy?: Strategy | null;
  onAddLeg: (leg: StrategyLeg) => void;
  onRemoveLeg: (index: number) => void;
  onAddTrigger: (trigger: Trigger) => void;
  onRunBacktest: () => void;
}

export function LegendStrategyTab({
  strategy,
  onAddLeg,
  onRemoveLeg,
  onAddTrigger,
  onRunBacktest,
}: LegendStrategyTabProps) {
  const [showAddLeg, setShowAddLeg] = useState(false);
  const [showAddTrigger, setShowAddTrigger] = useState(false);

  if (!strategy) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No strategy loaded</p>
      </div>
    );
  }

  // Generate payoff curve data
  const payoffData =
    strategy.payoffCurve.length > 0
      ? strategy.payoffCurve
      : Array.from({ length: 21 }, (_, i) => ({
          scenario: `${(i * 5).toFixed(0)}%`,
          pnl: Math.random() * 200 - 100,
          probability: i * 0.05,
        }));

  // Calculate breakeven points
  const breakevenPoints = payoffData.filter(
    (p, i) =>
      i > 0 &&
      ((p.pnl >= 0 && payoffData[i - 1].pnl < 0) ||
        (p.pnl < 0 && payoffData[i - 1].pnl >= 0))
  );

  // Scenario grid data
  const scenarioGrid =
    strategy.scenarioGrid.length > 0
      ? strategy.scenarioGrid
      : [
          { market1Outcome: "yes", market2Outcome: "yes", pnl: 150, probability: 0.3 },
          { market1Outcome: "yes", market2Outcome: "no", pnl: -50, probability: 0.2 },
          { market1Outcome: "no", market2Outcome: "yes", pnl: 50, probability: 0.2 },
          { market1Outcome: "no", market2Outcome: "no", pnl: -100, probability: 0.3 },
        ];

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-green-500 bg-green-500/20";
    if (pnl < 0) return "text-red-500 bg-red-500/20";
    return "text-gray-400 bg-gray-500/20";
  };

  // Backtest timeline data
  const backtestData =
    strategy.backtestResults.length > 0
      ? strategy.backtestResults.map((r) => ({
          timestamp: new Date(r.timestamp).toLocaleDateString(),
          pnl: r.cumulativePnl,
        }))
      : [];

  const totalPnL = backtestData[backtestData.length - 1]?.pnl || 0;
  const winRate =
    backtestData.length > 0
      ? (backtestData.filter((d) => d.pnl > 0).length / backtestData.length) * 100
      : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Strategy Summary */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-white">Strategy Overview</h3>
          <div className="flex gap-2 text-xs">
            {strategy.maxRisk && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
                Max Risk: ${strategy.maxRisk.toFixed(0)}
              </span>
            )}
            {strategy.expectedReturn && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                Expected: +${strategy.expectedReturn.toFixed(0)}
              </span>
            )}
            {strategy.sharpeRatio && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                Sharpe: {strategy.sharpeRatio.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add Legs Section */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4" />
            Strategy Legs
          </h3>
          <button
            onClick={() => setShowAddLeg(!showAddLeg)}
            className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Leg
          </button>
        </div>

        {/* Current Legs */}
        {strategy.legs.length > 0 ? (
          <div className="space-y-2">
            {strategy.legs.map((leg, i) => (
              <div
                key={i}
                className="bg-white/5 rounded p-3 border border-white/5 flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white mb-1">
                    {leg.marketTitle}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span
                      className={
                        leg.side === "buy" ? "text-green-500" : "text-red-500"
                      }
                    >
                      {leg.side.toUpperCase()} {leg.outcome.toUpperCase()}
                    </span>
                    <span>{leg.size} shares @ ${leg.entryPrice.toFixed(2)}</span>
                    {leg.currentPrice && (
                      <span>
                        Current: ${leg.currentPrice.toFixed(2)} (
                        {((leg.currentPrice - leg.entryPrice) * leg.size).toFixed(0)} PnL)
                      </span>
                    )}
                  </div>
                  {leg.rationale && (
                    <p className="text-xs text-gray-500 mt-1">{leg.rationale}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveLeg(i)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No legs added yet</p>
        )}

        {showAddLeg && (
          <div className="mt-3 p-3 bg-white/5 rounded border border-white/10 text-xs">
            {/* TODO: Implement add leg form with market selector dropdown, 
                side radio buttons (buy/sell), outcome radio buttons (yes/no), 
                and size number input. Call onAddLeg on submit. */}
            <p className="text-gray-400">
              Add leg form (market selector, side, outcome, size)
            </p>
          </div>
        )}
      </div>

      {/* Payoff Curve */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Payoff Curve
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={payoffData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="scenario"
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: "10px" }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: "10px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
              }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
            <Line
              type="monotone"
              dataKey="pnl"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            {breakevenPoints.map((point, i) => (
              <ReferenceLine
                key={i}
                x={point.scenario}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ value: "Breakeven", fontSize: 10 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Grid */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Scenario Grid
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {scenarioGrid.map((scenario, i) => (
            <div
              key={i}
              className={`rounded p-3 border ${getPnLColor(scenario.pnl)}`}
            >
              <div className="text-xs font-semibold mb-1">
                M1: {scenario.market1Outcome.toUpperCase()}
                {scenario.market2Outcome && ` / M2: ${scenario.market2Outcome.toUpperCase()}`}
              </div>
              <div className="text-lg font-bold">
                {scenario.pnl > 0 ? "+" : ""}${scenario.pnl.toFixed(0)}
              </div>
              {scenario.probability && (
                <div className="text-xs opacity-70">
                  {(scenario.probability * 100).toFixed(0)}% prob
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Triggers Section */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Triggers
          </h3>
          <button
            onClick={() => setShowAddTrigger(!showAddTrigger)}
            className="text-xs px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Trigger
          </button>
        </div>

        {strategy.triggers.length > 0 ? (
          <div className="space-y-2">
            {strategy.triggers.map((trigger, i) => (
              <div
                key={i}
                className="bg-white/5 rounded p-2 border border-white/5 text-xs"
              >
                <span
                  className={`font-semibold uppercase ${
                    trigger.type === "entry"
                      ? "text-green-500"
                      : trigger.type === "exit"
                      ? "text-red-500"
                      : "text-blue-500"
                  }`}
                >
                  {trigger.type}
                </span>
                <span className="text-gray-400 ml-2">{trigger.condition}</span>
                {trigger.priceLevel && (
                  <span className="text-gray-500 ml-2">@ ${trigger.priceLevel.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No triggers set</p>
        )}

        {showAddTrigger && (
          <div className="mt-3 p-3 bg-white/5 rounded border border-white/10 text-xs">
            {/* TODO: Implement add trigger form with type dropdown (entry/exit/hedge/unwind),
                condition text input, and optional price level number input. 
                Call onAddTrigger on submit. */}
            <p className="text-gray-400">
              Add trigger form (type, condition, price level)
            </p>
          </div>
        )}
      </div>

      {/* Backtest Results */}
      {backtestData.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-white">Backtest Results</h3>
            <button
              onClick={onRunBacktest}
              className="text-xs px-3 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
            >
              Run Backtest
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-white/5 rounded p-2">
              <div className="text-xs text-gray-400">Total PnL</div>
              <div
                className={`text-lg font-bold ${
                  totalPnL > 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {totalPnL > 0 ? "+" : ""}${totalPnL.toFixed(0)}
              </div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-xs text-gray-400">Win Rate</div>
              <div className="text-lg font-bold text-white">
                {winRate.toFixed(0)}%
              </div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-xs text-gray-400">Sharpe</div>
              <div className="text-lg font-bold text-white">
                {strategy.sharpeRatio?.toFixed(2) || "—"}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={backtestData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="timestamp"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "10px" }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "10px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                }}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke={totalPnL > 0 ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-500">
        <AlertTriangle className="w-3 h-3 inline mr-1" />
        Educational/simulation only; not financial advice.
      </div>
    </div>
  );
}
