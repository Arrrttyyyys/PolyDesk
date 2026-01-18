"use client";

import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export interface Market {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  probability: number;
}

interface MarketCardsProps {
  markets: Market[];
  onSelectMarket: (market: Market) => void;
}

export function MarketCards({ markets, onSelectMarket }: MarketCardsProps) {
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
      {markets.map((market) => (
        <button
          key={market.id}
          onClick={() => onSelectMarket(market)}
          className="group relative p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-200 text-left"
          aria-label={`Select market: ${market.question}`}
        >
          {/* Glass effect overlay */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-card/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative space-y-3">
            {/* Question */}
            <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
              {market.question}
            </h3>

            {/* Prices */}
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-1 text-xs text-green-400 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>YES</span>
                </div>
                <div className="text-lg font-bold text-green-400">
                  {market.yesPrice}¢
                </div>
              </div>
              <div className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-1 text-xs text-red-400 mb-1">
                  <TrendingDown className="w-3 h-3" />
                  <span>NO</span>
                </div>
                <div className="text-lg font-bold text-red-400">
                  {market.noPrice}¢
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>{formatVolume(market.volume)} vol</span>
              </div>
              <div className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {market.probability}%
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
