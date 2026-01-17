# Google News API Setup Guide

To use Google News API, you need to set up Google Custom Search API with a Custom Search Engine that searches news.google.com.

## Step 1: Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Custom Search API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key
   - (Optional) Restrict the API key to "Custom Search API" for security

## Step 2: Create Custom Search Engine

1. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click "Add" to create a new search engine
3. Configure your search engine:
   - **Sites to search**: Enter `news.google.com`
   - **Name**: Give it a name (e.g., "PolyDesk News Search")
   - Click "Create"
4. Get your Search Engine ID (CX):
   - After creation, go to "Setup" > "Basics"
   - Copy the "Search engine ID" (this is your `GOOGLE_NEWS_CX`)

## Step 3: Configure Search Engine

1. In your Custom Search Engine settings:
   - Go to "Setup" > "Basics"
   - Make sure "Search the entire web" is enabled (or at least news.google.com)
   - Under "Sites to search", ensure `news.google.com` is included

## Step 4: Add to .env.local

Add these to your `.env.local` file:

```env
GOOGLE_NEWS_API_KEY=your_api_key_from_step_1
GOOGLE_NEWS_CX=your_search_engine_id_from_step_2
```

## Testing

You can test the setup by making a request to the API route:

```bash
curl -X POST http://localhost:3000/api/fetch-news \
  -H "Content-Type: application/json" \
  -d '{"query": "bitcoin", "domain": "markets", "limit": 10}'
```

## Notes

- Google Custom Search API has a free tier: 100 queries per day
- For production, you may want to upgrade to a paid plan
- The Custom Search Engine must be configured to search news.google.com to get news results
- You can create multiple search engines for different domains if needed

