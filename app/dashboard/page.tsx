"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  const eventIdFromQuery = searchParams.get("eventId");

  const [activeDomain, setActiveDomain] = useState<Domain>("markets");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [availableMarkets, setAvailableMarkets] = useState<Market[]>([]);
  // Track price fetch attempts to avoid hammering the API
  const priceFetchInFlightRef = useRef<Set<string>>(new Set());
  const priceFetchLastAttemptRef = useRef<Map<string, number>>(new Map());
  const noOrderbookCooldownRef = useRef<Map<string, number>>(new Map());
  const marketsFetchInFlightRef = useRef(false);
  const marketsFetchLastRef = useRef(0);
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

  const parseVolume = (value: string) => {
    const numeric = value.replace(/[^0-9.]/g, "");
    const parsed = Number(numeric);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const relatedMarkets = useMemo(() => {
    if (!selectedMarket) return [];
    
    const filtered = availableMarkets.filter((market) => {
      // Filter by same eventId
      if (market.eventId !== selectedMarket.eventId) return false;
      // Exclude the currently selected market from the list
      if (market.id === selectedMarket.id) return false;
      // Only include markets with volume > 0
      return parseVolume(market.volume) > 0;
    });
    
    const sorted = filtered.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
    
    // Debug logging
    if (selectedMarket && filtered.length === 0) {
      console.log("[RELATED] No related markets found:", {
        selectedMarketId: selectedMarket.id,
        selectedMarketEventId: selectedMarket.eventId,
        availableMarketsCount: availableMarkets.length,
        marketsWithSameEventId: availableMarkets.filter(m => m.eventId === selectedMarket.eventId).length,
        availableEventIds: [...new Set(availableMarkets.map(m => m.eventId))].slice(0, 5),
      });
    }
    
    return sorted;
  }, [availableMarkets, selectedMarket]);

  // REMOVED: Auto-selection when relatedMarkets changes
  // This was causing the first market to auto-select
  // Now user must manually select a market
  // useEffect(() => {
  //   if (!selectedMarket) return;
  //   if (relatedMarkets.length === 0) return;
  //   const exists = relatedMarkets.some((market) => market.id === selectedMarket.id);
  //   if (!exists) {
  //     setSelectedMarketSafe(relatedMarkets[0]);
  //   }
  // }, [relatedMarkets, selectedMarket, setSelectedMarketSafe]);

  // IMPORTANT: Clear selected market on initial mount if no marketIdFromQuery
  // This ensures position starts empty on page load
  useEffect(() => {
    if (!marketIdFromQuery) {
      console.log("[MOUNT] Initial mount - clearing selected market (no marketIdFromQuery)");
      setSelectedMarketSafe(null);
      setArticles([]);
      setCompressionMetrics(null);
      setThesis(null);
      setPortfolioLegs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run once on mount only

  // Fetch markets when domain changes
  useEffect(() => {
    console.log("[INIT] Domain changed or page loaded. marketIdFromQuery:", marketIdFromQuery);
    
    // IMPORTANT: Always clear selected market first, unless there's a marketIdFromQuery
    // This ensures position is empty on initial load
    if (!marketIdFromQuery) {
      console.log("[INIT] No marketIdFromQuery - clearing selected market");
      setSelectedMarketSafe(null);
      setArticles([]);
      setCompressionMetrics(null);
      setThesis(null);
      setPortfolioLegs([]);
    } else {
      console.log("[INIT] marketIdFromQuery found in URL:", marketIdFromQuery);
    }

    const fetchMarkets = async () => {
      const now = Date.now();
      if (marketsFetchInFlightRef.current || now - marketsFetchLastRef.current < 2000) {
        return;
      }
      marketsFetchInFlightRef.current = true;
      marketsFetchLastRef.current = now;

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

        // Auto-select market based on URL parameters
        if (newMarkets.length > 0) {
          // Priority 1: If marketId is specified, use that
          if (marketIdFromQuery) {
            const match = newMarkets.find((market) => market.id === marketIdFromQuery);
            if (match) {
              console.log("[INIT] Auto-selecting market from URL marketId:", marketIdFromQuery);
              setSelectedMarketSafe(match);
            } else {
              console.warn("[INIT] marketIdFromQuery not found in markets:", marketIdFromQuery);
            }
          }
          // Priority 2: If eventId is specified (from landing page event card), select first market from that event
          else if (eventIdFromQuery) {
            const eventMarkets = newMarkets.filter((market) => market.eventId === eventIdFromQuery);
            if (eventMarkets.length > 0) {
              // Select the first market with volume, or just the first one
              const marketToSelect = eventMarkets.find((m) => parseVolume(m.volume) > 0) || eventMarkets[0];
              console.log("[INIT] Auto-selecting first market from eventId:", eventIdFromQuery, "market:", marketToSelect.id);
              setSelectedMarketSafe(marketToSelect);
            } else {
              console.warn("[INIT] No markets found for eventId:", eventIdFromQuery);
            }
          } else {
            console.log("[INIT] No marketId or eventId - keeping position empty");
          }
        }
      } catch (error) {
        console.error("Error fetching markets:", error);
        // Don't reset markets on error - preserve existing state
      } finally {
        marketsFetchInFlightRef.current = false;
      }
    };

    // Clear price fetch tracking when domain changes
    priceFetchInFlightRef.current.clear();
    priceFetchLastAttemptRef.current.clear();
    fetchMarkets();
  }, [activeDomain, marketIdFromQuery, eventIdFromQuery, setSelectedMarketSafe]);

  // Handle marketIdFromQuery if present (from URL navigation)
  // CRITICAL: Always restore prices from cache before setting selectedMarket
  useEffect(() => {
    if (availableMarkets.length === 0) return;

    // Only auto-select if there's a marketIdFromQuery (from URL)
    if (marketIdFromQuery) {
      const match = availableMarkets.find((market) => market.id === marketIdFromQuery);
      if (match) {
        setSelectedMarketSafe(match);
        return;
      }
    }

    // If no selectedMarket, keep it empty (don't auto-select)
    // Only restore prices if there's already a selectedMarket
    if (!selectedMarket) {
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
      // Skip if no token IDs
      if (!market.clobTokenIds?.yes && !market.clobTokenIds?.no) {
        return;
      }

      const cooldownUntil = noOrderbookCooldownRef.current.get(market.id) ?? 0;
      if (Date.now() < cooldownUntil) {
        return;
      }

      const lastAttempt = priceFetchLastAttemptRef.current.get(market.id) ?? 0;
      if (priceFetchInFlightRef.current.has(market.id) || Date.now() - lastAttempt < 5000) {
        return;
      }

      priceFetchInFlightRef.current.add(market.id);
      priceFetchLastAttemptRef.current.set(market.id, Date.now());

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

          if (prices?.yesNoOrderbook || prices?.noNoOrderbook) {
            // Back off longer if this market has no orderbook to avoid hammering
            noOrderbookCooldownRef.current.set(market.id, Date.now() + 10 * 60 * 1000);
          }
        }
      } catch (error) {
        console.warn("Failed to fetch prices for market:", error);
      } finally {
        priceFetchInFlightRef.current.delete(market.id);
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

      // Step 3: Compress articles (using full content)
      // Compress each article individually for proper tracking
      const articlesWithContent = (newsData.articles || []).filter((a: any) => 
        a.fullContent && a.fullContent.length > 100
      );

      if (articlesWithContent.length > 0) {
        // First, get combined metrics by compressing all together
        const combinedText = articlesWithContent
          .map((a: any) => `Title: ${a.title}\n${a.fullContent}`)
          .join("\n\n---\n\n");

        const combinedCompressResponse = await fetch("/api/compress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: combinedText,
            aggressiveness: 0.7,
          }),
        });

        let totalTokensBefore = 0;
        let totalTokensAfter = 0;

        if (combinedCompressResponse.ok) {
          const combinedData = await combinedCompressResponse.json();
          totalTokensBefore = combinedData.tokensBefore || 0;
          totalTokensAfter = combinedData.tokensAfter || 0;
        }

        // Now compress each article individually for per-article compressed content
        const compressionPromises = articlesWithContent.map(async (a: any) => {
          const articleText = `Title: ${a.title}\n${a.fullContent}`;
          try {
            const individualResponse = await fetch("/api/compress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: articleText,
                aggressiveness: 0.7,
              }),
            });
            
            if (individualResponse.ok) {
              const individualData = await individualResponse.json();
              return { article: a, compressed: individualData.compressed };
            }
          } catch (err) {
            console.warn(`Failed to compress article:`, err);
          }
          // Fallback to original content if compression fails
          return { article: a, compressed: a.fullContent || a.description || a.title };
        });

        const compressedResults = await Promise.all(compressionPromises);
        
        // Calculate saved percentage
        const saved = totalTokensBefore > 0
          ? Math.round(((totalTokensBefore - totalTokensAfter) / totalTokensBefore) * 100)
          : 0;

        // Store compression metrics
        setCompressionMetrics({
          tokensBefore: totalTokensBefore,
          tokensAfter: totalTokensAfter,
          saved,
        });
        
        // Update articles with compressed content
        setArticles((prev) =>
          prev.map((a) => {
            const compressedResult = compressedResults.find((r) => r.article.id === a.id);
            return {
              ...a,
              compressed: true,
              compressedContent: compressedResult?.compressed || a.fullContent || a.description || a.title,
            };
          })
        );
      } else {
        // No full content available, just mark as processed
        setArticles((prev) =>
          prev.map((a) => ({ ...a, compressed: true }))
        );
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
      // Use compressed content if available, otherwise use full content, fallback to title
      const compressedTexts = articles.map((a) => {
        if (a.compressedContent) {
          return a.compressedContent;
        }
        if (a.fullContent && a.fullContent.length > 100) {
          return `${a.title}\n\n${a.fullContent}`;
        }
        return a.title;
      });

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

        {selectedMarket && relatedMarkets.length > 0 && (
          <div className="glass rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">All Bets in This Ticker</div>
              <div className="text-xs text-muted-foreground">
                Sorted by implied probability
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {relatedMarkets.map((market) => {
                // Find the full market object from availableMarkets to ensure we have all properties
                const fullMarket = availableMarkets.find((m) => m.id === market.id) || market;
                
                return (
                <button
                  key={market.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("[CLICK] Selecting market:", fullMarket.id, fullMarket.title);
                    console.log("[CLICK] Market object:", fullMarket);
                    try {
                      setSelectedMarketSafe(fullMarket);
                      setArticles([]);
                      setCompressionMetrics(null);
                      setThesis(null);
                      setLoadingStep(-1);
                      console.log("[CLICK] Market selection triggered");
                    } catch (error) {
                      console.error("[CLICK] Error selecting market:", error);
                    }
                  }}
                  onMouseDown={(e) => {
                    // Use onMouseDown as a fallback to catch clicks earlier
                    e.preventDefault();
                  }}
                  className={`w-full text-left py-3 flex items-center justify-between gap-4 hover:bg-secondary/30 transition-colors cursor-pointer ${
                    selectedMarket?.id === market.id ? "bg-secondary/30" : ""
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {market.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {market.volume} · {market.resolution || "Resolution TBD"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {market.probability}%
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        )}

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
