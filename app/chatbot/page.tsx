"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Search,
  Loader2,
  Sparkles,
  MessageSquarePlus,
  Bot,
  TrendingUp,
  Calendar,
  BarChart3,
  Zap,
  Share2,
} from "lucide-react";
import Header from "@/components/header";
import ProbabilityChart from "@/components/probability-chart";
import OrderbookLadder from "@/components/orderbook-ladder";
import type { Article, Market, Thesis } from "@/lib/types";

type SearchResult = {
  eventId: string;
  eventTitle: string;
  score: number;
  topMarket: {
    id: string;
    title: string;
    probability: number;
    volume: string;
  } | null;
  markets: Market[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  results?: SearchResult[];
  keywords?: string[];
};

const quickPrompts = [
  "Markets related to soccer",
  "AI regulation bets",
  "US election markets",
  "Crypto ETF approvals",
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SearchResult | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [compressionMetrics, setCompressionMetrics] = useState<{
    tokensBefore: number;
    tokensAfter: number;
    saved: number;
  } | null>(null);
  const [thesis, setThesis] = useState<Thesis | null>(null);
  const [insightGraph, setInsightGraph] = useState<any>(null);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setSelectedMarket(null);
    setSelectedEvent(null);
    setArticles([]);
    setCompressionMetrics(null);
    setThesis(null);
    setInsightGraph(null);
  };

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
    };
    addMessage(userMessage);
    setInput("");

    const placeholderId = `assistant-${Date.now()}`;
    addMessage({
      id: placeholderId,
      role: "assistant",
      content: "Searching Polymarket and ranking the most relevant markets...",
    });

    setIsSearching(true);
    try {
      const response = await fetch("/api/chatbot-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error("Search failed");
      }
      const data = await response.json();
      const results = (data.results || []) as SearchResult[];
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: `Found ${results.length} market clusters for "${query}".`,
                results,
                keywords: data.keywords || [],
              }
            : msg
        )
      );
      if (results.length > 0 && results[0].markets.length > 0) {
        setSelectedEvent(results[0]);
        setSelectedMarket(results[0].markets[0]);
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: "Could not complete the search. Try another query.",
              }
            : msg
        )
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleFetchResearch = async () => {
    if (!selectedMarket) return;
    setLoadingResearch(true);
    setArticles([]);
    setCompressionMetrics(null);
    setThesis(null);
    setInsightGraph(null);

    try {
      const newsResponse = await fetch("/api/fetch-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: selectedMarket.title,
          domain: "news",
          limit: 20,
        }),
      });

      if (!newsResponse.ok) throw new Error("Failed to fetch news");
      const newsData = await newsResponse.json();
      const fetchedArticles: Article[] = newsData.articles || [];
      setArticles(fetchedArticles);

      if (fetchedArticles.length > 0) {
        const combinedText = fetchedArticles
          .map((a) => `Title: ${a.title}\n${a.fullContent || a.description || ""}`)
          .join("\n\n---\n\n");

        const compressResponse = await fetch("/api/compress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: combinedText, aggressiveness: 0.7 }),
        });

        if (compressResponse.ok) {
          const compressData = await compressResponse.json();
          setCompressionMetrics({
            tokensBefore: compressData.tokensBefore || 0,
            tokensAfter: compressData.tokensAfter || 0,
            saved: compressData.saved || 0,
          });
        }
      }
    } catch (error) {
      // Ignore errors and render what we have.
    } finally {
      setLoadingResearch(false);
    }
  };

  const handleGenerateThesis = async () => {
    if (!selectedMarket || articles.length === 0) return;

    try {
      const compressedTexts = articles.map((a) => {
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
          domain: "news",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setThesis(data as Thesis);
      }
    } catch {
      // Ignore.
    }
  };

  const handleGenerateGraph = async () => {
    if (!selectedMarket || articles.length === 0) return;
    setLoadingGraph(true);

    try {
      const combinedText = articles
        .map((a) => `Title: ${a.title}\n${a.fullContent || a.description || ""}`)
        .join("\n\n---\n\n");

      const compressResponse = await fetch("/api/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combinedText, aggressiveness: 0.8 }),
      });

      let compressedContext = combinedText;
      if (compressResponse.ok) {
        const compressData = await compressResponse.json();
        compressedContext = compressData.compressed || combinedText;
      }

      const graphResponse = await fetch("/api/insight-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: selectedMarket,
          compressedContext,
        }),
      });

      if (graphResponse.ok) {
        const graphData = await graphResponse.json();
        setInsightGraph(graphData);
      }
    } catch {
      // Ignore.
    } finally {
      setLoadingGraph(false);
    }
  };

  const selectedPrice = selectedMarket?.yesPrice ?? 0;
  const selectedVolume = selectedMarket?.volume ?? "0";

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => {
        const isAssistant = message.role === "assistant";
        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isAssistant ? "items-start" : "items-end justify-end"}`}
          >
            {isAssistant && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                isAssistant
                  ? "bg-secondary/30 text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <div>{message.content}</div>
              {message.keywords && message.keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.keywords.slice(0, 8).map((k) => (
                    <span
                      key={k}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-black/20 text-muted-foreground"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
              {message.results && message.results.length > 0 && (
                <div className="mt-4 space-y-3">
                  {message.results.map((result) => (
                    <div key={result.eventId} className="bg-black/20 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        Event Cluster
                      </div>
                      <div className="font-medium text-foreground mb-2">
                        {result.eventTitle}
                      </div>
                      {result.topMarket && (
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-primary" />
                            <span>{result.topMarket.title}</span>
                          </div>
                          <div className="text-primary font-semibold">
                            {result.topMarket.probability}%
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {result.markets.slice(0, 6).map((market) => (
                          <button
                            key={market.id}
                            onClick={() => {
                              setSelectedEvent(result);
                              setSelectedMarket(market);
                              setArticles([]);
                              setCompressionMetrics(null);
                              setThesis(null);
                              setInsightGraph(null);
                            }}
                            className="text-xs px-3 py-1 rounded-full bg-secondary/40 hover:bg-secondary/60 transition-colors"
                          >
                            {market.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }),
    [messages]
  );

  return (
    <main className="min-h-screen bg-background grid-pattern">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  PolyPilot Deep Research
                </h2>
                <p className="text-sm text-muted-foreground">
                  Ask about a market theme and get structured, research-driven clusters.
                </p>
              </div>
              <button
                onClick={handleNewChat}
                className="text-xs px-3 py-2 rounded-lg bg-secondary/40 hover:bg-secondary/60 flex items-center gap-2"
              >
                <MessageSquarePlus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="glass rounded-xl p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Try a query like:
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSearch(prompt)}
                        className="text-xs px-3 py-1 rounded-full bg-secondary/40 hover:bg-secondary/60 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">{renderedMessages}</div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch(input);
                }}
                className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about markets, themes, or events..."
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching
                    </span>
                  ) : (
                    "Send"
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-muted-foreground">Selected Market</div>
                {selectedMarket && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                    {selectedMarket.probability}%
                  </span>
                )}
              </div>

              {selectedMarket ? (
                <div className="space-y-3">
                  <div className="font-medium text-foreground">{selectedMarket.title}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-secondary/30 rounded-lg p-2">
                      <div className="text-muted-foreground">YES</div>
                      <div className="font-mono font-semibold text-foreground">
                        ${selectedPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2">
                      <div className="text-muted-foreground">Volume</div>
                      <div className="font-mono font-semibold text-foreground">
                        {selectedVolume}
                      </div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2">
                      <div className="text-muted-foreground">Resolution</div>
                      <div className="font-mono font-semibold text-foreground">
                        {selectedMarket.resolution || "TBD"}
                      </div>
                    </div>
                  </div>

                  <div className="h-32">
                    <ProbabilityChart marketId={selectedMarket.id} />
                  </div>

                  <OrderbookLadder
                    market={selectedMarket}
                    tradeSize={100}
                    tradeSide="buy"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Select a market chip to see details.
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="font-medium text-foreground">Research Brief</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetchResearch}
                  disabled={!selectedMarket || loadingResearch}
                  className="flex-1 text-xs px-3 py-2 rounded bg-primary/20 text-primary border border-primary/30"
                >
                  {loadingResearch ? "Loading..." : "Fetch Research"}
                </button>
                <button
                  onClick={handleGenerateThesis}
                  disabled={!selectedMarket || articles.length === 0}
                  className="flex-1 text-xs px-3 py-2 rounded bg-secondary/40 text-foreground"
                >
                  Generate Thesis
                </button>
              </div>

              {compressionMetrics && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <div className="text-muted-foreground">Tokens Before</div>
                    <div className="font-mono font-semibold text-foreground">
                      {compressionMetrics.tokensBefore}
                    </div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2">
                    <div className="text-muted-foreground">Tokens After</div>
                    <div className="font-mono font-semibold text-foreground">
                      {compressionMetrics.tokensAfter}
                    </div>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-2">
                    <div className="text-muted-foreground">Saved</div>
                    <div className="font-mono font-semibold text-primary">
                      {compressionMetrics.saved}%
                    </div>
                  </div>
                </div>
              )}

              {articles.length > 0 && (
                <div className="space-y-2 text-xs">
                  {articles.slice(0, 5).map((article) => (
                    <div key={article.id} className="bg-secondary/30 rounded-lg p-2">
                      <div className="font-medium text-foreground">{article.title}</div>
                      <div className="text-muted-foreground">
                        {article.source} · {article.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {thesis && (
                <div className="bg-secondary/30 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="font-semibold">Thesis Summary</span>
                  </div>
                  <div className="text-foreground">{thesis.summary}</div>
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                <div className="font-medium text-foreground">Insight Graph</div>
              </div>

              <button
                onClick={handleGenerateGraph}
                disabled={!selectedMarket || articles.length === 0 || loadingGraph}
                className="w-full text-xs px-3 py-2 rounded bg-secondary/40 text-foreground"
              >
                {loadingGraph ? "Generating graph..." : "Generate Insight Graph"}
              </button>

              {insightGraph && (
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-primary" />
                    Nodes: {insightGraph.nodes?.length || 0} · Edges:{" "}
                    {insightGraph.edges?.length || 0}
                  </div>
                  <pre className="bg-black/30 rounded-lg p-2 overflow-x-auto text-[11px]">
                    {JSON.stringify(insightGraph, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {selectedEvent && (
              <div className="glass rounded-xl p-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3 h-3" />
                  {selectedEvent.eventTitle}
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3 h-3" />
                  {selectedEvent.markets.length} markets in this cluster
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

