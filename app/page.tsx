"use client";

import { useState, useEffect } from "react";
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

export default function Home() {
  const [activeDomain, setActiveDomain] = useState<Domain>("markets");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [availableMarkets, setAvailableMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(-1);
  const [articles, setArticles] = useState<Article[]>([]);
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [activeTab, setActiveTab] = useState<TerminalTab>("position");
  const [portfolioLegs, setPortfolioLegs] = useState<PortfolioLeg[]>([]);
  const [tradeDirection, setTradeDirection] = useState<"buy" | "sell">("buy");
  const [tradeSize, setTradeSize] = useState(0);

  // Fetch markets when domain changes
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch(`/api/markets?limit=250`);
        if (!res.ok) throw new Error("Failed to load markets");
        const data = await res.json();
        const markets: Market[] = data.markets || [];
        setAvailableMarkets(markets);

        // Set first market as selected if none selected
        if (markets.length > 0 && !selectedMarket) {
          setSelectedMarket(markets[0]);
        }
      } catch (error) {
        console.error("Error fetching markets:", error);
        // Fallback to empty array on error
        setAvailableMarkets([]);
      }
    };

    fetchMarkets();
    setSelectedMarket(null);
    setArticles([]);
    setThesis(null);
    setPortfolioLegs([]);
  }, [activeDomain]);

  // Set default market when markets are loaded
  useEffect(() => {
    if (availableMarkets.length > 0 && !selectedMarket) {
      setSelectedMarket(availableMarkets[0]);
    }
  }, [availableMarkets, selectedMarket]);

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
      const articleTexts = (newsData.articles || []).map((a: any) => 
        `${a.title}${a.description ? `. ${a.description}` : ""}`
      ).join("\n\n");

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
          await compressResponse.json();
          // Mark articles as compressed
          setArticles((prev) =>
            prev.map((a) => ({ ...a, compressed: true }))
          );
        }
      }

      setLoadingStep(3);

      // Step 4: Generate thesis (optional if Gemini key isn't configured yet)
      try {
        const compressedTexts = (newsData.articles || []).map((a: any) => a.title);

        const thesisResponse = await fetch("/api/generate-thesis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market: selectedMarket,
            compressedArticles: compressedTexts,
            domain: activeDomain,
          }),
        });

        if (thesisResponse.ok) {
          const thesisData = await thesisResponse.json();
          setThesis(thesisData);
        } else {
          const errText = await thesisResponse.text();
          console.warn("Thesis generation skipped/failed:", errText);
          setThesis(null);
        }
      } catch (err) {
        console.warn("Thesis generation skipped/failed:", err);
        setThesis(null);
      } finally {
        // Mark pipeline as finished so UI unlocks next actions
        setLoadingStep(4);
      }
    } catch (error) {
      console.error("Error fetching research:", error);
      // On error, still show what we have
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateThesis = async () => {
    if (!selectedMarket || articles.length === 0) return;

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
        setThesis(thesisData);
      }
    } catch (error) {
      console.error("Error generating thesis:", error);
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
              onMarketSelect={setSelectedMarket}
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
