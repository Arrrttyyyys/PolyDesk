"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { PriceHistoryPoint } from "@/lib/types";

interface ProbabilityChartProps {
  marketId: string;
}

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSeededHistory(marketId: string): PriceHistoryPoint[] {
  const rand = seededRandom(marketId);
  const data: PriceHistoryPoint[] = [];

  const base = 40 + rand() * 40; // 40..80
  let level = base;

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // mean-reverting wiggle
    const shock = (rand() - 0.5) * 6;
    level = 0.85 * level + 0.15 * base + shock;

    const probability = Math.max(5, Math.min(95, level));

    data.push({
      date: date.toISOString().split("T")[0],
      probability: Math.round(probability),
    });
  }

  return data;
}

export default function ProbabilityChart({ marketId }: ProbabilityChartProps) {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);

  const fallback = useMemo(() => generateSeededHistory(marketId), [marketId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/price-history?marketId=${encodeURIComponent(marketId)}`);
        if (!res.ok) throw new Error("no history");
        const json = await res.json();

        if (cancelled) return;

        if (Array.isArray(json?.history) && json.history.length > 0) {
          setData(json.history);
          setIsSimulated(false);
          return;
        }

        throw new Error("empty history");
      } catch {
        if (cancelled) return;
        setData(fallback);
        setIsSimulated(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [marketId, fallback]);

  const chartData = data.length ? data : fallback;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="colorProbability" x1="0" y1="0" x2="0" y2="1">
            <stop offset="30%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            const d = new Date(value);
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
            const d = new Date(value);
            return d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }}
          formatter={(value: number) => [
            `${value}%${isSimulated ? " (Simulated)" : ""}`,
            "Probability",
          ]}
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
