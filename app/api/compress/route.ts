import { NextRequest, NextResponse } from "next/server";

const TOKEN_COMPANY_API_URL = process.env.TOKEN_COMPANY_API_URL || "https://api.thetokencompany.com/v1";
const TOKEN_COMPANY_API_KEY = process.env.TOKEN_COMPANY_API_KEY;

export async function POST(request: NextRequest) {
  if (!TOKEN_COMPANY_API_KEY) {
    return NextResponse.json(
      { error: "Token Company API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { text, aggressiveness = 0.7 } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${TOKEN_COMPANY_API_URL}/compress`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN_COMPANY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "bear-1",
        // Token Company expects `input` (string). Keep `text` as a fallback for compatibility.
        input: text,
        text,
        compression_settings: {
          aggressiveness: Math.max(0.3, Math.min(0.95, aggressiveness)),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Token Company API error: ${response.status}`, details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Token Company API response format:
    // - output: compressed text
    // - output_tokens: tokens in compressed output
    // - original_input_tokens: tokens in original input
    // - compression_time: time taken to compress
    
    const tokensBefore = data.original_input_tokens || 0;
    const tokensAfter = data.output_tokens || 0;
    const saved = tokensBefore > 0
      ? Math.round(((tokensBefore - tokensAfter) / tokensBefore) * 100)
      : 0;

    return NextResponse.json({
      compressed: data.output || data.compressed_text || data.compressed,
      tokensBefore,
      tokensAfter,
      saved,
      compressionTime: data.compression_time,
    });
  } catch (error) {
    console.error("Compression error:", error);
    return NextResponse.json(
      { error: "Failed to compress text", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

