# API Integration Guide

This document outlines where APIs need to be integrated to replace mock data with real API calls.

## 1. Polymarket Gamma API

**Base URL:** `https://gamma-api.polymarket.com`

### 1.1 Market Search & Discovery
**Location:** `components/market-panel.tsx` (line 27)
**Current:** Uses `domainData[domain].markets` (mock data)
**Needs:**
- Replace with `searchEvents()` from `lib/api/polymarket.ts` (already exists but not used)
- Filter by domain/tags when searching
- Map Gamma API response to our `Market` interface

**API Endpoints:**
- `GET /events?active=true&closed=false&limit=20&tags=[]`
- `GET /events?slug={slug}` (for URL slug parsing)

**Data Mapping:**
⚠️ **IMPORTANT:** One event can have multiple markets. Do NOT use `event.id` as `market.id`.

- `event.markets[].id` → `market.id` (the actual market ID)
- `event.id` → `market.eventId` (parent event ID for reference)
- `event.markets[].question` → `market.title` (or fallback to `event.title`)
- `event.markets[].outcomes[].price` → `market.yesPrice` / `market.noPrice`
- `event.markets[].clobTokenIds` → `market.clobTokenIds` (needed for CLOB API calls)
- `event.markets[].endDate` → `market.resolution` (or fallback to `event.endDate`)
- Calculate `market.probability` from YES price
- `event.markets[].volume` → `market.volume`

**Use the `mapEventsToMarkets()` function** from `lib/api/polymarket.ts` to properly flatten events into markets.

**Files to Update:**
- `app/page.tsx` (line 43): Replace `domainData[activeDomain].markets` with API call
- `components/market-panel.tsx` (line 27): Replace mock markets with API search

---

## 2. Polymarket CLOB API

**Base URL:** `https://clob.polymarket.com`

### 2.1 Real-Time Prices (Midpoint)
**Location:** `components/market-panel.tsx` (lines 38-40), `components/trade-ticket.tsx`
**Current:** Uses `selectedMarket.yesPrice` / `selectedMarket.noPrice` from mock data
**Needs:**
- Fetch real-time midpoint prices for selected market
- Update prices periodically (polling or WebSocket if available)

**API Endpoint:**
- `GET /midpoint?token_id={clobTokenId}`

**Implementation:**
```typescript
// lib/api/clob.ts
export async function getMidpoint(tokenId: string): Promise<number> {
  const response = await fetch(`https://clob.polymarket.com/midpoint?token_id=${tokenId}`);
  const data = await response.json();
  return parseFloat(data.midpoint);
}
```

**Files to Update:**
- Create `lib/api/clob.ts` with CLOB API functions
- `components/market-panel.tsx`: Fetch real-time prices when market selected
- `components/trade-ticket.tsx`: Use real-time prices for calculations
- Add polling interval (e.g., every 5 seconds) to update prices

---

### 2.2 Orderbook Data
**Location:** `components/orderbook-ladder.tsx` (line 30)
**Current:** Uses `generateOrderbook(midPrice)` from `lib/orderbook-data.ts` (mock function)
**Needs:**
- Replace with real orderbook data from CLOB API
- Use real orderbook for slippage calculations

**API Endpoint:**
- `GET /book?token_id={clobTokenId}`

**Response Format:**
```json
{
  "bids": [[price, size], ...],
  "asks": [[price, size], ...]
}
```

**Implementation:**
```typescript
// lib/api/clob.ts
export async function getOrderbook(tokenId: string): Promise<OrderbookLevel[]> {
  const response = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`);
  const data = await response.json();
  
  // Transform to OrderbookLevel[]
  const bids = data.bids.map(([price, size], idx) => ({
    price: parseFloat(price),
    size: parseFloat(size),
    cumulative: data.bids.slice(0, idx + 1).reduce((sum, [, s]) => sum + parseFloat(s), 0),
    type: "bid" as const,
  }));
  
  const asks = data.asks.map(([price, size], idx) => ({
    price: parseFloat(price),
    size: parseFloat(size),
    cumulative: data.asks.slice(0, idx + 1).reduce((sum, [, s]) => sum + parseFloat(s), 0),
    type: "ask" as const,
  }));
  
  return [...asks.reverse(), ...bids].sort((a, b) => b.price - a.price);
}
```

**Files to Update:**
- `lib/api/clob.ts`: Add `getOrderbook()` function
- `components/orderbook-ladder.tsx` (line 30): Replace `generateOrderbook()` with `getOrderbook()`
- Update `calculateSlippage()` to work with real orderbook structure

---

### 2.3 Price History
**Location:** `components/probability-chart.tsx` (line 18)
**Current:** Uses `generateMockHistory()` function (mock data)
**Needs:**
- Fetch real price history for the selected market
- Display 30-day historical probability data

**API Endpoint:**
- `GET /prices-history?market={tokenId}&interval={interval}`

**Implementation:**
```typescript
// lib/api/clob.ts
export async function getPriceHistory(
  tokenId: string,
  days: number = 30
): Promise<PriceHistoryPoint[]> {
  const response = await fetch(
    `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=1d&days=${days}`
  );
  const data = await response.json();
  
  return data.map((point: any) => ({
    date: point.timestamp,
    probability: point.price * 100, // Convert price to probability
  }));
}
```

**Files to Update:**
- `lib/api/clob.ts`: Add `getPriceHistory()` function
- `components/probability-chart.tsx` (line 38): Replace `generateMockHistory()` with API call
- Add loading state while fetching history

---

## 3. News API - Server-Side Only

**Location:** `app/page.tsx` (line 60), `components/news-panel.tsx`
**Current:** Uses `domainData[activeDomain].articles` (mock data)
**Needs:**
- Fetch real news articles related to the selected market
- Filter by domain (Markets/News/Sports)
- Extract article text for compression
- ⚠️ **MUST be called from server-side API route** (API keys should never be exposed to client)

**Server-Side API Route:**
- `POST /api/fetch-news` (already created in `app/api/fetch-news/route.ts`)

**Client-Side Usage:**
```typescript
// Call from client components
const response = await fetch("/api/fetch-news", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: marketTitle,
    domain: "markets",
    limit: 30,
  }),
});

const data = await response.json();
// Returns: { articles: Article[] }
```

**Potential APIs:**
- NewsAPI.org (configured in server route)
- Google News API
- Custom news aggregation service

**Files to Update:**
- ✅ `app/api/fetch-news/route.ts` - Already created (server-side)
- `app/page.tsx` (line 60): Call `/api/fetch-news` in `handleFetchResearch()`
- Add article text extraction for compression step

---

## 4. Token Company API (Compression) - Server-Side Only

**Base URL:** `https://api.thetokencompany.com/v1`

### 4.1 Article Compression
**Location:** `app/page.tsx` (line 66 - compression step), `components/trade-memo-builder.tsx` (line 35)
**Current:** Simulated compression step (no real compression)
**Needs:**
- Compress articles using bear-1 model
- Track token savings metrics
- ⚠️ **MUST be called from server-side API route** (API keys should never be exposed to client)

**Server-Side API Route:**
- `POST /api/compress` (already created in `app/api/compress/route.ts`)

**Client-Side Usage:**
```typescript
// Call from client components
const response = await fetch("/api/compress", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: articleText,
    aggressiveness: 0.7,
  }),
});

const data = await response.json();
// Returns: { compressed, tokensBefore, tokensAfter, saved }
```

**Files to Update:**
- ✅ `app/api/compress/route.ts` - Already created (server-side)
- `app/page.tsx` (line 66): Call `/api/compress` in loading step 2
- `components/trade-memo-builder.tsx` (line 40): Call `/api/compress` for context bundle
- Update compression stats with real token metrics

---

## 5. LLM API (Thesis Generation) - Server-Side Only

**Location:** `app/page.tsx` (line 70), `components/copilot-panel.tsx`, `components/trade-memo-builder.tsx` (line 40)
**Current:** Uses `domainData[activeDomain].thesis` (mock data)
**Needs:**
- Generate AI thesis from compressed articles
- Generate trade memo from portfolio context
- ⚠️ **MUST be called from server-side API routes** (API keys should never be exposed to client)

**Server-Side API Routes:**
- `POST /api/generate-thesis` (already created in `app/api/generate-thesis/route.ts`)
- `POST /api/generate-memo` (already created in `app/api/generate-memo/route.ts`)

**Client-Side Usage for Thesis:**
```typescript
// Call from client components
const response = await fetch("/api/generate-thesis", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    market: selectedMarket,
    compressedArticles: compressedTexts,
    domain: "markets",
  }),
});

const thesis = await response.json();
// Returns: Thesis object
```

**Client-Side Usage for Memo:**
```typescript
// Call from trade memo builder
const response = await fetch("/api/generate-memo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    portfolioLegs: legs,
    compressedContext: compressedContext,
    compressionLevel: 0.7,
  }),
});

const memo = await response.json();
// Returns: Memo object with strategy, risks, hedges, etc.
```

**Supported Providers:**
- OpenAI (GPT-4) - Set `OPENAI_API_KEY`
- Anthropic (Claude) - Set `ANTHROPIC_API_KEY`
- Automatically uses OpenAI if available, falls back to Anthropic

**Files to Update:**
- ✅ `app/api/generate-thesis/route.ts` - Already created (server-side)
- ✅ `app/api/generate-memo/route.ts` - Already created (server-side)
- `app/page.tsx` (line 70): Call `/api/generate-thesis` instead of mock
- `components/trade-memo-builder.tsx` (line 40): Call `/api/generate-memo` with compressed context

---

## 6. Environment Variables

Add to `.env.local`:
```env
# Polymarket APIs (public, no key needed)
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_API_URL=https://clob.polymarket.com

# Token Company API
TOKEN_COMPANY_API_KEY=your_api_key_here
TOKEN_COMPANY_API_URL=https://api.thetokencompany.com/v1

# LLM API (choose one)
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key

# News API (if using external service)
NEWS_API_KEY=your_news_api_key
```

---

## Summary of Files to Create/Update

### New Files:
1. `lib/api/clob.ts` - CLOB API client (midpoint, orderbook, price history)
2. ✅ `app/api/compress/route.ts` - Server-side compression API route
3. ✅ `app/api/fetch-news/route.ts` - Server-side news fetching API route
4. ✅ `app/api/generate-thesis/route.ts` - Server-side thesis generation API route
5. ✅ `app/api/generate-memo/route.ts` - Server-side memo generation API route

### Files to Update:
1. `app/page.tsx`:
   - Line 43: Replace mock markets with Gamma API
   - Line 60: Replace mock articles with News API
   - Line 66: Add real compression step
   - Line 70: Replace mock thesis with LLM API

2. `components/market-panel.tsx`:
   - Line 27: Use Gamma API for market search
   - Add real-time price polling from CLOB API

3. `components/orderbook-ladder.tsx`:
   - Line 30: Replace `generateOrderbook()` with CLOB `/book` API

4. `components/probability-chart.tsx`:
   - Line 38: Replace `generateMockHistory()` with CLOB `/prices-history` API

5. `components/trade-memo-builder.tsx`:
   - Line 40: Call `/api/compress` and `/api/generate-memo` (server routes)

6. `lib/api/polymarket.ts`:
   - ✅ Updated with `mapEventsToMarkets()` function
   - Properly maps events → markets (one event can have multiple markets)
   - Use `market.id` (from `event.markets[].id`), NOT `event.id`

---

## Integration Order (Recommended)

1. **Phase 1: Market Data**
   - Integrate Gamma API for market search/discovery
   - Integrate CLOB API for real-time prices
   - Update market panel to use real data

2. **Phase 2: Trading Data**
   - Integrate CLOB orderbook API
   - Integrate CLOB price history API
   - Update orderbook ladder and probability chart

3. **Phase 3: Research Pipeline**
   - Integrate News API
   - Integrate Token Company compression API
   - Integrate LLM API for thesis generation
   - Update fetch research flow

4. **Phase 4: Trade Memo**
   - Integrate compression for trade memo context
   - Integrate LLM for memo generation
   - Update trade memo builder

---

## Testing Checklist

- [ ] Market search returns real Polymarket events
- [ ] Real-time prices update correctly
- [ ] Orderbook displays real bid/ask data
- [ ] Price history chart shows real data
- [ ] News articles are fetched and displayed
- [ ] Articles are compressed with bear-1
- [ ] Compression stats show real token savings
- [ ] AI thesis is generated from compressed articles
- [ ] Trade memo is generated from portfolio context
- [ ] All API errors are handled gracefully
- [ ] Loading states work correctly
- [ ] Data refreshes at appropriate intervals

