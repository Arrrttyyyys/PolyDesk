# Legend Panel Components - Usage Examples

## Basic Setup

```tsx
import { LegendPanel } from "@/components/legend";
import { useState, useEffect } from "react";

function TerminalPage() {
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [legendData, setLegendData] = useState({
    sources: [],
    graph: null,
    strategy: null,
    dossier: null,
    analysisBoard: null,
    priceHistory: [],
    orderbook: [],
  });

  return (
    <div className="flex h-screen bg-black">
      {/* Main Terminal Area */}
      <div className="flex-1">
        {/* Your main terminal content */}
      </div>

      {/* Legend Panel - Right Side */}
      <div className="w-96 min-w-[384px] max-w-[480px] border-l border-white/10">
        <LegendPanel
          selectedMarket={selectedMarket}
          sources={legendData.sources}
          graph={legendData.graph}
          strategy={legendData.strategy}
          dossier={legendData.dossier}
          analysisBoard={legendData.analysisBoard}
          priceHistory={legendData.priceHistory}
          orderbook={legendData.orderbook}
        />
      </div>
    </div>
  );
}
```

## Fetching Data for Legend Panel

```tsx
// Fetch price history
async function fetchPriceHistory(marketId: string) {
  const response = await fetch(`/api/history?market=${marketId}`);
  const data = await response.json();
  return data.priceHistory;
}

// Fetch orderbook
async function fetchOrderbook(marketId: string) {
  const response = await fetch(`/api/orderbook?market=${marketId}`);
  const data = await response.json();
  return data.orderbook;
}

// Fetch sources with AI agent
async function fetchSources(marketId: string) {
  const response = await fetch("/api/chatbot/run", {
    method: "POST",
    body: JSON.stringify({
      message: `Find news sources for market ${marketId}`,
      action: "fetch_sources",
    }),
  });
  return response.json();
}

// Generate analysis board with AI agent
async function generateAnalysis(marketId: string) {
  const response = await fetch("/api/chatbot/run", {
    method: "POST",
    body: JSON.stringify({
      message: `Analyze market ${marketId}`,
      action: "analyze_market",
    }),
  });
  return response.json();
}
```

## Using Individual Tabs

### Market Tab Only
```tsx
import { LegendMarketTab } from "@/components/legend";

<LegendMarketTab
  market={currentMarket}
  priceHistory={priceHistory}
  orderbook={orderbook}
/>
```

### Analysis Tab Only
```tsx
import { LegendAnalysisTab } from "@/components/legend";

<LegendAnalysisTab analysisBoard={analysisBoard} />
```

### Graph Tab Only
```tsx
import { LegendGraphTab } from "@/components/legend";

<LegendGraphTab graph={evidenceGraph} />
```

### Strategy Tab with Callbacks
```tsx
import { LegendStrategyTab } from "@/components/legend";
import { StrategyLeg, Trigger } from "@/lib/agent/schemas";

function handleAddLeg(leg: StrategyLeg) {
  setStrategy((prev) => ({
    ...prev,
    legs: [...prev.legs, leg],
  }));
}

function handleRemoveLeg(index: number) {
  setStrategy((prev) => ({
    ...prev,
    legs: prev.legs.filter((_, i) => i !== index),
  }));
}

function handleAddTrigger(trigger: Trigger) {
  setStrategy((prev) => ({
    ...prev,
    triggers: [...prev.triggers, trigger],
  }));
}

async function handleRunBacktest() {
  const results = await fetch("/api/backtest", {
    method: "POST",
    body: JSON.stringify({ strategy }),
  });
  const data = await results.json();
  setStrategy((prev) => ({
    ...prev,
    backtestResults: data.results,
  }));
}

<LegendStrategyTab
  strategy={strategy}
  onAddLeg={handleAddLeg}
  onRemoveLeg={handleRemoveLeg}
  onAddTrigger={handleAddTrigger}
  onRunBacktest={handleRunBacktest}
/>
```

### Sources Tab with Click Handler
```tsx
import { LegendSourcesTab } from "@/components/legend";
import { Source } from "@/lib/agent/schemas";

function handleSourceClick(source: Source) {
  // Open source in new tab or show details modal
  window.open(source.url, "_blank");
  
  // Or update state to show in detail panel
  setSelectedSource(source);
}

<LegendSourcesTab
  sources={sources}
  onSourceClick={handleSourceClick}
/>
```

## Mock Data for Development

```tsx
// Mock market
const mockMarket = {
  id: "123",
  eventId: "event-1",
  title: "Will Bitcoin reach $100k by end of 2024?",
  yesPrice: 0.65,
  noPrice: 0.35,
  volume: "2500000",
  resolution: "2024-12-31",
  probability: 0.65,
};

// Mock price history
const mockPriceHistory = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
  probability: 0.5 + Math.random() * 0.2,
}));

// Mock orderbook
const mockOrderbook = [
  { price: 0.66, size: 100, type: "ask" as const, cumulative: 100 },
  { price: 0.67, size: 150, type: "ask" as const, cumulative: 250 },
  { price: 0.64, size: 200, type: "bid" as const, cumulative: 200 },
  { price: 0.63, size: 180, type: "bid" as const, cumulative: 380 },
];

// Mock sources
const mockSources = [
  {
    url: "https://example.com/article1",
    title: "Bitcoin Analysis: Bulls Eye $100k Target",
    publisher: "CryptoNews",
    publishedAt: new Date().toISOString(),
    stance: "bullish" as const,
    sentiment: 0.75,
    evidenceSnippets: [
      "Technical indicators suggest strong momentum",
      "Institutional adoption continues to grow",
    ],
  },
];

// Mock analysis board
const mockAnalysisBoard = {
  microstructure: {
    spread: 0.02,
    depth: { bid: 5000, ask: 4500 },
    imbalance: 0.05,
    slippage: { small: 0.005, medium: 0.015, large: 0.035 },
  },
  trendRegime: {
    trend: "uptrend" as const,
    strength: 0.75,
    volatility: 0.15,
    momentum: 0.08,
  },
  relationships: [
    {
      marketId: "456",
      marketTitle: "Will ETH reach $5k?",
      correlation: 0.85,
      type: "positive" as const,
    },
  ],
  inefficiencies: [],
  recommendations: [
    {
      action: "buy" as const,
      marketId: "123",
      outcome: "yes" as const,
      rationale: "Strong momentum with institutional support",
      confidence: 0.7,
      entryPrice: 0.65,
      targetPrice: 0.80,
    },
  ],
};
```

## Responsive Layout

```tsx
// Desktop: Full width panel
<div className="hidden lg:block w-96">
  <LegendPanel {...props} />
</div>

// Mobile: Collapsible drawer
<div className="lg:hidden">
  <button onClick={() => setShowLegend(!showLegend)}>
    Toggle Legend
  </button>
  {showLegend && (
    <div className="fixed inset-0 z-50 bg-black">
      <LegendPanel {...props} />
    </div>
  )}
</div>
```

## Styling Customization

```tsx
// Custom width
<div className="w-[500px]">
  <LegendPanel {...props} />
</div>

// Custom height
<div className="h-[calc(100vh-64px)]">
  <LegendPanel {...props} />
</div>

// Custom background
<div className="bg-gradient-to-b from-black to-gray-900">
  <LegendPanel {...props} />
</div>
```

## Integration with AI Agent

```tsx
import { useChat } from "@/hooks/useChat";

function TerminalWithLegend() {
  const { sendMessage, isLoading } = useChat();
  const [legendData, setLegendData] = useState({});

  async function analyzeMarket(marketId: string) {
    const response = await sendMessage({
      message: `Analyze market ${marketId} and generate insights`,
      tools: ["analyze_market", "fetch_sources", "build_evidence_graph"],
    });

    // Extract legend data from agent response
    setLegendData({
      analysisBoard: response.analysis,
      sources: response.sources,
      graph: response.evidenceGraph,
      dossier: response.dossier,
    });
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <button onClick={() => analyzeMarket(selectedMarket.id)}>
          {isLoading ? "Analyzing..." : "Analyze Market"}
        </button>
      </div>
      <div className="w-96">
        <LegendPanel selectedMarket={selectedMarket} {...legendData} />
      </div>
    </div>
  );
}
```
