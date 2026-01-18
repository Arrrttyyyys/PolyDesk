"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [range, setRange] = useState<"1D" | "1W" | "1M">("1W");
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const dataLengthRef = useRef(0);

  const fallback = useMemo(() => generateSeededHistory(marketId), [marketId]);

  useEffect(() => {
    dataLengthRef.current = data.length;
  }, [data.length]);

  useEffect(() => {
    let cancelled = false;
    let reconnectDelay = 500;

    setData(fallback);
    setIsSimulated(true);

    const connect = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${protocol}://${window.location.host}/ws/price-history?marketId=${encodeURIComponent(
        marketId
      )}`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectDelay = 500;
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as
            | { type: "history"; history: PriceHistoryPoint[] }
            | { type: "tick"; point: PriceHistoryPoint };

          if (payload.type === "history") {
            if (Array.isArray(payload.history) && payload.history.length > 0) {
              setData(payload.history);
              setIsSimulated(false);
            }
          } else if (payload.type === "tick") {
            setData((prev) => {
              const next = [...prev, payload.point];
              return next.length > 30 ? next.slice(-30) : next;
            });
            setIsSimulated(false);
          }
        } catch {
          // Ignore malformed messages.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setIsSimulated((current) => current || dataLengthRef.current === 0);
        reconnectDelay = Math.min(reconnectDelay * 1.5, 5000);
        reconnectTimerRef.current = window.setTimeout(connect, reconnectDelay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [marketId, fallback]);

  const sourceData = data.length ? data : fallback;
  const chartData = useMemo(() => {
    const now = Date.now();
    const windowMs =
      range === "1D" ? 24 * 60 * 60 * 1000 : range === "1W" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const filtered = sourceData.filter((point) => {
      const parsed = Date.parse(point.date);
      if (!Number.isFinite(parsed)) return true;
      return now - parsed <= windowMs;
    });
    if (filtered.length > 0) return filtered;
    const fallbackCount = range === "1D" ? 12 : range === "1W" ? 14 : 30;
    return sourceData.slice(-fallbackCount);
  }, [sourceData, range]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setIsRangeOpen((prev) => !prev)}
          className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-foreground hover:bg-black/60"
        >
          {range === "1D" ? "Today" : range === "1W" ? "1 Week" : "1 Month"}
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-foreground hover:bg-black/60"
        >
          Expand
        </button>
        {isRangeOpen && (
          <div className="mt-2 w-32 rounded-lg border border-white/10 bg-black/70 p-1 shadow-lg">
            {[
              { id: "1D", label: "Today" },
              { id: "1W", label: "1 Week" },
              { id: "1M", label: "1 Month" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setRange(option.id as "1D" | "1W" | "1M");
                  setIsRangeOpen(false);
                }}
                className={`w-full rounded-md px-2 py-1 text-left hover:bg-white/10 ${
                  range === option.id ? "text-primary" : "text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
              if (range === "1D") {
                return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              }
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
              if (range === "1D") {
                return d.toLocaleString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                });
              }
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

      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative h-full w-full max-w-5xl rounded-2xl border border-white/10 bg-black/80 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {range === "1D" ? "Today" : range === "1W" ? "1 Week" : "1 Month"}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-foreground hover:bg-black/60"
              >
                Close
              </button>
            </div>
            <div className="h-[70vh] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorProbabilityExpanded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="30%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.75 0.2 145)" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const d = new Date(value);
                      if (range === "1D") {
                        return d.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                      }
                      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 12 }}
                    axisLine={{ stroke: "oklch(0.25 0.01 240)" }}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 12 }}
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
                      if (range === "1D") {
                        return d.toLocaleString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric",
                        });
                      }
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
                    fill="url(#colorProbabilityExpanded)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
