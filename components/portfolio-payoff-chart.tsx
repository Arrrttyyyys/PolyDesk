"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { PortfolioLeg } from "@/lib/types";

type PnLMode = "resolution" | "exit";

interface PortfolioPayoffChartProps {
  legs: PortfolioLeg[];
}

type ChartPoint = {
  probability: number; // 0..100
  pnl: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Same idea as Scenario Modeling: price moves toward target with a half-life.
// days=0 => no movement, days large => close to target
function convergenceFactor(days: number, halfLifeDays = 14) {
  const d = Math.max(days, 0);
  return 1 - Math.pow(0.5, d / halfLifeDays); // 0..1
}

// Expected settlement value of a token given probYes:
// YES token expected value = probYes
// NO token expected value = 1 - probYes
function expectedSettlementValue(outcome: "yes" | "no", probYes: number) {
  return outcome === "yes" ? probYes : 1 - probYes;
}

export default function PortfolioPayoffChart({ legs }: PortfolioPayoffChartProps) {
  const [mode, setMode] = useState<PnLMode>("resolution");
  const [exitDays, setExitDays] = useState<number>(30);

  if (!legs || legs.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Add positions to view portfolio payoff</p>
      </div>
    );
  }

  // Capital used:
  // - Buy uses cash = size * entryPrice
  // - Short uses collateral ~= size * (1 - entryPrice)
  const capitalUsed = useMemo(() => {
    return legs.reduce((sum, leg) => {
      const entry = clamp(leg.entryPrice, 0, 1);
      if (leg.side === "buy") return sum + leg.size * entry;
      return sum + leg.size * Math.max(1 - entry, 0);
    }, 0);
  }, [legs]);

  // Build curve across a single probability shock factor (0..100)
  const chartData: ChartPoint[] = useMemo(() => {
    const points: ChartPoint[] = [];

    const k = convergenceFactor(exitDays, 14);

    for (let p = 0; p <= 100; p += 5) {
      const probYes = p / 100;

      let portfolioPnL = 0;

      for (const leg of legs) {
        const entry = clamp(leg.entryPrice, 0, 1);

        if (mode === "resolution") {
          // "Hold to resolution" expected PnL:
          // Long PnL = size * (E[settlement] - entry)
          // Short PnL = size * (entry - E[settlement])
          const ev = expectedSettlementValue(leg.outcome, probYes);

          const legPnL =
            leg.side === "buy"
              ? leg.size * (ev - entry)
              : leg.size * (entry - ev);

          portfolioPnL += legPnL;
        } else {
          // "Exit (Mark-to-market)" expected PnL:
          // currentMid moves toward target price implied by probYes
          const current = clamp(leg.currentMid, 0, 1);
          const target = expectedSettlementValue(leg.outcome, probYes);

          const expectedExit = current + k * (target - current);
          const priceChange = expectedExit - current;

          const legPnL =
            leg.side === "buy"
              ? leg.size * priceChange
              : leg.size * -priceChange;

          portfolioPnL += legPnL;
        }
      }

      points.push({ probability: p, pnl: portfolioPnL });
    }

    return points;
  }, [legs, mode, exitDays]);

  const stats = useMemo(() => {
    const pnls = chartData.map((d) => d.pnl);
    const max = Math.max(...pnls);
    const min = Math.min(...pnls);

    // Rough “breakeven probability” where pnl crosses 0 (linear interp between closest points)
    let breakeven: number | null = null;
    for (let i = 1; i < chartData.length; i++) {
      const a = chartData[i - 1];
      const b = chartData[i];
      if ((a.pnl <= 0 && b.pnl >= 0) || (a.pnl >= 0 && b.pnl <= 0)) {
        const t = a.pnl === b.pnl ? 0 : (0 - a.pnl) / (b.pnl - a.pnl);
        breakeven = a.probability + t * (b.probability - a.probability);
        break;
      }
    }

    const efficiency =
      capitalUsed > 0 ? (max / capitalUsed) * 100 : 0;

    return { max, min, breakeven, efficiency };
  }, [chartData, capitalUsed]);

  const yDomain = useMemo(() => {
    const pad = 0.05 * Math.max(1, Math.abs(stats.max - stats.min));
    const lo = stats.min - pad;
    const hi = stats.max + pad;
    if (lo === hi) return [lo - 1, hi + 1];
    return [lo, hi];
  }, [stats.max, stats.min]);

  return (
    <div className="glass rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-foreground">Portfolio P&amp;L Curve</div>
          <div className="text-xs text-muted-foreground">
            X-axis is a single probability shock (0% → 100%) applied across legs
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          <button
            onClick={() => setMode("resolution")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === "resolution"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Resolution (Hold)
          </button>
          <button
            onClick={() => setMode("exit")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              mode === "exit"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Exit (MtM)
          </button>
        </div>
      </div>

      {/* Exit days slider only in Exit mode */}
      {mode === "exit" && (
        <div className="mb-4">
          <label className="block text-sm text-muted-foreground mb-2">
            Exit horizon (days): {exitDays}
          </label>
          <input
            type="range"
            min={1}
            max={120}
            value={exitDays}
            onChange={(e) => setExitDays(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Longer horizon means prices have more time to move toward the target probability.
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-64 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 12, left: 6, bottom: 0 }}>
            <CartesianGrid strokeOpacity={0.15} />
            <XAxis
              dataKey="probability"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              domain={yDomain as any}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
              labelFormatter={(label) => `Probability: ${label}%`}
              contentStyle={{
                backgroundColor: "rgba(20, 20, 30, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                color: "white",
              }}
            />
            <ReferenceLine y={0} strokeOpacity={0.35} />
            <Line
              type="monotone"
              dataKey="pnl"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Max P&amp;L</span>
          </div>
          <div className="font-mono font-bold text-primary">${stats.max.toFixed(2)}</div>
        </div>

        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground">Min P&amp;L</span>
          </div>
          <div className="font-mono font-bold text-accent">${stats.min.toFixed(2)}</div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Breakeven prob (approx)</div>
          <div className="font-mono font-bold text-foreground">
            {stats.breakeven === null ? "N/A" : `${stats.breakeven.toFixed(1)}%`}
          </div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Capital efficiency</div>
          <div className="font-mono font-bold text-foreground">
            {stats.efficiency.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground">
          {mode === "resolution" ? (
            <p className="italic">
              This is <b>expected</b> P&amp;L if you hold to resolution, assuming the YES probability is the
              x-axis value. It ignores time and interim price movement.
            </p>
          ) : (
            <p className="italic">
              This is <b>mark-to-market</b> P&amp;L if you exit after {exitDays} days, assuming prices
              move toward the x-axis probability using a simple convergence (half-life) model.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
