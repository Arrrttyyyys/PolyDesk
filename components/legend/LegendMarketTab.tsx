"use client";

import { Market, OrderbookLevel, PriceHistoryPoint } from "@/lib/types";
import { TrendingUp, TrendingDown, DollarSign, Activity, Droplets, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

interface LegendMarketTabProps {
  market: Market | null;
  priceHistory?: PriceHistoryPoint[];
  orderbook?: OrderbookLevel[];
}

export function LegendMarketTab({
  market,
  priceHistory = [],
  orderbook = [],
}: LegendMarketTabProps) {
  if (!market) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a market to view details</p>
      </div>
    );
  }

  const spread = market.yesPrice && market.noPrice 
    ? Math.abs(1 - market.yesPrice - market.noPrice)
    : 0;

  const bids = orderbook.filter((l) => l.type === "bid").slice(0, 5);
  const asks = orderbook.filter((l) => l.type === "ask").slice(0, 5);

  const resolutionDate = market.resolution ? new Date(market.resolution) : null;
  const timeToResolution = resolutionDate
    ? Math.max(0, Math.floor((resolutionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const chartData = priceHistory.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    probability: point.probability * 100,
  }));

  return (
    <div className="p-4 space-y-4">
      {/* Market Title */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-2">{market.title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Market ID: {market.id.slice(0, 8)}</span>
          {market.closed && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded">CLOSED</span>
          )}
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-400">YES Price</span>
          </div>
          <div className="text-2xl font-bold text-green-500">
            ${market.yesPrice?.toFixed(2) || "—"}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-400">NO Price</span>
          </div>
          <div className="text-2xl font-bold text-red-500">
            ${market.noPrice?.toFixed(2) || "—"}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-400">Volume</span>
          </div>
          <div className="text-xl font-bold text-white">
            ${Number(market.volume).toLocaleString()}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-400">Spread</span>
          </div>
          <div className="text-xl font-bold text-white">
            {(spread * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Time to Resolution */}
      {timeToResolution !== null && (
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-400">Time to Resolution</span>
          </div>
          <div className="text-xl font-bold text-white">
            {timeToResolution} days
          </div>
        </div>
      )}

      {/* Price Chart */}
      {chartData.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="text-sm font-semibold text-white mb-3">Price History</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "10px" }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.5)"
                style={{ fontSize: "10px" }}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="probability"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Order Book */}
      {orderbook.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="text-sm font-semibold text-white mb-3">Order Book</h4>
          
          {/* Asks */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Asks (Sell Orders)</div>
            <div className="space-y-1">
              {asks.map((ask, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-xs"
                >
                  <span className="text-red-500">${ask.price.toFixed(2)}</span>
                  <span className="text-gray-400">{ask.size.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Spread Indicator */}
          <div className="h-px bg-gradient-to-r from-red-500/50 via-white/20 to-green-500/50 my-3" />

          {/* Bids */}
          <div>
            <div className="text-xs text-gray-400 mb-2">Bids (Buy Orders)</div>
            <div className="space-y-1">
              {bids.map((bid, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-xs"
                >
                  <span className="text-green-500">${bid.price.toFixed(2)}</span>
                  <span className="text-gray-400">{bid.size.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
