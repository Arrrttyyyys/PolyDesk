// Token Company compression tool

const TOKEN_COMPANY_API_URL =
  process.env.TOKEN_COMPANY_API_URL ||
  "https://api.thetokencompany.com/v1";
const TOKEN_COMPANY_API_KEY = process.env.TOKEN_COMPANY_API_KEY;

/**
 * Compress text using Token Company bear-1 API
 */
export async function tool_compressText(params: {
  text: string;
  aggressiveness?: number;
}): Promise<{
  compressedText: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  error?: string;
}> {
  const { text, aggressiveness = 0.5 } = params;

  if (!TOKEN_COMPANY_API_KEY) {
    return {
      compressedText: text,
      originalTokens: 0,
      compressedTokens: 0,
      compressionRatio: 1,
      error: "TOKEN_COMPANY_API_KEY not set",
    };
  }

  try {
    const response = await fetch(`${TOKEN_COMPANY_API_URL}/compress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN_COMPANY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "bear-1",
        text,
        compression_settings: {
          aggressiveness: Math.max(0.1, Math.min(0.9, aggressiveness)),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token Company API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      compressedText: data.output || text,
      originalTokens: data.original_input_tokens || 0,
      compressedTokens: data.output_tokens || 0,
      compressionRatio:
        data.original_input_tokens > 0
          ? data.output_tokens / data.original_input_tokens
          : 1,
    };
  } catch (error) {
    return {
      compressedText: text,
      originalTokens: 0,
      compressedTokens: 0,
      compressionRatio: 1,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
