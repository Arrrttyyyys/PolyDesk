"use client";

import { Search, Calendar, BarChart3, ChevronDown, Loader2 } from "lucide-react";
import { Domain, Market } from "@/lib/types";
import ProbabilityChart from "./probability-chart";
import { useEffect, useMemo, useState } from "react";

interface MarketPanelProps {
  domain: Domain;
  selectedMarket: Market | null;
  availableMarkets: Market[];
  onMarketSelect: (market: Market) => void;
  onFetchResearch: () => void;
  isLoading: boolean;
}

export default function MarketPanel({
  domain,
  selectedMarket,
  availableMarkets,
  onMarketSelect,
  onFetchResearch,
  isLoading,
}: MarketPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [remoteResults, setRemoteResults] = useState<Market[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const filteredMarkets = useMemo(() => {
    return availableMarkets.filter((market) =>
      market.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableMarkets, searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market-search?q=${encodeURIComponent(q)}&limit=50`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setRemoteResults(data.markets || []);
      } catch {
        setRemoteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [searchQuery]);

  const dropdownMarkets = searchQuery.trim().length >= 2 ? remoteResults : filteredMarkets;

  const handleMarketClick = (market: Market) => {
    onMarketSelect(market);
    setShowDropdown(false);
    setSearchQuery("");
  };

  const yesPrice = selectedMarket?.yesPrice || 0;
  const noPrice = selectedMarket?.noPrice || 0;
  const probability = selectedMarket?.probability || 0;

  // Format price to show full precision (up to 4 decimal places)
  const formatPrice = (price: number): string => {
    if (price === 0) return "0.0000";
    // Remove trailing zeros but show up to 4 decimal places
    return price.toFixed(4).replace(/\.?0+$/, "");
  };

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="glass rounded-xl p-4 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dropdownMarkets.length > 0) {
                e.preventDefault();
                handleMarketClick(dropdownMarkets[0]);
              } else if (e.key === "Escape") {
                setShowDropdown(false);
                setSearchQuery("");
              }
            }}
            onFocus={() => {
              if (dropdownMarkets.length > 0 || searchQuery.trim().length >= 2) {
                setShowDropdown(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder={`Search ${domain} markets...`}
            className="w-full pl-10 pr-10 py-2 bg-input border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          )}
        </div>

        {/* Dropdown Results */}
        {showDropdown && dropdownMarkets.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 glass rounded-lg border border-border/50 max-h-80 overflow-y-auto z-10 shadow-xl">
            {dropdownMarkets.slice(0, 15).map((market, idx) => (
              <button
                key={market.id}
                onClick={() => handleMarketClick(market)}
                className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 ${
                  idx === 0 ? "bg-primary/5" : ""
                }`}
              >
                <div className="font-medium text-foreground">{market.title}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span>YES: ${formatPrice(market.yesPrice)}</span>
                  <span>NO: ${formatPrice(market.noPrice)}</span>
                  {market.volume !== "0" && <span className="text-primary/70">Vol: {market.volume}</span>}
                </div>
              </button>
            ))}
            {dropdownMarkets.length > 15 && (
              <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border/30">
                Showing top 15 of {dropdownMarkets.length} results
              </div>
            )}
          </div>
        )}
        {showDropdown && searchQuery.trim().length >= 2 && dropdownMarkets.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 glass rounded-lg border border-border/50 z-10 p-3 text-sm text-muted-foreground">
            {isSearching ? "Searching Polymarket…" : "No matches. Try another term."}
          </div>
        )}
      </div>

      {/* Market Card */}
      {selectedMarket ? (
        <div className="glass rounded-xl p-6 hover:border-primary/30 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex-1">
              {selectedMarket.title}
            </h3>
            <button className="text-muted-foreground hover:text-foreground">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Price Display */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">YES</div>
              <div className="text-2xl font-mono font-bold text-primary">
                ${formatPrice(yesPrice)}
              </div>
            </div>
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">NO</div>
              <div className="text-2xl font-mono font-bold text-accent">
                ${formatPrice(noPrice)}
              </div>
            </div>
          </div>

          {/* Implied Probability */}
          <div className="text-center mb-4">
            <div className="text-5xl font-mono font-bold text-primary text-glow-green">
              {probability > 0 && probability < 1 ? "<1%" : `${probability}%`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Implied Probability</div>
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{selectedMarket.resolution}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>{selectedMarket.volume}</span>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="h-32 mb-4">
            <ProbabilityChart marketId={selectedMarket.id} />
          </div>

          {/* Fetch Research Button */}
          <button
            onClick={onFetchResearch}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary text-background font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              "Fetch Research"
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
