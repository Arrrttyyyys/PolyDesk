"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PriceHistoryPoint } from "@/types/market";

interface AreaChartProps {
  data: PriceHistoryPoint[];
  title?: string;
  color?: string;
}

export default function AreaChart({ data, title, color = "#10b981" }: AreaChartProps) {
  // Transform data for recharts
  const chartData = data.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    probability: point.probability * 100,
    timestamp: point.timestamp,
  }));

  return (
    <div className="w-full h-full">
      {title && (
        <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#12121a",
              border: "1px solid #1f2937",
              borderRadius: "8px",
              color: "#ffffff",
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Line
            type="monotone"
            dataKey="probability"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
