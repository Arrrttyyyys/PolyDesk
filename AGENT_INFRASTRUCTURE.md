# PolyPilot Agent Infrastructure

Complete agent tooling infrastructure for the PolyPilot Terminal. All tools are server-side only and return JSON for LLM consumption.

## 📁 Structure

```
lib/agent/
├── schemas.ts              # Zod schemas for all data types
├── index.ts                # Main export file
└── tools/
    ├── polymarket.ts       # Gamma & CLOB API tools
    ├── news.ts             # GDELT news & article extraction
    ├── compression.ts      # Token Company bear-1 compression
    ├── analytics.ts        # Market metrics & correlations
    ├── strategy.ts         # Hedge suggestions & strategy builder
    └── dossier.ts          # Trade dossier generator
```

## 📊 Schemas (lib/agent/schemas.ts)

### Core Data Types

- **MarketCard** - Simplified market representation
- **Source** - News source with extracted content
- **EvidenceGraph** - Knowledge graph (nodes + edges)
- **Strategy** - Multi-leg strategy with payoff analysis
- **TradeDossier** - Complete trade analysis package
- **AnalysisBoard** - Market microstructure & relationships

### Key Schemas

```typescript
MarketCard: {
  id, question, yesTokenId, noTokenId,
  yesPrice, noPrice, volume, liquidity,
  endDate, tags[]
}

Source: {
  url, title, publisher, publishedAt,
  extractedText, compressedText,
  stance, sentiment, evidenceSnippets[]
}

Strategy: {
  legs[], payoffCurve[], scenarioGrid[],
  triggers[], backtestResults[],
  maxRisk, expectedReturn, sharpeRatio
}

TradeDossier: {
  timelineMarkers[], thetaSignals,
  resolutionRisk, ruleToTrade, unknowns[]
}
```

## 🔧 Tools

### Polymarket Tools (lib/agent/tools/polymarket.ts)

**Gamma API:**

- `tool_listSportsLeagues()` - Get all available leagues/tags
- `tool_findMarketsByLeague({ leagueQuery, limit })` - Filter markets by league
- `tool_searchMarkets({ query, limit })` - Search with relevance scoring
- `tool_getMarketSnapshot({ marketId })` - Get single market details

**CLOB API:**

- `tool_getLivePrices({ yesTokenId, noTokenId })` - Real-time token prices
- `tool_getOrderbook({ tokenId })` - Full orderbook with features (spread, depth, imbalance, slippage)
- `tool_getPriceHistory({ tokenId, interval, fidelity })` - Historical prices

**Example:**
```typescript
const { markets } = await tool_searchMarkets({
  query: "Trump 2024",
  limit: 10
});

const { orderbook } = await tool_getOrderbook({
  tokenId: markets[0].yesTokenId
});
// Returns: { spread, depth, imbalance, slippage, levels[] }
```

### News Tools (lib/agent/tools/news.ts)

- `tool_searchNews({ query, limit, timeframeDays })` - GDELT keyless search
- `tool_extractArticle({ url })` - Cheerio-based content extraction (50k char limit)
- `tool_scoreStanceSentiment({ marketQuestion, outcomeNames, articleText })` - Heuristic sentiment analysis

**Example:**
```typescript
const { articles } = await tool_searchNews({
  query: "Trump indictment",
  limit: 5,
  timeframeDays: 7
});

const { source } = await tool_extractArticle({
  url: articles[0].url
});

const { stance, sentiment, evidenceSnippets } = await tool_scoreStanceSentiment({
  marketQuestion: "Will Trump be convicted?",
  outcomeNames: { yes: "Convicted", no: "Not convicted" },
  articleText: source.extractedText
});
```

### Compression Tool (lib/agent/tools/compression.ts)

- `tool_compressText({ text, aggressiveness })` - Token Company bear-1 API

**Aggressiveness levels:**
- 0.1-0.3: Light compression
- 0.4-0.6: Moderate (recommended)
- 0.7-0.9: Aggressive

**Example:**
```typescript
const { compressedText, compressionRatio } = await tool_compressText({
  text: source.extractedText,
  aggressiveness: 0.5
});
// Returns: compressed version + token metrics
```

### Analytics Tools (lib/agent/tools/analytics.ts)

- `tool_computeMarketMetrics({ priceHistory, orderbookFeatures })` - Volatility, momentum, drawdown, health, trend regime
- `tool_computeCorrelations({ histories })` - Correlation matrix with lead/lag detection
- `tool_detectInefficiencies({ primaryTokenId, relatedTokenIds, histories, correlations })` - Mispricing, arbitrage, momentum, mean reversion

**Example:**
```typescript
const { volatility, momentum, trendRegime, microstructure } = 
  await tool_computeMarketMetrics({
    priceHistory: history.history,
    orderbookFeatures: orderbook
  });

const { correlationMatrix } = await tool_computeCorrelations({
  histories: [
    { tokenId: market1.yesTokenId, priceHistory: history1 },
    { tokenId: market2.yesTokenId, priceHistory: history2 }
  ]
});

const { inefficiencies } = await tool_detectInefficiencies({
  primaryTokenId: market.yesTokenId,
  relatedTokenIds: [market2.yesTokenId],
  histories,
  correlations: correlationMatrix
});
```

### Strategy Tools (lib/agent/tools/strategy.ts)

- `tool_suggestHedges({ primaryMarket, candidateMarkets, correlations, stanceSignals, inefficiencies })` - Ranked hedge recommendations
- `tool_buildStrategyTemplate({ primaryMarket, hedges, style })` - Complete strategy with legs + triggers
- `tool_simulatePayoff({ legs })` - Payoff curve + scenario grid + risk metrics
- `tool_backtestTriggers({ legs, triggers, priceHistories })` - Historical backtest with PnL timeline

**Example:**
```typescript
const { hedges } = await tool_suggestHedges({
  primaryMarket: market,
  candidateMarkets: relatedMarkets,
  correlations: correlationMatrix,
  inefficiencies
});

const { strategy } = await tool_buildStrategyTemplate({
  primaryMarket: market,
  hedges: hedges.slice(0, 2),
  style: "moderate" // or "conservative" / "aggressive"
});

const { payoffCurve, scenarioGrid, maxRisk, expectedReturn } = 
  await tool_simulatePayoff({ legs: strategy.legs });

const { backtestResults, totalPnl, sharpeRatio } = 
  await tool_backtestTriggers({
    legs: strategy.legs,
    triggers: strategy.triggers,
    priceHistories
  });
```

### Dossier Tool (lib/agent/tools/dossier.ts)

- `tool_generateTradeDossier({ market, compressedEvidenceBundle, sources })` - Complete trade analysis

**Generates:**
- Timeline markers from news sources
- Theta signals (time decay analysis)
- Resolution risk assessment
- Rule-to-trade implications
- Unknown factors
- Overall confidence score

**Example:**
```typescript
const { dossier } = await tool_generateTradeDossier({
  market,
  compressedEvidenceBundle: compressedEvidence,
  sources: newsArticles
});

// Returns: {
//   timelineMarkers: [{ date, event, impact, direction }],
//   thetaSignals: { daysToResolution, decayRate, optimalEntry/Exit },
//   resolutionRisk: { clarity, ambiguityRisk, precedents, criteriaCheck },
//   ruleToTrade: { rule, implications, edgeCases },
//   unknowns: [...],
//   confidence: 0.75
// }
```

## 🔐 Environment Variables

Required in `.env.local`:

```bash
# Token Company (compression)
TOKEN_COMPANY_API_KEY=your_api_key_here
TOKEN_COMPANY_API_URL=https://api.thetokencompany.com/v1

# Optional - only if using Google News instead of GDELT
GOOGLE_NEWS_API_KEY=your_key
GOOGLE_NEWS_CX=your_cx
```

## 🚀 Usage Patterns

### 1. Market Discovery & Analysis

```typescript
// Find markets
const { markets } = await tool_searchMarkets({ query: "election", limit: 10 });
const market = markets[0];

// Get live data
const { yesPrice, noPrice } = await tool_getLivePrices({
  yesTokenId: market.yesTokenId,
  noTokenId: market.noTokenId
});

// Get orderbook
const { orderbook } = await tool_getOrderbook({ tokenId: market.yesTokenId });

// Get price history
const { history } = await tool_getPriceHistory({
  tokenId: market.yesTokenId,
  interval: "1h",
  fidelity: 100
});

// Compute metrics
const metrics = await tool_computeMarketMetrics({
  priceHistory: history,
  orderbookFeatures: orderbook
});
```

### 2. News Research Pipeline

```typescript
// Search news
const { articles } = await tool_searchNews({
  query: market.question,
  limit: 5,
  timeframeDays: 7
});

// Extract & analyze
const sources = [];
for (const article of articles) {
  const { source } = await tool_extractArticle({ url: article.url });
  if (source) {
    const { stance, sentiment, evidenceSnippets } = 
      await tool_scoreStanceSentiment({
        marketQuestion: market.question,
        outcomeNames: { yes: "Yes", no: "No" },
        articleText: source.extractedText
      });
    
    source.stance = stance;
    source.sentiment = sentiment;
    source.evidenceSnippets = evidenceSnippets;
    
    // Compress
    const { compressedText } = await tool_compressText({
      text: source.extractedText,
      aggressiveness: 0.5
    });
    source.compressedText = compressedText;
    
    sources.push(source);
  }
}
```

### 3. Correlation & Inefficiency Analysis

```typescript
// Get related markets
const { markets: relatedMarkets } = await tool_searchMarkets({
  query: market.tags[0], // Use tag for related markets
  limit: 20
});

// Fetch histories
const histories = await Promise.all(
  relatedMarkets.map(async (m) => ({
    tokenId: m.yesTokenId,
    priceHistory: (await tool_getPriceHistory({
      tokenId: m.yesTokenId,
      interval: "1h",
      fidelity: 100
    })).history
  }))
);

// Compute correlations
const { correlationMatrix } = await tool_computeCorrelations({ histories });

// Detect inefficiencies
const { inefficiencies } = await tool_detectInefficiencies({
  primaryTokenId: market.yesTokenId,
  relatedTokenIds: relatedMarkets.map(m => m.yesTokenId),
  histories,
  correlations: correlationMatrix
});
```

### 4. Strategy Construction

```typescript
// Suggest hedges
const { hedges } = await tool_suggestHedges({
  primaryMarket: market,
  candidateMarkets: relatedMarkets,
  correlations: correlationMatrix,
  inefficiencies
});

// Build strategy
const { strategy } = await tool_buildStrategyTemplate({
  primaryMarket: market,
  hedges: hedges.slice(0, 2),
  style: "moderate"
});

// Simulate outcomes
const payoff = await tool_simulatePayoff({ legs: strategy.legs });

// Backtest
const backtest = await tool_backtestTriggers({
  legs: strategy.legs,
  triggers: strategy.triggers,
  priceHistories: histories
});

// Complete strategy with results
const completeStrategy = {
  ...strategy,
  payoffCurve: payoff.payoffCurve,
  scenarioGrid: payoff.scenarioGrid,
  maxRisk: payoff.maxRisk,
  expectedReturn: payoff.expectedReturn,
  backtestResults: backtest.backtestResults,
  sharpeRatio: backtest.sharpeRatio
};
```

### 5. Trade Dossier Generation

```typescript
const { dossier } = await tool_generateTradeDossier({
  market,
  compressedEvidenceBundle: sources.map(s => s.compressedText).join("\n\n"),
  sources
});

// Now you have a complete trade package:
// - Market data
// - News sources with sentiment
// - Strategy with payoff/backtest
// - Trade dossier with timeline & risks
```

## 📝 Notes

1. **Server-side only** - All tools use Node.js APIs (fetch, cheerio) and should only run on the server
2. **JSON returns** - All functions return JSON-serializable objects (no classes/functions)
3. **Error handling** - Tools return `{ data, error? }` pattern for graceful degradation
4. **Rate limiting** - Be mindful of API rate limits (especially CLOB for price history)
5. **GDELT is keyless** - No API key needed for news search
6. **Compression requires API key** - Set TOKEN_COMPANY_API_KEY in .env.local

## 🔬 Testing

```bash
# Type check
npm run typecheck

# Test individual tools
node -e "
import { tool_searchMarkets } from './lib/agent/tools/polymarket.js';
const result = await tool_searchMarkets({ query: 'Trump', limit: 5 });
console.log(result);
"
```

## 🎯 Next Steps

1. Create LLM agent that orchestrates these tools
2. Build terminal UI for agent interaction
3. Add real-time WebSocket streaming for live updates
4. Implement caching layer for API responses
5. Add persistent storage for strategies and dossiers

## 📚 API References

- **Gamma API**: https://gamma-api.polymarket.com
- **CLOB API**: https://clob.polymarket.com
- **GDELT**: https://api.gdeltproject.org
- **Token Company**: https://api.thetokencompany.com/v1
