"use client";

import { Target, Hash, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Market, PortfolioLeg } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";

interface TradeTicketProps {
  market: Market | null;
  onAddToPortfolio: (leg: Omit<PortfolioLeg, "id">) => void;
  onTradeChange?: (size: number, direction: "buy" | "sell") => void;
}

export default function TradeTicket({ market, onAddToPortfolio, onTradeChange }: TradeTicketProps) {
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [inputMode, setInputMode] = useState<"shares" | "usdc">("shares");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [size, setSize] = useState<string>("");
  const [limitPrice, setLimitPrice] = useState<string>("");

  if (!market) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Select a market to trade</p>
      </div>
    );
  }

  const currentPrice = outcome === "yes" ? market.yesPrice : market.noPrice;
  const entryPrice =
    orderType === "limit" && limitPrice ? parseFloat(limitPrice) : currentPrice;

  const sizeInput = parseFloat(size) || 0;

  // SELL is treated as a SHORT (not "closing"), since we do not track inventory here.
  // Short max loss per share is (1 - entryPrice), and collateral posted approximates that.
  const collateralPerShare = Math.max(1 - entryPrice, 0);

  const shares = useMemo(() => {
    if (inputMode === "shares") return sizeInput;

    // inputMode === "usdc"
    if (direction === "buy") {
      // USDC sizing -> shares = USDC / entryPrice
      if (entryPrice <= 0) return 0;
      return sizeInput / entryPrice;
    }

    // direction === "sell" (short): USDC sizing -> shares = USDC / collateralPerShare
    if (collateralPerShare <= 0) return 0;
    return sizeInput / collateralPerShare;
  }, [inputMode, sizeInput, direction, entryPrice, collateralPerShare]);

  const sizeNum = shares;

  useEffect(() => {
    if (onTradeChange) onTradeChange(sizeNum, direction);
  }, [sizeNum, direction, onTradeChange]);

  // Costs / proceeds
  const cashPaid = sizeNum * entryPrice; // buy cost
  const collateralPosted = sizeNum * collateralPerShare; // short collateral estimate
  const estCost = direction === "buy" ? cashPaid : collateralPosted;
  const estProceeds = sizeNum * entryPrice; // short sale proceeds (not profit)

  // Resolution risk bounds (per share)
  const maxGainPerShare = direction === "buy" ? 1 - entryPrice : entryPrice;
  const maxLossPerShare = direction === "buy" ? entryPrice : 1 - entryPrice;

  const maxGain = sizeNum * maxGainPerShare;
  const maxLoss = sizeNum * maxLossPerShare;

  // For binary tokens, "breakeven" at resolution is basically entry probability/price.
  const breakeven = entryPrice;

  // ROI shown as "max gain / capital used"
  const roi = estCost > 0 ? (maxGain / estCost) * 100 : 0;

  const handleAddToPortfolio = () => {
    if (sizeNum > 0 && entryPrice > 0) {
      onAddToPortfolio({
        marketId: market.id,
        marketTitle: market.title,
        side: direction,
        outcome,
        size: sizeNum,
        entryPrice,
        currentMid: currentPrice,
      });

      setSize("");
      setLimitPrice("");
    }
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Trade Ticket</h3>
        <span className="text-xs px-2 py-1 bg-secondary/50 rounded text-muted-foreground truncate max-w-[120px]">
          {market.title}
        </span>
      </div>

      {/* Direction Toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setDirection("buy")}
          className={`py-2 px-3 rounded-lg font-medium transition-colors ${
            direction === "buy"
              ? "bg-primary/20 text-primary border border-primary/50"
              : "bg-secondary/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setDirection("sell")}
          className={`py-2 px-3 rounded-lg font-medium transition-colors ${
            direction === "sell"
              ? "bg-accent/20 text-accent border border-accent/50"
              : "bg-secondary/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          Sell (Short)
        </button>
      </div>

      {/* Outcome Toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setOutcome("yes")}
          className={`py-2 px-3 rounded-lg font-medium transition-colors ${
            outcome === "yes"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "bg-secondary/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          YES @ ${market.yesPrice.toFixed(4).replace(/\.?0+$/, "")}
        </button>
        <button
          onClick={() => setOutcome("no")}
          className={`py-2 px-3 rounded-lg font-medium transition-colors ${
            outcome === "no"
              ? "bg-accent/10 text-accent border border-accent/30"
              : "bg-secondary/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          NO @ ${market.noPrice.toFixed(4).replace(/\.?0+$/, "")}
        </button>
      </div>

      {/* Input Mode & Order Type */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          <button
            onClick={() => setInputMode("shares")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              inputMode === "shares"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="w-3 h-3 inline mr-1" />
            Shares
          </button>
          <button
            onClick={() => setInputMode("usdc")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              inputMode === "usdc"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="w-3 h-3 inline mr-1" />
            USDC
          </button>
        </div>

        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          <button
            onClick={() => setOrderType("market")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              orderType === "market"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType("limit")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              orderType === "limit"
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Size Input */}
      <div className="mb-2">
        <label className="block text-xs text-muted-foreground mb-1">
          Size ({inputMode === "shares" ? "shares" : "USDC"})
        </label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2 bg-input border border-border/50 rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Derived shares when sizing by USDC */}
      {inputMode === "usdc" && (
        <div className="mb-4 text-xs text-muted-foreground">
          Est. Shares: <span className="font-mono text-foreground">{sizeNum.toFixed(2)}</span>
          {direction === "sell" && (
            <span className="ml-2">
              (Collateral/share: <span className="font-mono text-foreground">{collateralPerShare.toFixed(2)}</span>)
            </span>
          )}
        </div>
      )}

      {/* Limit Price Input */}
      {orderType === "limit" && (
        <div className="mb-4">
          <label className="block text-xs text-muted-foreground mb-1">Limit Price</label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={currentPrice.toFixed(2)}
            step="0.01"
            min="0"
            max="1"
            className="w-full px-3 py-2 bg-input border border-border/50 rounded-lg text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      {/* Trade Outputs */}
      <div className="bg-secondary/30 rounded-lg p-3 mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entry Price</span>
          <span className="font-mono text-foreground">${entryPrice.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {direction === "buy" ? "Est. Cost" : "Collateral"}
          </span>
          <span className="font-mono text-foreground">${estCost.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {direction === "buy" ? "Est. Payout (if correct)" : "Proceeds (short sale)"}
          </span>
          <span className="font-mono text-foreground">
            ${direction === "buy" ? (sizeNum * 1).toFixed(2) : estProceeds.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Risk/Reward Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">Max Gain</span>
          </div>
          <div className="font-mono font-bold text-primary">${maxGain.toFixed(2)}</div>
        </div>

        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-accent" />
            <span className="text-xs text-muted-foreground">Max Loss</span>
          </div>
          <div className="font-mono font-bold text-accent">${maxLoss.toFixed(2)}</div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Breakeven (price)</div>
          <div className="font-mono font-bold text-foreground">${breakeven.toFixed(2)}</div>
        </div>

        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">ROI (max)</div>
          <div className="font-mono font-bold text-foreground">{roi.toFixed(1)}%</div>
        </div>
      </div>

      {/* Add to Portfolio Button */}
      <button
        onClick={handleAddToPortfolio}
        disabled={sizeNum <= 0 || entryPrice <= 0}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          direction === "buy"
            ? "bg-primary text-background hover:bg-primary/90"
            : "bg-accent text-background hover:bg-accent/90"
        }`}
      >
        Add to Portfolio
      </button>
    </div>
  );
}
