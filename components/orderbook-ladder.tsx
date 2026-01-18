"use client";

import { BarChart3, Zap, AlertTriangle } from "lucide-react";
import { OrderbookLevel } from "@/lib/types";
import { generateOrderbook, calculateSlippage } from "@/lib/orderbook-data";
import { Market } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

interface OrderbookLadderProps {
  market: Market | null;
  tradeSize: number;
  tradeSide: "buy" | "sell";
}

export default function OrderbookLadder({
  market,
  tradeSize,
  tradeSide,
}: OrderbookLadderProps) {
  const [orderbook, setOrderbook] = useState<OrderbookLevel[]>([]);
  const [midPrice, setMidPrice] = useState(0);
  const [slippage, setSlippage] = useState<{
    avgFillPrice: number;
    slippagePercent: number;
    slippageCost: number;
  } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const marketId = market?.id;
  const yesTokenId = market?.clobTokenIds?.yes;
  const baseMid = market?.yesPrice || 0.5;

  useEffect(() => {
    if (!marketId) return;

    let cancelled = false;
    let reconnectDelay = 500;

    const fallback = generateOrderbook(baseMid);
    setOrderbook(fallback);
    setMidPrice(baseMid);

    const connect = () => {
      if (cancelled) return;
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${protocol}://${window.location.host}/ws/orderbook?marketId=${encodeURIComponent(
        marketId
      )}&midPrice=${encodeURIComponent(baseMid.toString())}&tokenId=${encodeURIComponent(
        yesTokenId ?? ""
      )}`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectDelay = 500;
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as
            | { type: "snapshot"; midPrice: number; levels: OrderbookLevel[] }
            | { type: "update"; midPrice: number; levels: OrderbookLevel[] };

          if (!payload?.levels?.length) return;
          setOrderbook(payload.levels);
          setMidPrice(payload.midPrice);
        } catch {
          // Ignore malformed messages.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        reconnectDelay = Math.min(reconnectDelay * 1.5, 5000);
        reconnectTimerRef.current = window.setTimeout(connect, reconnectDelay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    socketRef.current?.close();
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [marketId, baseMid, yesTokenId]);

  const slippageMid = useMemo(() => {
    if (midPrice > 0) return midPrice;
    return market?.yesPrice || 0.5;
  }, [midPrice, market]);

  useEffect(() => {
    if (!market || orderbook.length === 0 || tradeSize <= 0) {
      setSlippage(null);
      return;
    }

    const slip = calculateSlippage(orderbook, tradeSize, tradeSide, slippageMid);
    setSlippage(slip);
  }, [market, orderbook, tradeSize, tradeSide, slippageMid]);

  if (!market) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Select a market to view orderbook</p>
      </div>
    );
  }

  const displayMid = midPrice || market.yesPrice;
  const formatPrice = (price: number) => (price < 0.1 ? price.toFixed(4) : price.toFixed(2));
  const asks = orderbook.filter((l) => l.type === "ask").reverse();
  const bids = orderbook.filter((l) => l.type === "bid");
  const maxCumulative = Math.max(
    ...orderbook.map((l) => l.cumulative),
    1
  );

  const highSlippage = slippage && Math.abs(slippage.slippagePercent) > 2;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Orderbook & Slippage</h3>
        </div>
        {slippage && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              highSlippage
                ? "bg-accent/20 text-accent border border-accent/30"
                : "bg-primary/20 text-primary border border-primary/30"
            }`}
          >
            {slippage.slippagePercent > 0 ? "+" : ""}
            {slippage.slippagePercent.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Slippage Stats */}
      {slippage && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Avg Fill</div>
            <div className="font-mono font-semibold text-foreground">
              ${slippage.avgFillPrice.toFixed(2)}
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Slippage</div>
            <div
              className={`font-mono font-semibold ${
                slippage.slippagePercent > 0 ? "text-accent" : "text-primary"
              }`}
            >
              {slippage.slippagePercent > 0 ? "+" : ""}
              {slippage.slippagePercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Cost</div>
            <div
              className={`font-mono font-semibold ${
                slippage.slippageCost > 0 ? "text-accent" : "text-primary"
              }`}
            >
              {slippage.slippageCost > 0 ? "+" : ""}${Math.abs(slippage.slippageCost).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* High Slippage Warning */}
      {highSlippage && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent" />
          <span className="text-sm text-accent">
            High slippage detected. Consider using limit orders or reducing size.
          </span>
        </div>
      )}

      {/* Orderbook Visualization */}
      <div className="max-h-[280px] overflow-y-auto space-y-0.5">
        {/* Asks (reversed) */}
        {asks.map((level, idx) => {
          const widthPercent = (level.cumulative / maxCumulative) * 100;
          return (
            <div key={`ask-${idx}`} className="relative flex items-center h-8 text-sm">
              <div
                className="absolute right-0 h-full bg-accent/20"
                style={{ width: `${widthPercent}%` }}
              />
              <div className="relative z-10 flex items-center justify-between w-full px-2">
                <span className="font-mono text-accent">{formatPrice(level.price)}</span>
                <span className="font-mono text-muted-foreground">{level.size.toLocaleString()}</span>
                <span className="font-mono text-muted-foreground">
                  {level.cumulative.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}

        {/* Mid Price Divider */}
        <div className="bg-primary/10 border-y border-primary/30 py-2 my-1 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-mono font-bold text-primary">${formatPrice(displayMid)}</span>
        </div>

        {/* Bids */}
        {bids.map((level, idx) => {
          const widthPercent = (level.cumulative / maxCumulative) * 100;
          return (
            <div key={`bid-${idx}`} className="relative flex items-center h-8 text-sm">
              <div
                className="absolute left-0 h-full bg-primary/20"
                style={{ width: `${widthPercent}%` }}
              />
              <div className="relative z-10 flex items-center justify-between w-full px-2">
                <span className="font-mono text-primary">{formatPrice(level.price)}</span>
                <span className="font-mono text-muted-foreground">{level.size.toLocaleString()}</span>
                <span className="font-mono text-muted-foreground">
                  {level.cumulative.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between px-2 mt-2 text-xs text-muted-foreground border-t border-border/30 pt-2">
        <span>Price</span>
        <span>Size</span>
        <span>Cumulative</span>
      </div>
    </div>
  );
}
