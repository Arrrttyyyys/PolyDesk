import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Use Gemini by default, fallback to OpenAI, then Anthropic
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
    const { market, compressedArticles, domain } = body;

    if (!market || !compressedArticles || !Array.isArray(compressedArticles)) {
      return NextResponse.json(
        { error: "Market and compressedArticles array are required" },
        { status: 400 }
      );
    }

    const articlesText = compressedArticles
      .map((article: string, index: number) => `[m${index + 1}] ${article}`)
      .join("\n\n");

    const prompt = `Analyze this ${domain} prediction market and provide a structured trading thesis.

Market: ${market.title}
Current YES Price: $${market.yesPrice.toFixed(2)}
Current NO Price: $${market.noPrice.toFixed(2)}
Implied Probability: ${market.probability}%
Resolution Date: ${market.resolution}

Compressed Research Articles:
${articlesText}

Provide a JSON response with the following structure:
{
  "summary": "2-3 sentence executive summary",
  "evidence": ["evidence point 1", "evidence point 2", "evidence point 3"],
  "counterpoints": ["risk/counterpoint 1", "risk/counterpoint 2"],
  "catalysts": {
    "bullish": ["bullish trigger 1", "bullish trigger 2"],
    "bearish": ["bearish trigger 1", "bearish trigger 2"]
  },
  "recommendation": "BUY YES" | "BUY NO" | "WAIT",
  "confidence": 0-100,
  "riskLevel": "Low" | "Medium" | "High"
}`;

    let thesisData;

    if (LLM_PROVIDER === "gemini") {
      // Google Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
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
                    text: `You are a professional prediction market analyst. Provide structured, data-driven analysis in JSON format.

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
        thesisData = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON if wrapped in text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          thesisData = JSON.parse(jsonMatch[0]);
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
              content: "You are a professional prediction market analyst. Provide structured, data-driven analysis in JSON format.",
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
      thesisData = JSON.parse(data.choices[0].message.content);
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
      
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        thesisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse JSON from LLM response");
      }
    }

    return NextResponse.json(thesisData);
  } catch (error) {
    console.error("Thesis generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate thesis", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

