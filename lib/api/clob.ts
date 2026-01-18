// Polymarket CLOB API client

const CLOB_API_URL = "https://clob.polymarket.com";

/**
 * Get the price for a token (BUY side)
 */
export async function getTokenPrice(tokenId: string, side: "BUY" | "SELL" = "BUY"): Promise<number | null> {
  if (!tokenId || tokenId.trim() === "") {
    console.warn("[CLOB] getTokenPrice called with empty tokenId");
    return null;
  }

  try {
    const url = `${CLOB_API_URL}/price?token_id=${tokenId}&side=${side}`;
    console.log(`[CLOB] Fetching price from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CLOB] Failed to fetch price for token ${tokenId}: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[CLOB] Response for token ${tokenId}:`, data);
    
    // CLOB API returns { price: "0.053" } or { price: 0.053 } format
    const priceStr = data.price || data.midpoint || data.value || "0";
    const price = typeof priceStr === "string" ? parseFloat(priceStr) : priceStr;
    
    if (isNaN(price) || price <= 0) {
      console.warn(`[CLOB] Invalid price returned for token ${tokenId}: ${priceStr} (parsed as ${price})`);
      return null;
    }
    
    console.log(`[CLOB] Successfully parsed price for token ${tokenId}: ${price}`);
    return price;
  } catch (error) {
    console.error(`[CLOB] Error fetching price for token ${tokenId}:`, error);
    return null;
  }
}

/**
 * Get the midpoint price for a token (for backward compatibility)
 */
export async function getMidpoint(tokenId: string): Promise<number | null> {
  return getTokenPrice(tokenId, "BUY");
}

/**
 * Get prices for YES and NO tokens
 */
export async function getMarketPrices(
  yesTokenId?: string,
  noTokenId?: string
): Promise<{ yesPrice: number; noPrice: number }> {
  let yesPrice = 0;
  let noPrice = 0;

  // Fetch both prices in parallel for better performance
  const [yesPriceResult, noPriceResult] = await Promise.all([
    yesTokenId ? getTokenPrice(yesTokenId, "BUY") : Promise.resolve(null),
    noTokenId ? getTokenPrice(noTokenId, "BUY") : Promise.resolve(null),
  ]);

  if (yesPriceResult !== null) {
    yesPrice = yesPriceResult;
    // If we have YES price but no NO price, infer NO price
    if (noPriceResult === null && yesPrice > 0 && yesPrice < 1) {
      noPrice = 1 - yesPrice;
    }
  }

  if (noPriceResult !== null) {
    noPrice = noPriceResult;
    // If we have NO price but no YES price, infer YES price
    if (yesPriceResult === null && noPrice > 0 && noPrice < 1) {
      yesPrice = 1 - noPrice;
    }
  }

  return { yesPrice, noPrice };
}

