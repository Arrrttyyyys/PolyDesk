import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const LLM_PROVIDER = GEMINI_API_KEY ? "gemini" : OPENAI_API_KEY ? "openai" : ANTHROPIC_API_KEY ? "anthropic" : null;

export async function POST(request: NextRequest) {
  if (!LLM_PROVIDER) {
    return NextResponse.json(
      { error: "LLM API key not configured (GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY required)" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { portfolioLegs, compressedContext, compressionLevel } = body;

    if (!portfolioLegs || !Array.isArray(portfolioLegs) || portfolioLegs.length === 0) {
      return NextResponse.json(
        { error: "Portfolio legs are required" },
        { status: 400 }
      );
    }

    const portfolioSummary = portfolioLegs
      .map(
        (leg: any, idx: number) =>
          `${idx + 1}. ${leg.marketTitle} - ${leg.side.toUpperCase()} ${leg.outcome.toUpperCase()} @ $${leg.entryPrice.toFixed(2)} (Size: ${leg.size})`
      )
      .join("\n");

    const prompt = `Generate a professional trade memo for this prediction market portfolio.

Portfolio Positions:
${portfolioSummary}

Compressed Context:
${compressedContext || "No additional context provided."}

Provide a JSON response with:
{
  "strategy": "Brief strategy explanation",
  "payoff": "Payoff intuition explanation",
  "risks": ["risk 1", "risk 2", "risk 3"],
  "hedges": ["suggested hedge 1", "suggested hedge 2"],
  "scenarios": ["bull case scenario", "base case scenario", "bear case scenario"],
  "changeFactors": ["factor that would change mind 1", "factor 2"]
}`;

    let memoData;

    if (LLM_PROVIDER === "gemini") {
      // Google Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a professional trading analyst. Provide structured trade memos in JSON format.

${prompt}

IMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, code blocks, or additional text.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2000,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `Gemini API error: ${response.status}`, details: error },
          { status: response.status }
        );
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error("No content in Gemini response");
      }

      // Parse JSON response
      try {
        memoData = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON if wrapped in text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          memoData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse JSON from Gemini response");
        }
      }
    } else if (LLM_PROVIDER === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a professional trading analyst. Provide structured trade memos in JSON format.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `OpenAI API error: ${response.status}`, details: error },
          { status: response.status }
        );
      }

      const data = await response.json();
      memoData = JSON.parse(data.choices[0].message.content);
    } else {
      // Anthropic Claude
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { error: `Anthropic API error: ${response.status}`, details: error },
          { status: response.status }
        );
      }

      const data = await response.json();
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        memoData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON from LLM response");
      }
    }

    return NextResponse.json(memoData);
  } catch (error) {
    console.error("Memo generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate memo", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

