# Legend Panel Components

Robinhood Legend-style right panel UI components for the PolyPilot Terminal with complex analytics.

## Components

### LegendPanel
Main tabbed panel container with 6 tabs:
- Market: Price charts and stats
- Analysis: Complex analytics board
- Graph: Evidence graph visualization
- Strategy: Strategy builder and backtester
- Dossier: Trade dossier with timeline
- Sources: News sources with sentiment

**Props:**
```typescript
{
  selectedMarket: Market | null;
  sources?: Source[];
  graph?: EvidenceGraph | null;
  strategy?: Strategy | null;
  dossier?: TradeDossier | null;
  analysisBoard?: AnalysisBoard | null;
  priceHistory?: PriceHistoryPoint[];
  orderbook?: OrderbookLevel[];
}
```

### LegendMarketTab
Market details with:
- Candlestick price chart
- Key stats grid (YES/NO price, volume, liquidity, spread)
- Order book ladder (top 5 bids/asks)
- Time to resolution countdown

### LegendAnalysisTab
Complex analytics with 6 panels:

**A) Market Microstructure:**
- Spread, depth, imbalance metrics
- Liquidity score with color-coded badges
- Warning badges for risks

**B) Trend + Regime:**
- Price history with volatility
- Trend strength and momentum
- Regime detection

**C) Cross-Market Relationships:**
- Correlation matrix display
- Lead/lag indicators
- Top correlated markets

**D) Inefficiency Scanner:**
- Divergence detection
- Z-scores and hypotheses
- Neutral educational language

**E) Strategy Recommendations:**
- Risk-reduction hedge strategies
- Spread trade opportunities
- Confidence scores
- "Not financial advice" disclaimer

**F) Context & Sentiment:**
- Market context narrative
- Source stance badges

### LegendGraphTab
Interactive evidence graph using React Flow:
- Node types: markets (circles), sources (rectangles), signals (squares), events (circles)
- Edge types: supports (green), contradicts (red), correlates (gray), causes (blue)
- Zoom/pan controls
- Visual legend panel
- Edge thickness = confidence/weight

### LegendStrategyTab
Strategy builder with:
- **Add Legs:** Form to add market positions
- **Payoff Curve:** PnL across probability range with breakeven markers
- **Scenario Grid:** Multi-outcome PnL matrix (color-coded)
- **Triggers:** Entry/exit/hedge/unwind conditions
- **Backtest Results:** PnL timeline, win rate, Sharpe ratio

### LegendDossierTab
Trade dossier timeline:
- **Timeline Markers:** Event timeline with impact indicators
- **Theta Signals:** Time decay chart and optimal windows
- **Resolution Risk:** Risk score gauge (0-100) with factors
- **Rule-to-Trade:** Structured checklist
- **Unknowns:** Key uncertainties list

### LegendSourcesTab
Source management:
- Filterable/sortable list
- Stance badges (bullish/bearish/neutral)
- Sentiment scores
- Expandable evidence snippets
- Links to original articles
- Sort by: relevance, recency, sentiment
- Filter by: stance, publisher

## Usage

```tsx
import { LegendPanel } from "@/components/legend";

function Terminal() {
  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div className="flex-1">...</div>
      
      {/* Legend Panel */}
      <div className="w-96">
        <LegendPanel
          selectedMarket={market}
          sources={sources}
          graph={evidenceGraph}
          strategy={strategy}
          dossier={dossier}
          analysisBoard={analysisBoard}
          priceHistory={priceHistory}
          orderbook={orderbook}
        />
      </div>
    </div>
  );
}
```

## Styling

- Dark theme with glassmorphism
- Color coding:
  - Green = positive/buy/bullish/profit
  - Red = negative/sell/bearish/loss
  - Blue = hedge/informational
  - Yellow = warning/caution
  - Purple = volatility/advanced metrics
- Responsive design (collapsible on mobile)
- Smooth transitions between tabs

## Dependencies

- `lucide-react`: Icons
- `recharts`: Charts and graphs
- `reactflow`: Network graph visualization
- `tailwindcss`: Styling

## Type Definitions

All types are imported from:
- `@/lib/types`: Core types (Market, OrderbookLevel, PriceHistoryPoint)
- `@/lib/agent/schemas`: Advanced types (Source, EvidenceGraph, Strategy, TradeDossier, AnalysisBoard)

## Notes

- All recommendation panels include "Educational/simulation only; not financial advice" disclaimer
- Uses neutral language for inefficiency detection
- Designed for data-dense professional trading interface
- All charts use dark theme with proper contrast
- Components handle null/undefined data gracefully
