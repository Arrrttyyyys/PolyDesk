"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PriceHistoryPoint } from "@/lib/types";

interface ProbabilityChartProps {
  marketId: string;
}

// Generate mock 30-day price history
function generateMockHistory(marketId: string): PriceHistoryPoint[] {
  const data: PriceHistoryPoint[] = [];
  const baseProb = 50 + Math.random() * 20; // Random base between 50-70
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variance = (Math.random() - 0.5) * 10;
    const probability = Math.max(10, Math.min(90, baseProb + variance));
    
    data.push({
      date: date.toISOString().split("T")[0],
      probability: Math.round(probability),
    });
  }
  
  return data;
}

export default function ProbabilityChart({ marketId }: ProbabilityChartProps) {
  const data = generateMockHistory(marketId);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
            <stop offset="30%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
          tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
          axisLine={{ stroke: "oklch(0.25 0.01 240)" }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          tick={{ fill: "oklch(0.6 0 0)", fontSize: 10 }}
          axisLine={{ stroke: "oklch(0.25 0.01 240)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(20, 20, 30, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            color: "oklch(0.95 0 0)",
          }}
          labelFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }}
          formatter={(value: number) => [`${value}%`, "Probability"]}
        />
        <Area
          type="monotone"
          dataKey="probability"
          stroke="oklch(0.75 0.2 145)"
          strokeWidth={2}
          fill="url(#colorProbability)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

