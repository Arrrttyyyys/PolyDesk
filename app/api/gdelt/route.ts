import { NextRequest, NextResponse } from "next/server";

const GDELT_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, timeframeDays = 7 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate limit
    const limitNum = parseInt(String(limit));
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 250) {
      return NextResponse.json(
        { error: "Limit must be a number between 1 and 250" },
        { status: 400 }
      );
    }

    // Validate timeframe
    const timeframeNum = parseInt(String(timeframeDays));
    if (isNaN(timeframeNum) || timeframeNum < 1 || timeframeNum > 365) {
      return NextResponse.json(
        { error: "Timeframe must be a number between 1 and 365 days" },
        { status: 400 }
      );
    }

    console.log(`[GDELT] Searching news: query="${query}", limit=${limitNum}, timeframe=${timeframeNum}d`);

    // Build GDELT API URL
    const searchParams = new URLSearchParams({
      query,
      mode: "artlist",
      maxrecords: String(limitNum),
      format: "json",
      timespan: `${timeframeNum}d`,
    });

    const url = `${GDELT_API_URL}?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GDELT] API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `GDELT API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize response
    const articles = normalizeGDELTResponse(data, limitNum);

    console.log(`[GDELT] Found ${articles.length} articles`);

    return NextResponse.json({
      query,
      timeframeDays: timeframeNum,
      totalArticles: articles.length,
      articles,
    });
  } catch (error) {
    console.error("[GDELT] Error fetching news:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch news", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * Normalize GDELT API response to standard format
 */
function normalizeGDELTResponse(data: any, limit: number): Array<{
  id: string;
  url: string;
  title: string;
  publisher: string;
  publishedAt: string;
  seenDate?: string;
  language?: string;
  domain?: string;
}> {
  const articles: Array<{
    id: string;
    url: string;
    title: string;
    publisher: string;
    publishedAt: string;
    seenDate?: string;
    language?: string;
    domain?: string;
  }> = [];

  // GDELT response structure
  if (data.articles && Array.isArray(data.articles)) {
    for (const article of data.articles.slice(0, limit)) {
      try {
        articles.push({
          id: article.url || `gdelt-${Date.now()}-${Math.random()}`,
          url: article.url || "",
          title: article.title || "Untitled",
          publisher: article.source || article.domain || article.sourcecountry || "Unknown",
          publishedAt: article.seendate || article.date || new Date().toISOString(),
          seenDate: article.seendate,
          language: article.language || "en",
          domain: article.domain || extractDomain(article.url),
        });
      } catch (err) {
        console.warn("[GDELT] Failed to parse article:", err);
        continue;
      }
    }
  }

  return articles;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "Unknown";
  }
}
