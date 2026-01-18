// News agent tools
import { Source, SourceSchema } from "@/lib/agent/schemas";
import * as cheerio from "cheerio";

const GDELT_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

// ============================================================================
// GDELT NEWS TOOLS
// ============================================================================

/**
 * Search news using GDELT (keyless)
 */
export async function tool_searchNews(params: {
  query: string;
  limit?: number;
  timeframeDays?: number;
}): Promise<{
  articles: Array<{
    url: string;
    title: string;
    publisher: string;
    publishedAt: string;
  }>;
  error?: string;
}> {
  const { query, limit = 10, timeframeDays = 7 } = params;

  try {
    const searchParams = new URLSearchParams({
      query,
      mode: "artlist",
      maxrecords: String(limit),
      format: "json",
      timespan: `${timeframeDays}d`,
    });

    const url = `${GDELT_API_URL}?${searchParams.toString()}`;

    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`GDELT API error: ${response.status}`);
    }

    const data = await response.json();
    const articles: Array<{
      url: string;
      title: string;
      publisher: string;
      publishedAt: string;
    }> = [];

    // Parse GDELT response
    if (data.articles && Array.isArray(data.articles)) {
      for (const article of data.articles.slice(0, limit)) {
        articles.push({
          url: article.url || "",
          title: article.title || "Untitled",
          publisher: article.domain || article.source || "Unknown",
          publishedAt:
            article.seendate || article.date || new Date().toISOString(),
        });
      }
    }

    return { articles };
  } catch (error) {
    return {
      articles: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract article content using cheerio
 */
export async function tool_extractArticle(params: {
  url: string;
}): Promise<{
  source: Source | null;
  error?: string;
}> {
  const { url } = params;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script, style, nav, header, footer, iframe, noscript").remove();

    // Extract title
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      $("h1").first().text() ||
      "Untitled";
    title = title.trim();

    // Extract publisher
    let publisher =
      $('meta[property="og:site_name"]').attr("content") ||
      $('meta[name="author"]').attr("content") ||
      new URL(url).hostname;
    publisher = publisher.trim();

    // Extract publish date
    let publishedAt =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="publish-date"]').attr("content") ||
      $('time[datetime]').attr("datetime") ||
      new Date().toISOString();

    // Extract main content
    let extractedText = "";

    // Try to find article body
    const contentSelectors = [
      "article",
      '[role="article"]',
      ".article-content",
      ".post-content",
      ".entry-content",
      "main",
      ".content",
      "#content",
    ];

    for (const selector of contentSelectors) {
      const content = $(selector);
      if (content.length > 0) {
        extractedText = content.text();
        break;
      }
    }

    // Fallback to all paragraphs
    if (!extractedText || extractedText.length < 100) {
      extractedText = $("p")
        .map((_, el) => $(el).text())
        .get()
        .join("\n\n");
    }

    // Clean and limit text
    extractedText = extractedText
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 50000); // Limit to 50k chars

    if (!extractedText || extractedText.length < 50) {
      throw new Error("Failed to extract meaningful content");
    }

    const source: Source = {
      url,
      title,
      publisher,
      publishedAt,
      extractedText,
      evidenceSnippets: [],
    };

    return { source: SourceSchema.parse(source) };
  } catch (error) {
    return {
      source: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Score stance and sentiment for an article
 */
export async function tool_scoreStanceSentiment(params: {
  marketQuestion: string;
  outcomeNames: { yes: string; no: string };
  articleText: string;
}): Promise<{
  stance: "bullish" | "bearish" | "neutral";
  sentiment: number;
  evidenceSnippets: string[];
  error?: string;
}> {
  const { marketQuestion, outcomeNames, articleText } = params;

  try {
    // Simple heuristic-based stance/sentiment analysis
    // In production, use an LLM or sentiment analysis API

    const text = articleText.toLowerCase();
    const questionLower = marketQuestion.toLowerCase();
    const yesLower = outcomeNames.yes.toLowerCase();
    const noLower = outcomeNames.no.toLowerCase();

    // Extract relevant snippets
    const snippets: string[] = [];
    const sentences = articleText.split(/[.!?]+/).filter((s) => s.length > 20);

    for (const sentence of sentences) {
      const sentLower = sentence.toLowerCase();
      if (
        sentLower.includes(questionLower) ||
        sentLower.includes(yesLower) ||
        sentLower.includes(noLower)
      ) {
        snippets.push(sentence.trim());
        if (snippets.length >= 5) break;
      }
    }

    // Score sentiment using keyword matching
    const positiveWords = [
      "likely",
      "will",
      "expected",
      "confident",
      "strong",
      "bullish",
      "favor",
      "support",
      "increase",
      "growth",
    ];
    const negativeWords = [
      "unlikely",
      "won't",
      "doubt",
      "weak",
      "bearish",
      "against",
      "decline",
      "decrease",
      "risk",
      "concern",
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of positiveWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      positiveScore += (text.match(regex) || []).length;
    }

    for (const word of negativeWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      negativeScore += (text.match(regex) || []).length;
    }

    // Calculate sentiment (-1 to 1)
    const totalScore = positiveScore + negativeScore;
    const sentiment =
      totalScore > 0
        ? (positiveScore - negativeScore) / totalScore
        : 0;

    // Determine stance
    let stance: "bullish" | "bearish" | "neutral";
    if (sentiment > 0.2) {
      stance = "bullish";
    } else if (sentiment < -0.2) {
      stance = "bearish";
    } else {
      stance = "neutral";
    }

    return {
      stance,
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      evidenceSnippets: snippets.slice(0, 5),
    };
  } catch (error) {
    return {
      stance: "neutral",
      sentiment: 0,
      evidenceSnippets: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
