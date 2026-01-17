"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { LineChart as LineChartIcon, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";
import { PortfolioLeg } from "@/lib/types";

interface PortfolioPayoffChartProps {
  legs: PortfolioLeg[];
}

export default function PortfolioPayoffChart({ legs }: PortfolioPayoffChartProps) {
  if (legs.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Add positions to see combined payoff</p>
      </div>
    );
  }

  // Generate payoff curve data
  const generatePayoffData = () => {
    const data = [];
    for (let prob = 0; prob <= 100; prob += 5) {
      const price = prob / 100;
      let totalPnL = 0;

      legs.forEach((leg) => {
        const outcomePrice = leg.outcome === "yes" ? price : 1 - price;
        const currentValue = leg.size * outcomePrice;
        const entryValue = leg.size * leg.entryPrice;
        const pnl = leg.side === "buy" ? currentValue - entryValue : entryValue - currentValue;
        totalPnL += pnl;
      });

      data.push({ probability: prob, pnl: Math.round(totalPnL * 100) / 100 });
    }
    return data;
  };

  const data = generatePayoffData();
  const totalCost = legs.reduce((sum, leg) => sum + leg.size * leg.entryPrice, 0);
  const maxWin = Math.max(...data.map((d) => d.pnl));
  const maxLoss = Math.min(...data.map((d) => d.pnl));
  
  // Find breakeven points
  const breakevenPoints = data.filter((d) => Math.abs(d.pnl) < 1);
  const breakevenZone = breakevenPoints.length > 0
    ? `${breakevenPoints[0].probability}% - ${breakevenPoints[breakevenPoints.length - 1].probability}%`
    : "N/A";

  const capitalEfficiency = totalCost > 0 ? ((maxWin / totalCost) * 100).toFixed(1) : "0";

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LineChartIcon className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Portfolio Payoff</h3>
        </div>
        <span className="text-xs px-2 py-1 bg-secondary/50 rounded text-muted-foreground">
          Combined
        </span>
      </div>

      {/* Chart */}
      <div className="h-[200px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="probability"
              domain={[0, 100]}
              tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
              axisLine={{ stroke: "oklch(0.25 0.01 240)" }}
            />
            <YAxis
              tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
              axisLine={{ stroke: "oklch(0.25 0.01 240)" }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(20, 20, 30, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                color: "oklch(0.95 0 0)",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "PnL"]}
              labelFormatter={(value) => `Probability: ${value}%`}
            />
            <ReferenceLine y={0} stroke="oklch(0.6 0 0)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="oklch(0.75 0.2 145)"
              strokeWidth={2}
              fill="url(#colorPnL)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Net Cost</div>
          <div className="text-lg font-mono font-bold text-foreground">
            ${totalCost.toFixed(2)}
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Max Win</span>
          </div>
          <div className="text-lg font-mono font-bold text-primary">
            ${maxWin.toFixed(2)}
          </div>
        </div>
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground">Max Loss</span>
          </div>
          <div className="text-lg font-mono font-bold text-accent">
            ${maxLoss.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <Target className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Breakeven Zone</span>
          </div>
          <div className="text-sm font-mono font-semibold text-foreground">
            {breakevenZone}
          </div>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Capital Efficiency</span>
          </div>
          <div className="text-sm font-mono font-semibold text-foreground">
            {capitalEfficiency}%
          </div>
        </div>
      </div>
    </div>
  );
}

