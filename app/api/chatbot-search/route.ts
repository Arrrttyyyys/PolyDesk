import { NextRequest, NextResponse } from "next/server";
import { mapEventsToMarkets, type PolymarketEvent } from "@/lib/api/polymarket";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

type SearchEventResult = {
  eventId: string;
  eventTitle: string;
  score: number;
  topMarket: {
    id: string;
    title: string;
    probability: number;
    volume: string;
  } | null;
  markets: ReturnType<typeof mapEventsToMarkets>;
};

const toKeywordsFallback = (query: string) =>
  Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    )
  ).slice(0, 12);

async function expandKeywords(query: string): Promise<string[]> {
  if (!GEMINI_API_KEY) return toKeywordsFallback(query);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You expand search queries for prediction markets.
Return a JSON object: {"keywords":["term1","term2",...]}.
Include synonyms, related entities, leagues, teams, and event types.
Only include short phrases (1-3 words). Query: "${query}"`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 20,
            topP: 0.9,
            maxOutputTokens: 400,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      return toKeywordsFallback(query);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return toKeywordsFallback(query);

    const parsed = JSON.parse(content);
    if (!parsed?.keywords || !Array.isArray(parsed.keywords)) {
      return toKeywordsFallback(query);
    }

    const cleaned = parsed.keywords
      .map((k: string) => k.toLowerCase().trim())
      .filter(Boolean);
    return Array.from(new Set([...cleaned, ...toKeywordsFallback(query)])).slice(0, 16);
  } catch {
    return toKeywordsFallback(query);
  }
}

function scoreEvent(event: PolymarketEvent, keywords: string[]) {
  const title = (event.title ?? "").toLowerCase();
  const description = (event.description ?? "").toLowerCase();
  const slug = (event.slug ?? "").toLowerCase();
  const tags = (event.tags || [])
    .map((tag) => (typeof tag === "string" ? tag : (tag as any)?.label ?? (tag as any)?.slug))
    .filter(Boolean)
    .map((tag) => String(tag).toLowerCase());
  const questions = (event.markets || [])
    .map((market) => (market.question ?? "").toLowerCase())
    .filter(Boolean);

  let score = 0;
  for (const keyword of keywords) {
    if (title.includes(keyword)) score += 5;
    if (description.includes(keyword)) score += 3;
    if (slug.includes(keyword)) score += 2;
    if (tags.some((tag) => tag.includes(keyword))) score += 2;
    if (questions.some((q) => q.includes(keyword))) score += 1;
  }

  return score;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body?.query ?? "").trim();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const keywords = await expandKeywords(query);

    const res = await fetch(
      `${GAMMA_API_URL}/events?active=true&closed=false&limit=500`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const details = await res.text();
      return NextResponse.json(
        { error: `Gamma API error: ${res.status}`, details },
        { status: res.status }
      );
    }

    const events = (await res.json()) as PolymarketEvent[];
    const scored = events
      .map((event) => ({ event, score: scoreEvent(event, keywords) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const results: SearchEventResult[] = scored.map(({ event, score }) => {
      const markets = mapEventsToMarkets([event]);
      const topMarket =
        markets.length > 0
          ? [...markets].sort((a, b) => b.probability - a.probability)[0]
          : null;
      return {
        eventId: event.id,
        eventTitle: event.title,
        score,
        topMarket: topMarket
          ? {
              id: topMarket.id,
              title: topMarket.title,
              probability: topMarket.probability,
              volume: topMarket.volume,
            }
          : null,
        markets,
      };
    });

    return NextResponse.json({
      query,
      keywords,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to search markets", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

