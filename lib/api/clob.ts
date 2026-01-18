// Polymarket CLOB API client

const CLOB_API_URL = "https://clob.polymarket.com";

/**
 * Get the price for a token (BUY side)
 */
export async function getTokenPrice(
  tokenId: string,
  side: "BUY" | "SELL" = "BUY"
): Promise<{ price: number | null; noOrderbook: boolean }> {
  if (!tokenId || tokenId.trim() === "") {
    return { price: null, noOrderbook: false };
  }

  try {
    const url = `${CLOB_API_URL}/price?token_id=${tokenId}&side=${side}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404 && errorText.includes("No orderbook exists")) {
        return { price: null, noOrderbook: true };
      }
      console.error(
        `[CLOB] Failed to fetch price for token ${tokenId}: ${response.status} - ${errorText}`
      );
      return { price: null, noOrderbook: false };
    }

    const data = await response.json();
    
    // CLOB API returns { price: "0.053" } or { price: 0.053 } format
    const priceStr = data.price || data.midpoint || data.value || "0";
    const price = typeof priceStr === "string" ? parseFloat(priceStr) : priceStr;
    
    if (isNaN(price) || price <= 0) {
      return { price: null, noOrderbook: false };
    }
    
    return { price, noOrderbook: false };
  } catch (error) {
    console.error(`[CLOB] Error fetching price for token ${tokenId}:`, error);
    return { price: null, noOrderbook: false };
  }
}

/**
 * Get the midpoint price for a token (for backward compatibility)
 */
export async function getMidpoint(tokenId: string): Promise<number | null> {
  const result = await getTokenPrice(tokenId, "BUY");
  return result.price;
}

/**
 * Get prices for YES and NO tokens
 */
export async function getMarketPrices(
  yesTokenId?: string,
  noTokenId?: string
): Promise<{
  yesPrice: number;
  noPrice: number;
  yesNoOrderbook: boolean;
  noNoOrderbook: boolean;
}> {
  let yesPrice = 0;
  let noPrice = 0;
  let yesNoOrderbook = false;
  let noNoOrderbook = false;

  // Fetch both prices in parallel for better performance
  const [yesPriceResult, noPriceResult] = await Promise.all([
    yesTokenId ? getTokenPrice(yesTokenId, "BUY") : Promise.resolve({ price: null, noOrderbook: false }),
    noTokenId ? getTokenPrice(noTokenId, "BUY") : Promise.resolve({ price: null, noOrderbook: false }),
  ]);

  yesNoOrderbook = yesPriceResult.noOrderbook;
  noNoOrderbook = noPriceResult.noOrderbook;

  if (yesPriceResult.price !== null) {
    yesPrice = yesPriceResult.price;
    // If we have YES price but no NO price, infer NO price
    if (noPriceResult.price === null && yesPrice > 0 && yesPrice < 1) {
      noPrice = 1 - yesPrice;
    }
  }

  if (noPriceResult.price !== null) {
    noPrice = noPriceResult.price;
    // If we have NO price but no YES price, infer YES price
    if (yesPriceResult.price === null && noPrice > 0 && noPrice < 1) {
      yesPrice = 1 - noPrice;
    }
  }

  return { yesPrice, noPrice, yesNoOrderbook, noNoOrderbook };
}

