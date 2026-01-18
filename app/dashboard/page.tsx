"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header";
import DomainSwitcher from "@/components/domain-switcher";
import TerminalTabs from "@/components/terminal-tabs";
import MarketPanel from "@/components/market-panel";
import TradeTicket from "@/components/trade-ticket";
import OrderbookLadder from "@/components/orderbook-ladder";
import NewsPanel from "@/components/news-panel";
import PortfolioTable from "@/components/portfolio-table";
import PortfolioPayoffChart from "@/components/portfolio-payoff-chart";
import ScenarioModeling from "@/components/scenario-modeling";
import TradeMemoBuilder from "@/components/trade-memo-builder";
import CopilotPanel from "@/components/copilot-panel";
import { Domain, Market, Article, PortfolioLeg, Thesis } from "@/lib/types";

type TerminalTab = "position" | "portfolio" | "scenarios" | "memo";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const marketIdFromQuery = searchParams.get("marketId");

  const [activeDomain, setActiveDomain] = useState<Domain>("markets");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [availableMarkets, setAvailableMarkets] = useState<Market[]>([]);
  // Track which markets have already had prices fetched - never fetch again
  const pricesFetchedRef = useRef<Set<string>>(new Set());
  // PERMANENT price cache - stores prices by market ID, never gets cleared
  // This is the source of truth for prices - once set, never changes
  const priceCacheRef = useRef<
    Map<string, { yesPrice: number; noPrice: number; probability: number }>
  >(new Map());

  // CRITICAL: Wrapper function that ALWAYS preserves prices from cache
  // NEVER call setSelectedMarket directly - always use this wrapper
  const setSelectedMarketSafe = useCallback(
    (market: Market | null | ((prev: Market | null) => Market | null)) => {
      setSelectedMarket((prev) => {
        if (market === null) return null;

        const marketToSet = typeof market === "function" ? market(prev) : market;

        if (!marketToSet) return null;

        // ALWAYS check cache first - cache is the source of truth
        const cached = priceCacheRef.current.get(marketToSet.id);

        if (cached && cached.yesPrice > 0) {
          // Cache has valid prices - ALWAYS use them, ignore incoming prices
          return { ...marketToSet, ...cached };
        }

        if (marketToSet.yesPrice > 0) {
          // No cache, but incoming market has valid prices - store in cache and use
          priceCacheRef.current.set(marketToSet.id, {
            yesPrice: marketToSet.yesPrice,
            noPrice: marketToSet.noPrice,
            probability: marketToSet.probability,
          });
          return marketToSet;
        }

        // Incoming market has no prices - just set it (will fetch prices later)
        return marketToSet;
      });
    },
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(-1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [compressionMetrics, setCompressionMetrics] = useState<{
    tokensBefore: number;
    tokensAfter: number;
    saved: number;
  } | null>(null);
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [activeTab, setActiveTab] = useState<TerminalTab>("position");
  const [portfolioLegs, setPortfolioLegs] = useState<PortfolioLeg[]>([]);
  const [tradeDirection, setTradeDirection] = useState<"buy" | "sell">("buy");
  const [tradeSize, setTradeSize] = useState(0);

  // Fetch markets when domain changes
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch(`/api/markets?limit=250&fetchPrices=false`);
        if (!res.ok) throw new Error("Failed to load markets");
        const data = await res.json();
        const newMarkets: Market[] = data.markets || [];

        // Preserve existing non-zero prices when updating markets
        // This prevents prices from being reset to 0 when markets are re-fetched
        setAvailableMarkets((prevMarkets) => {
          const priceMap = new Map(
            prevMarkets.map((m) => [m.id, { yesPrice: m.yesPrice, noPrice: m.noPrice }])
          );
          return newMarkets.map((newMarket) => {
            const existing = priceMap.get(newMarket.id);
            // Preserve existing non-zero prices
            if (existing && existing.yesPrice > 0) {
              return {
                ...newMarket,
                yesPrice: existing.yesPrice,
                noPrice: existing.noPrice,
                probability: Math.round(existing.yesPrice * 100),
              };
            }
            return newMarket;
          });
        });

        if (newMarkets.length > 0) {
          const match = marketIdFromQuery
            ? newMarkets.find((market) => market.id === marketIdFromQuery)
            : null;
          setSelectedMarketSafe(match ?? newMarkets[0]);
        }
      } catch (error) {
        console.error("Error fetching markets:", error);
        // Don't reset markets on error - preserve existing state
      }
    };

    setSelectedMarketSafe(null);
    setArticles([]);
    setCompressionMetrics(null);
    setThesis(null);
    setPortfolioLegs([]);
    // Clear price fetch tracking when domain changes
    pricesFetchedRef.current.clear();
    fetchMarkets();
  }, [activeDomain, marketIdFromQuery, setSelectedMarketSafe]);

  // Set default market when markets are loaded
  // CRITICAL: Always restore prices from cache before setting selectedMarket
  useEffect(() => {
    if (availableMarkets.length === 0) return;

    if (marketIdFromQuery) {
      const match = availableMarkets.find((market) => market.id === marketIdFromQuery);
      if (match) {
        setSelectedMarketSafe(match);
        return;
      }
    }

    if (!selectedMarket) {
      setSelectedMarketSafe(availableMarkets[0]);
      return;
    }

    // CRITICAL: Always restore prices from cache if they exist
    const cached = priceCacheRef.current.get(selectedMarket.id);
    if (cached && cached.yesPrice > 0) {
      // Only update if current prices are wrong
      if (selectedMarket.yesPrice === 0 || selectedMarket.yesPrice !== cached.yesPrice) {
        setSelectedMarketSafe({ ...selectedMarket, ...cached });
      }
    } else if (selectedMarket.yesPrice > 0) {
      // Store existing prices in cache for future reference
      priceCacheRef.current.set(selectedMarket.id, {
        yesPrice: selectedMarket.yesPrice,
        noPrice: selectedMarket.noPrice,
        probability: selectedMarket.probability,
      });
    }
  }, [availableMarkets, selectedMarket, marketIdFromQuery, setSelectedMarketSafe]);

  // ABSOLUTE LAST RESORT: Watch for price resets and immediately restore from cache
  // This catches ANY case where prices get reset to 0/1
  useEffect(() => {
    if (selectedMarket && selectedMarket.yesPrice === 0) {
      const cached = priceCacheRef.current.get(selectedMarket.id);
      if (cached && cached.yesPrice > 0) {
        // Prices got reset - IMMEDIATELY restore from cache
        console.warn(
          `[PRICE PROTECTION] Detected price reset for market ${selectedMarket.id}, restoring from cache:`,
          cached
        );
        setSelectedMarket({ ...selectedMarket, ...cached });
      }
    }
  }, [selectedMarket]);

  // Fetch prices for selected market if missing
  useEffect(() => {
    const fetchPricesForMarket = async (market: Market) => {
      // Skip if we've already fetched prices for this market (never fetch again)
      if (pricesFetchedRef.current.has(market.id)) {
        return;
      }

      // Skip if no token IDs
      if (!market.clobTokenIds?.yes && !market.clobTokenIds?.no) {
        return;
      }

      // Only fetch prices if YES price is 0 (fallback indicator)
      // Once we have a non-zero price, we never check/update it again
      if (market.yesPrice > 0) {
        // Mark as fetched so we never check again
        pricesFetchedRef.current.add(market.id);
        return; // Already have a valid price, never check again
      }

      // Mark as being fetched now (before the API call) to prevent duplicate fetches
      pricesFetchedRef.current.add(market.id);

      try {
        const response = await fetch("/api/market-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            yesTokenId: market.clobTokenIds.yes,
            noTokenId: market.clobTokenIds.no,
          }),
        });

        if (response.ok) {
          const prices = await response.json();

          // Calculate new prices
          const newYesPrice =
            prices.yesPrice > 0
              ? prices.yesPrice
              : prices.noPrice > 0
                ? 1 - prices.noPrice
                : null;
          const newNoPrice =
            prices.noPrice > 0
              ? prices.noPrice
              : prices.yesPrice > 0
                ? 1 - prices.yesPrice
                : null;

          // Only update if we got a valid non-zero YES price
          // Preserve existing non-zero prices - never overwrite with 0
          if (newYesPrice && newYesPrice > 0) {
            // Store prices in permanent cache FIRST (before any state updates)
            const finalYesPrice = newYesPrice > 0 ? newYesPrice : 0;
            const finalNoPrice =
              newNoPrice && newNoPrice > 0
                ? newNoPrice
                : finalYesPrice > 0
                  ? 1 - finalYesPrice
                  : 0.5;
            const finalProbability = finalYesPrice > 0 ? Math.round(finalYesPrice * 100) : 50;

            priceCacheRef.current.set(market.id, {
              yesPrice: finalYesPrice,
              noPrice: finalNoPrice,
              probability: finalProbability,
            });

            // Update the market in availableMarkets
            setAvailableMarkets((prev) =>
              prev.map((m) => {
                if (m.id !== market.id) return m;
                // Use prices from cache (guaranteed to be set above)
                const cached = priceCacheRef.current.get(market.id);
                return cached ? { ...m, ...cached } : m;
              })
            );

            // Update selected market using safe wrapper
            const cached = priceCacheRef.current.get(market.id);
            if (cached) {
              setSelectedMarketSafe((prev) => {
                if (!prev || prev.id !== market.id) return prev;
                return { ...prev, ...cached };
              });
            }
          }
        }
      } catch (error) {
        console.warn("Failed to fetch prices for market:", error);
      }
    };

    if (selectedMarket) {
      fetchPricesForMarket(selectedMarket);
    }
  }, [selectedMarket, setSelectedMarketSafe]);

  const handleFetchResearch = async () => {
    if (!selectedMarket) return;

    setIsLoading(true);
    setLoadingStep(0);

    try {
      // Step 1: Fetch market data (already have it)
      setLoadingStep(1);

      // Step 2: Fetch news articles
      const newsResponse = await fetch("/api/fetch-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: selectedMarket.title,
          domain: activeDomain,
          limit: 30,
        }),
      });

      if (!newsResponse.ok) {
        throw new Error("Failed to fetch news");
      }

      const newsData = await newsResponse.json();
      setArticles(newsData.articles || []);
      setLoadingStep(2);

      // Step 3: Compress articles
      const articleTexts = (newsData.articles || [])
        .map((a: any) => `${a.title}${a.description ? `. ${a.description}` : ""}`)
        .join("\n\n");

      if (articleTexts) {
        const compressResponse = await fetch("/api/compress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: articleTexts,
            aggressiveness: 0.7,
          }),
        });

        if (compressResponse.ok) {
          const compressData = await compressResponse.json();
          // Store compression metrics
          setCompressionMetrics({
            tokensBefore: compressData.tokensBefore || 0,
            tokensAfter: compressData.tokensAfter || 0,
            saved: compressData.saved || 0,
          });
          // Mark articles as compressed
          setArticles((prev) => prev.map((a) => ({ ...a, compressed: true })));
        }
      }

      setLoadingStep(3);

      // Step 4: Research pipeline complete - thesis is generated on-demand
      setLoadingStep(4);
    } catch (error) {
      console.error("Error fetching research:", error);
      // On error, still show what we have
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateThesis = async () => {
    if (!selectedMarket || articles.length === 0) return;

    // Store current market prices before API call to preserve them on error
    const currentMarketPrices = {
      id: selectedMarket.id,
      yesPrice: selectedMarket.yesPrice,
      noPrice: selectedMarket.noPrice,
    };

    try {
      const compressedTexts = articles.map((a) => a.title);

      const response = await fetch("/api/generate-thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: selectedMarket,
          compressedArticles: compressedTexts,
          domain: activeDomain,
        }),
      });

      if (response.ok) {
        const thesisData = await response.json();

        // CRITICAL: Store prices in cache BEFORE setting thesis (permanent storage)
        if (currentMarketPrices.yesPrice > 0) {
          priceCacheRef.current.set(currentMarketPrices.id, {
            yesPrice: currentMarketPrices.yesPrice,
            noPrice: currentMarketPrices.noPrice,
            probability: Math.round(currentMarketPrices.yesPrice * 100),
          });
        }

        // CRITICAL: Restore prices from cache BEFORE setting thesis
        const cachedPrices = priceCacheRef.current.get(currentMarketPrices.id);
        if (cachedPrices && cachedPrices.yesPrice > 0) {
          setSelectedMarket((prev) => {
            if (!prev || prev.id !== currentMarketPrices.id) return prev;
            return { ...prev, ...cachedPrices };
          });
        }

        setThesis(thesisData);

        // CRITICAL: Restore prices from cache AFTER setting thesis (guaranteed restore)
        setTimeout(() => {
          const cached = priceCacheRef.current.get(currentMarketPrices.id);
          if (cached && cached.yesPrice > 0) {
            setSelectedMarketSafe((prev) => {
              if (!prev || prev.id !== currentMarketPrices.id) return prev;
              // Force restore from cache - never trust state if cache has valid price
              if (prev.yesPrice === 0 || prev.yesPrice !== cached.yesPrice) {
                return { ...prev, ...cached };
              }
              return prev;
            });
          }
        }, 0); // Use 0ms to run immediately after current render
      } else {
        // Log error details for debugging
        const errorText = await response.text();
        console.error("Thesis generation failed:", response.status, errorText);

        // Preserve market prices before showing alert (in case alert triggers re-render)
        if (currentMarketPrices.yesPrice > 0) {
          setSelectedMarketSafe((prev) =>
            prev
              ? {
                  ...prev,
                  yesPrice: currentMarketPrices.yesPrice,
                  noPrice: currentMarketPrices.noPrice,
                  probability: Math.round(currentMarketPrices.yesPrice * 100),
                }
              : prev
          );
        }

        alert(`Failed to generate thesis: ${response.status}\n${errorText}`);
      }
    } catch (error) {
      console.error("Error generating thesis:", error);

      // Preserve market prices before showing alert (in case alert triggers re-render)
      if (currentMarketPrices.yesPrice > 0) {
        setSelectedMarketSafe((prev) =>
          prev
            ? {
                ...prev,
                yesPrice: currentMarketPrices.yesPrice,
                noPrice: currentMarketPrices.noPrice,
                probability: Math.round(currentMarketPrices.yesPrice * 100),
              }
            : prev
        );
      }

      alert(`Error generating thesis: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAddToPortfolio = (leg: Omit<PortfolioLeg, "id">) => {
    const newLeg: PortfolioLeg = {
      ...leg,
      id: `leg-${Date.now()}-${Math.random()}`,
    };
    setPortfolioLegs([...portfolioLegs, newLeg]);
  };

  const handleDuplicateLeg = (leg: PortfolioLeg) => {
    const newLeg: PortfolioLeg = {
      ...leg,
      id: `leg-${Date.now()}-${Math.random()}`,
    };
    setPortfolioLegs([...portfolioLegs, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    setPortfolioLegs(portfolioLegs.filter((leg) => leg.id !== id));
  };

  const handleClearAll = () => {
    setPortfolioLegs([]);
  };

  // Update trade size from trade ticket
  useEffect(() => {
    // This will be updated when trade ticket changes
  }, []);

  return (
    <main className="min-h-screen bg-background grid-pattern">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <DomainSwitcher activeDomain={activeDomain} onDomainChange={setActiveDomain} />

        <TerminalTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-3 space-y-4">
            <MarketPanel
              domain={activeDomain}
              selectedMarket={selectedMarket}
              availableMarkets={availableMarkets}
              onMarketSelect={setSelectedMarketSafe}
              onFetchResearch={handleFetchResearch}
              isLoading={isLoading}
            />
            {activeTab === "position" && selectedMarket && (
              <TradeTicket
                market={selectedMarket}
                onAddToPortfolio={handleAddToPortfolio}
                onTradeChange={(size, direction) => {
                  setTradeSize(size);
                  setTradeDirection(direction);
                }}
              />
            )}
          </div>

          {/* Middle Column */}
          <div className="lg:col-span-5 space-y-4">
            {activeTab === "position" && (
              <>
                {selectedMarket && (
                  <OrderbookLadder
                    market={selectedMarket}
                    tradeSize={tradeSize}
                    tradeSide={tradeDirection}
                  />
                )}
                <NewsPanel
                  domain={activeDomain}
                  articles={articles}
                  compressionMetrics={compressionMetrics}
                  loadingStep={loadingStep}
                  onGenerateThesis={handleGenerateThesis}
                />
              </>
            )}
            {activeTab === "portfolio" && (
              <>
                <PortfolioTable
                  legs={portfolioLegs}
                  onDuplicate={handleDuplicateLeg}
                  onRemove={handleRemoveLeg}
                  onClearAll={handleClearAll}
                />
                <PortfolioPayoffChart legs={portfolioLegs} />
              </>
            )}
            {activeTab === "scenarios" && (
              <ScenarioModeling
                legs={portfolioLegs}
                resolutionDate={selectedMarket?.resolution}
              />
            )}
            {activeTab === "memo" && <TradeMemoBuilder legs={portfolioLegs} />}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4">
            <CopilotPanel domain={activeDomain} thesis={thesis} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </main>
  );
}

