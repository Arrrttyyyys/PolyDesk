# PolyPilot Terminal API Routes

## Overview
This document describes the four API routes created for the PolyPilot Terminal.

---

## 1. `/api/chatbot/run` - Streaming Agent Endpoint

**Method:** POST

**Description:** Main streaming agent endpoint that orchestrates agent tools based on user intent.

**Request Body:**
```json
{
  "chatId": "string",
  "messages": [
    { "role": "user" | "assistant", "content": "string" }
  ],
  "uiState": {
    "markets": [],
    "sources": [],
    "graph": {},
    "dossier": {},
    "strategy": {},
    "analysisBoard": {}
  }
}
```

**Response:** Server-Sent Events (text/event-stream)

**Event Types:**
- `step` - Pipeline step updates (e.g., "Discovering markets...")
- `text` - Assistant text tokens (streamed incrementally)
- `artifact` - Complete artifacts (markets, sources, graph, dossier, strategy, analysisBoard)
- `error` - Error messages

**Example Response Stream:**
```
data: {"type":"step","content":"🔍 Discovering markets..."}

data: {"type":"artifact","artifactType":"markets","content":[...]}

data: {"type":"text","content":"Found 10 markets "}
```

**Intents Handled:**
- `market_search` - Find markets by query
- `market_analysis` - Analyze market with price history and orderbook
- `research` - Fetch and compress news articles
- `strategy_building` - Build hedging strategies
- `dossier_generation` - Generate trade dossier
- `general` - General conversation with Gemini

**Features:**
- Compresses all context with Token Company before LLM calls
- Uses GEMINI_API_KEY for LLM inference
- Orchestrates multiple agent tools per intent
- Streams responses for real-time UI updates

---

## 2. `/api/history` - CLOB Price History Proxy

**Method:** GET

**Description:** Proxies price history requests to CLOB API and normalizes response.

**Query Parameters:**
- `token_id` (required) - Token ID to fetch history for
- `interval` (optional) - Time interval: "1m", "5m", "1h", "1d" (default: "1h")
- `fidelity` (optional) - Number of data points (1-1000, default: 100)

**Example Request:**
```
GET /api/history?token_id=123456&interval=1h&fidelity=100
```

**Response:**
```json
{
  "tokenId": "123456",
  "interval": "1h",
  "fidelity": 100,
  "history": [
    {
      "timestamp": "2024-01-18T12:00:00Z",
      "price": 0.65,
      "volume": 1500
    }
  ]
}
```

**Proxies To:** `https://clob.polymarket.com/prices-history`

---

## 3. `/api/gdelt` - GDELT News Proxy

**Method:** POST

**Description:** Proxies news search requests to GDELT Doc API (keyless).

**Request Body:**
```json
{
  "query": "string",
  "limit": 10,
  "timeframeDays": 7
}
```

**Response:**
```json
{
  "query": "bitcoin",
  "timeframeDays": 7,
  "totalArticles": 10,
  "articles": [
    {
      "id": "string",
      "url": "string",
      "title": "string",
      "publisher": "string",
      "publishedAt": "2024-01-18T12:00:00Z",
      "seenDate": "string",
      "language": "en",
      "domain": "example.com"
    }
  ]
}
```

**Proxies To:** `https://api.gdeltproject.org/api/v2/doc/doc`

**Note:** GDELT API is keyless and free to use.

---

## 4. `/api/orderbook` - CLOB Orderbook Proxy

**Method:** GET

**Description:** Proxies orderbook requests to CLOB API and computes features.

**Query Parameters:**
- `token_id` (required) - Token ID to fetch orderbook for

**Example Request:**
```
GET /api/orderbook?token_id=123456
```

**Response:**
```json
{
  "tokenId": "123456",
  "timestamp": "2024-01-18T12:00:00Z",
  "spread": 0.02,
  "spreadPercent": 3.08,
  "depth": {
    "bid": 1500,
    "ask": 1200,
    "total": 2700
  },
  "imbalance": 0.1111,
  "slippage": {
    "small": 0.005,
    "medium": 0.015,
    "large": 0.035
  },
  "bestBid": 0.64,
  "bestAsk": 0.66,
  "midPrice": 0.65,
  "levels": {
    "bids": [
      { "price": 0.64, "size": 500, "type": "bid" }
    ],
    "asks": [
      { "price": 0.66, "size": 400, "type": "ask" }
    ]
  },
  "interpretation": "Tight spread indicates good liquidity. Balanced orderbook. Adequate liquidity."
}
```

**Computed Features:**
- **Spread:** Difference between best bid and best ask
- **Depth:** Total size on bid/ask sides
- **Imbalance:** Ratio of bid to ask depth (-1 to 1)
- **Slippage:** Expected slippage for different order sizes
- **Interpretation:** Human-readable orderbook analysis

**Proxies To:** `https://clob.polymarket.com/book`

---

## Environment Variables Required

```bash
# Required for chatbot/run
GEMINI_API_KEY=your_gemini_api_key

# Required for compression (used in chatbot/run)
TOKEN_COMPANY_API_KEY=your_token_company_key
TOKEN_COMPANY_API_URL=https://api.thetokencompany.com/v1

# Required for news (used in chatbot/run - optional fallback)
GOOGLE_NEWS_API_KEY=your_google_news_key
GOOGLE_NEWS_CX=your_custom_search_engine_id
```

---

## Error Handling

All routes follow consistent error handling patterns:

**400 Bad Request:**
- Missing required parameters
- Invalid parameter values

**404 Not Found:**
- Resource not found (e.g., orderbook doesn't exist)

**500 Internal Server Error:**
- Upstream API errors
- Processing errors

**Error Response Format:**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## Security

✅ **Passed CodeQL Security Scan** - 0 vulnerabilities

- All API keys kept server-side only
- Input validation on all parameters
- Proper error handling with status codes
- Type-safe implementation with TypeScript
- No sensitive data in responses
- CORS handled by Next.js

---

## Testing

### Test the Streaming Endpoint:
```bash
curl -X POST http://localhost:3000/api/chatbot/run \
  -H "Content-Type: application/json" \
  -d '{"chatId":"test","messages":[{"role":"user","content":"Show me soccer markets"}]}'
```

### Test History Endpoint:
```bash
curl "http://localhost:3000/api/history?token_id=123456&interval=1h&fidelity=100"
```

### Test GDELT Endpoint:
```bash
curl -X POST http://localhost:3000/api/gdelt \
  -H "Content-Type: application/json" \
  -d '{"query":"bitcoin","limit":10,"timeframeDays":7}'
```

### Test Orderbook Endpoint:
```bash
curl "http://localhost:3000/api/orderbook?token_id=123456"
```

---

## Implementation Notes

- All routes follow existing patterns from `/api/compress` and `/api/fetch-news`
- Use NextResponse for responses
- Use Server-Sent Events (SSE) for streaming
- Compress context with Token Company before LLM calls
- Log all operations for debugging
- TypeScript types from `@/lib/agent/schemas`
