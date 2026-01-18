"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { Market } from "@/types/market";
import { formatPrice, formatUSD } from "@/lib/utils/formatting";

interface MarketCardProps {
  market: Market;
  onClick?: () => void;
}

export default function MarketCard({ market, onClick }: MarketCardProps) {
  const isUp = market.probability >= 50;

  return (
    <Card
      className="border-gray-800 bg-[#12121a] hover:bg-[#1a1a24] cursor-pointer transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-white line-clamp-2">
            {market.title}
          </h4>
          {market.closed && (
            <Badge variant="default" className="text-xs">Closed</Badge>
          )}
        </div>

        {/* Prices */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">YES</div>
            <div className={`text-lg font-bold font-mono ${isUp ? "text-emerald-400" : "text-gray-400"}`}>
              {formatPrice(market.yesPrice)}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">NO</div>
            <div className={`text-lg font-bold font-mono ${!isUp ? "text-red-400" : "text-gray-400"}`}>
              {formatPrice(market.noPrice)}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            <span>Vol: {market.volume}</span>
          </div>
          {market.resolution && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(market.resolution).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Probability indicator */}
        <div className="relative w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all ${isUp ? "bg-emerald-400" : "bg-red-400"}`}
            style={{ width: `${market.probability}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Probability</span>
          <span className={`font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {market.probability}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
