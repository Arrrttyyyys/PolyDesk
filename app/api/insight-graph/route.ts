import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { market, compressedContext } = body;

    if (!market || !compressedContext) {
      return NextResponse.json(
        { error: "Market and compressedContext are required" },
        { status: 400 }
      );
    }

    const prompt = `You build compact inference graphs for prediction markets.
Return JSON only with this shape:
{
  "nodes": [{"id":"n1","label":"...","type":"event|market|signal|risk|source"}],
  "edges": [{"from":"n1","to":"n2","relation":"causes|supports|risks|depends_on|updates"}]
}

Market:
Title: ${market.title}
YES: ${market.yesPrice}
NO: ${market.noPrice}
Probability: ${market.probability}%
Resolution: ${market.resolution}

Context (compressed):
${compressedContext}`;

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
                  text: `You are a market research analyst. Respond ONLY with valid JSON.`,
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 0.9,
            maxOutputTokens: 1200,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: "No content in Gemini response" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate insight graph", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

