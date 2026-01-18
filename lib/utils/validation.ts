/**
 * Validate market ID format
 */
export function isValidMarketId(id: string): boolean {
  return typeof id === "string" && id.length > 0;
}

/**
 * Validate probability (0-1)
 */
export function isValidProbability(prob: number): boolean {
  return typeof prob === "number" && prob >= 0 && prob <= 1;
}

/**
 * Validate price (0-1 for binary markets)
 */
export function isValidPrice(price: number): boolean {
  return typeof price === "number" && price >= 0 && price <= 1;
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

/**
 * Validate API key format
 */
export function isValidApiKey(key: string): boolean {
  return typeof key === "string" && key.length > 10 && !key.includes("REPLACE");
}
