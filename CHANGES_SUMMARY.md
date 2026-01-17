# Changes Summary

## ✅ Fixed Event → Market Mapping

### Problem
- Previously treated `event.id` as the market ID
- One event can have multiple markets, so this was incorrect

### Solution
- Updated `Market` interface to include:
  - `id`: The actual market ID (from `event.markets[].id`)
  - `eventId`: Parent event ID for reference
  - `clobTokenIds`: Token IDs needed for CLOB API calls

- Created `mapEventsToMarkets()` function in `lib/api/polymarket.ts`:
  - Properly flattens events into markets
  - Extracts YES/NO prices from outcomes
  - Maps clobTokenIds correctly
  - Calculates probability from YES price

### Files Updated:
- ✅ `lib/types.ts` - Added `eventId` and `clobTokenIds` to Market interface
- ✅ `lib/api/polymarket.ts` - Added `mapEventsToMarkets()` function

---

## ✅ Moved API Calls to Server-Side Routes

### Problem
- Token Company, LLM, and News APIs require API keys
- API keys should never be exposed to client-side code

### Solution
Created Next.js API routes (server-side only):

1. **`/api/compress`** - Token Company compression
   - File: `app/api/compress/route.ts`
   - Accepts: `{ text, aggressiveness }`
   - Returns: `{ compressed, tokensBefore, tokensAfter, saved }`

2. **`/api/fetch-news`** - News article fetching
   - File: `app/api/fetch-news/route.ts`
   - Accepts: `{ query, domain, limit }`
   - Returns: `{ articles: Article[] }`

3. **`/api/generate-thesis`** - AI thesis generation
   - File: `app/api/generate-thesis/route.ts`
   - Accepts: `{ market, compressedArticles, domain }`
   - Returns: `Thesis` object
   - Supports OpenAI (GPT-4) and Anthropic (Claude)

4. **`/api/generate-memo`** - Trade memo generation
   - File: `app/api/generate-memo/route.ts`
   - Accepts: `{ portfolioLegs, compressedContext, compressionLevel }`
   - Returns: Memo object with strategy, risks, hedges, etc.
   - Supports OpenAI (GPT-4) and Anthropic (Claude)

### Files Created:
- ✅ `app/api/compress/route.ts`
- ✅ `app/api/fetch-news/route.ts`
- ✅ `app/api/generate-thesis/route.ts`
- ✅ `app/api/generate-memo/route.ts`

### Client-Side Usage:
All routes are called from client components using standard `fetch()`:

```typescript
// Compression
const response = await fetch("/api/compress", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text, aggressiveness }),
});

// News
const response = await fetch("/api/fetch-news", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, domain, limit }),
});

// Thesis
const response = await fetch("/api/generate-thesis", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ market, compressedArticles, domain }),
});

// Memo
const response = await fetch("/api/generate-memo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ portfolioLegs, compressedContext, compressionLevel }),
});
```

---

## Environment Variables Required

Add to `.env.local`:

```env
# Token Company API
TOKEN_COMPANY_API_KEY=your_api_key_here
TOKEN_COMPANY_API_URL=https://api.thetokencompany.com/v1

# LLM API (choose one or both)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# News API (optional, configure in fetch-news route)
NEWS_API_KEY=your_news_api_key
NEWS_API_URL=https://newsapi.org/v2
```

---

## Next Steps

1. Update client components to use the new API routes:
   - `app/page.tsx` - Call `/api/fetch-news` and `/api/generate-thesis`
   - `components/trade-memo-builder.tsx` - Call `/api/compress` and `/api/generate-memo`

2. Update market search to use `mapEventsToMarkets()`:
   - `components/market-panel.tsx` - Use `mapEventsToMarkets()` when fetching events
   - `app/page.tsx` - Use `mapEventsToMarkets()` when setting markets

3. Test all API routes with real API keys

4. Add error handling and loading states in client components

