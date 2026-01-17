import { NextRequest, NextResponse } from "next/server";

// Google Custom Search API for Google News
const GOOGLE_NEWS_API_KEY = process.env.GOOGLE_NEWS_API_KEY;
const GOOGLE_NEWS_CX = process.env.GOOGLE_NEWS_CX; // Custom Search Engine ID for news.google.com

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
      // Build search query with domain-specific terms
      const domainTerms = getDomainTerms(domain);
      // Force results to come from Google News (helps when CSE is set to search the entire web)
      const searchQuery = `${query} ${domainTerms} site:news.google.com`;
      
      const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_NEWS_API_KEY}&cx=${GOOGLE_NEWS_CX}&q=${encodeURIComponent(searchQuery)}&num=${Math.min(limit, 10)}&lr=lang_en`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `Google News API error: ${response.status}`, details: error },
          { status: response.status }
        );
      }

      const data = await response.json();

      const articles = data.items?.map((item: any, index: number) => ({
        id: `news-${index}-${Date.now()}`,
        title: item.title || "Untitled",
        // `displayLink` is usually a hostname (not a URL). Prefer it if present.
        source: extractSource(item.displayLink || item.link),
        timestamp: formatTimestamp(item.pagemap?.metatags?.[0]?.["article:published_time"] || new Date().toISOString()),
        relevance: calculateRelevance(item, query),
        compressed: false,
        url: item.link,
        description: item.snippet,
      })) || [];

      return NextResponse.json({ articles });
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
