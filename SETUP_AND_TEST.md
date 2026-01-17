# Setup and Testing Guide

## ✅ What's Ready

All client components have been updated to use the API routes:
- ✅ Market fetching from Polymarket Gamma API (with proper event→market mapping)
- ✅ News fetching via `/api/fetch-news`
- ✅ Article compression via `/api/compress`
- ✅ Thesis generation via `/api/generate-thesis`
- ✅ Trade memo generation via `/api/generate-memo`

## 📝 Setup Steps

### 1. Create `.env.local` file

Create a `.env.local` file in the root directory with your API keys:

```env
# Token Company API (Required for compression)
TOKEN_COMPANY_API_KEY=your_token_company_api_key_here
TOKEN_COMPANY_API_URL=https://api.thetokencompany.com/v1

# Google Gemini API (Required for thesis/memo generation)
# Get your API key from: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Google News API (Required for news fetching)
# Get your API key from: https://console.cloud.google.com/apis/credentials
# Create a Custom Search Engine at: https://programmablesearchengine.google.com/
# Set it to search news.google.com
GOOGLE_NEWS_API_KEY=your_google_api_key_here
GOOGLE_NEWS_CX=your_custom_search_engine_id_here

# Optional: Fallback LLM providers (if Gemini not available)
# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. Install Dependencies (if not already done)

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Test the Application

1. **Market Search**: 
   - Switch between Markets/News/Sports domains
   - Search for markets - should fetch from Polymarket API
   - Select a market

2. **Fetch Research**:
   - Click "Fetch Research" on a selected market
   - Should see loading steps:
     - Fetching market data...
     - Pulling news... (calls `/api/fetch-news`)
     - Compressing articles... (calls `/api/compress`)
     - Generating thesis... (calls `/api/generate-thesis`)

3. **Trade Memo**:
   - Add positions to portfolio
   - Go to "Trade Memo" tab
   - Click "Generate Trade Memo"
   - Should compress context and generate memo via `/api/generate-memo`

## 🔍 What to Check

### If Markets Don't Load:
- Check browser console for errors
- Verify Polymarket Gamma API is accessible (public API, no key needed)
- Check network tab for failed requests

### If News Doesn't Load:
- Verify `GOOGLE_NEWS_API_KEY` and `GOOGLE_NEWS_CX` are set correctly
- Check `/api/fetch-news` route logs
- Verify your Custom Search Engine is configured to search news.google.com
- News API is required for the full experience

### If Compression Fails:
- Verify `TOKEN_COMPANY_API_KEY` is set correctly
- Check `/api/compress` route logs
- Verify Token Company API is accessible

### If Thesis/Memo Generation Fails:
- Verify `GEMINI_API_KEY` is set correctly
- Check `/api/generate-thesis` or `/api/generate-memo` route logs
- Verify Gemini API key is valid and has quota available
- Get your key from: https://aistudio.google.com/apikey

## 🐛 Debugging

### Check Server Logs
All API routes log errors to the console. Check your terminal where `npm run dev` is running.

### Check Browser Console
Client-side errors will appear in browser DevTools console.

### Test API Routes Directly

You can test the API routes directly using curl or Postman:

```bash
# Test compression
curl -X POST http://localhost:3000/api/compress \
  -H "Content-Type: application/json" \
  -d '{"text": "Test article text", "aggressiveness": 0.7}'

# Test news (if configured)
curl -X POST http://localhost:3000/api/fetch-news \
  -H "Content-Type: application/json" \
  -d '{"query": "bitcoin", "domain": "markets", "limit": 10}'
  
# Note: Requires GOOGLE_NEWS_API_KEY and GOOGLE_NEWS_CX

# Test thesis generation
curl -X POST http://localhost:3000/api/generate-thesis \
  -H "Content-Type: application/json" \
  -d '{
    "market": {"title": "Test Market", "yesPrice": 0.5, "noPrice": 0.5, "probability": 50, "resolution": "2024-12-31"},
    "compressedArticles": ["Article 1", "Article 2"],
    "domain": "markets"
  }'
```

## 📋 Current Status

- ✅ Server-side API routes created
- ✅ Client components updated to use API routes
- ✅ Event→market mapping fixed
- ✅ Error handling in place
- ✅ Gemini LLM integration (primary)
- ✅ Google News API integration
- ⚠️ Requires API keys in `.env.local` to work fully

## 🚀 Next Steps After Setup

Once you have your `.env.local` file set up:
1. Run `npm run dev`
2. Open http://localhost:3000
3. Test market search and selection
4. Test "Fetch Research" flow
5. Test trade memo generation

Everything should work end-to-end! 🎉

