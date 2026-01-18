import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Google Custom Search API for Google News
const GOOGLE_NEWS_API_KEY = process.env.GOOGLE_NEWS_API_KEY;
const GOOGLE_NEWS_CX = process.env.GOOGLE_NEWS_CX; // Custom Search Engine ID for news.google.com

/**
 * Fetch and extract full article content from a URL
 */
async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Failed to fetch article from ${url}: ${response.status}`);
      return "";
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $("script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar").remove();

    // Try to find article content using common selectors
    const articleSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.article-body',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.story-body',
      '.article-text',
    ];

    let articleText = "";

    // Try each selector
    for (const selector of articleSelectors) {
      const $article = $(selector).first();
      if ($article.length > 0) {
        articleText = $article.text();
        if (articleText.length > 500) {
          // Found substantial content
          break;
        }
      }
    }

    // Fallback: extract from paragraphs if no article element found
    if (articleText.length < 500) {
      const paragraphs = $("p")
        .map((_, el) => $(el).text())
        .get()
        .filter((text) => text.trim().length > 50) // Filter out very short paragraphs
        .join("\n\n");
      
      if (paragraphs.length > articleText.length) {
        articleText = paragraphs;
      }
    }

    // Clean up the text
    return articleText
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
      .trim()
      .substring(0, 50000); // Limit to 50k characters to avoid huge payloads

  } catch (error) {
    console.warn(`Error fetching article content from ${url}:`, error instanceof Error ? error.message : String(error));
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, domain, limit = 30 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Use Google Custom Search API to search Google News
    if (GOOGLE_NEWS_API_KEY && GOOGLE_NEWS_CX) {
      // Extract key terms from the query (remove common words, extract main topic)
      const keyTerms = extractKeyTerms(query);
      
      // Build focused search query - prioritize the actual topic
      const searchQuery = keyTerms;
      
      // Limit to 10 articles for full content fetching
      const articleLimit = Math.min(limit, 10);
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_NEWS_API_KEY}&cx=${GOOGLE_NEWS_CX}&q=${encodeURIComponent(searchQuery)}&num=${articleLimit}&lr=lang_en`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `Google News API error: ${response.status}`, details: error },
          { status: response.status }
        );
      }

      const data = await response.json();

      // First, create article objects with basic info
      const articlesWithBasicInfo = data.items?.map((item: any, index: number) => ({
        id: `news-${index}-${Date.now()}`,
        title: item.title || "Untitled",
        source: extractSource(item.displayLink || item.link),
        timestamp: formatTimestamp(item.pagemap?.metatags?.[0]?.["article:published_time"] || new Date().toISOString()),
        relevance: calculateRelevance(item, query),
        compressed: false,
        url: item.link,
        description: item.snippet,
        fullContent: "", // Will be populated below
      })) || [];

      // Fetch full content for each article (in parallel, but with rate limiting)
      console.log(`[FETCH-NEWS] Fetching full content for ${articlesWithBasicInfo.length} articles...`);
      
      const articlesWithContent = await Promise.all(
        articlesWithBasicInfo.map(async (article) => {
          const fullContent = await fetchArticleContent(article.url);
          return {
            ...article,
            fullContent: fullContent || article.description, // Fallback to snippet if content fetch fails
          };
        })
      );

      console.log(`[FETCH-NEWS] Successfully fetched content for ${articlesWithContent.filter(a => a.fullContent && a.fullContent.length > 500).length} articles`);

      return NextResponse.json({ articles: articlesWithContent });
    }

    // Fallback: Return empty array with message
    return NextResponse.json({
      articles: [],
      message: "Google News API not configured. Please set GOOGLE_NEWS_API_KEY and GOOGLE_NEWS_CX environment variables.",
    });
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function extractKeyTerms(query: string): string {
  // First, extract tickers and important terms before lowercasing
  const originalWords = query.split(/\s+/);
  const tickers: string[] = [];
  originalWords.forEach(word => {
    // Match tickers like BTC, ETH, SPY (2-5 uppercase letters)
    if (/^[A-Z]{2,5}$/.test(word)) {
      tickers.push(word.toLowerCase());
    }
  });

  // Remove common question words and market-specific phrases
  const cleaned = query
    .toLowerCase()
    .replace(/\?/g, "")
    .replace(/will\s+/gi, "")
    .replace(/by\s+/gi, "")
    .replace(/\d{4}/g, "") // Remove years
    .replace(/microstrategy\s+sells\s+any\s+/gi, "")
    .replace(/microstrategy\s+/gi, "")
    .replace(/sells?\s+any\s+/gi, "")
    .replace(/hit\s+\$/gi, "price ")
    .replace(/\$\d+k/gi, "") // Remove price targets like $100k
    .replace(/\s+/g, " ")
    .trim();

  // Extract important keywords (crypto terms, company names, etc.)
  const keywords: string[] = [];
  
  // Add tickers first
  keywords.push(...tickers);
  
  // Common crypto/stock terms
  const cryptoTerms = ["bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency"];
  const stockTerms = ["stock", "shares", "spy", "nasdaq", "dow"];
  
  const words = cleaned.split(/\s+/);
  for (const word of words) {
    if (word.length > 2) { // Skip very short words
      if (cryptoTerms.some(term => word.includes(term)) || 
          stockTerms.some(term => word.includes(term))) {
        // Avoid duplicates
        if (!keywords.includes(word)) {
          keywords.push(word);
        }
      }
    }
  }
  
  // If we found specific keywords, use them; otherwise use cleaned query
  if (keywords.length > 0) {
    return keywords.join(" ");
  }
  
  // Fallback: use first 3-4 meaningful words
  const meaningfulWords = words.filter(w => w.length > 3).slice(0, 4);
  return meaningfulWords.join(" ") || cleaned;
}

function getDomainTerms(domain: string): string {
  const termMap: Record<string, string> = {
    markets: "finance cryptocurrency stocks",
    news: "politics election",
    sports: "sports NBA NFL UFC",
  };

  return termMap[domain] || "";
}

function extractSource(url: string): string {
  // If it's already a hostname (e.g. "finance.yahoo.com"), normalize it.
  if (url && !url.includes("://")) {
    const domain = url.replace(/^www\./, "");
    return domain || "Unknown";
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    return hostname.replace(/^www\./, "") || "Unknown";
  } catch {
    return "Unknown";
  }
}

function formatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  } catch {
    return "Recently";
  }
}

function calculateRelevance(item: any, query: string): "High" | "Medium" | "Low" {
  const queryLower = query.toLowerCase();
  const titleLower = (item.title || "").toLowerCase();
  const snippetLower = (item.snippet || "").toLowerCase();

  if (titleLower.includes(queryLower) || snippetLower.includes(queryLower)) {
    return "High";
  }

  // Simple relevance scoring
  const titleWords = titleLower.split(/\s+/);
  const queryWords = queryLower.split(/\s+/);
  const matchCount = queryWords.filter((word) => titleWords.includes(word)).length;

  if (matchCount >= queryWords.length * 0.5) {
    return "Medium";
  }

  return "Low";
}
