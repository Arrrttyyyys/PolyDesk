import { OrderbookLevel } from "./types";

export function generateOrderbook(midPrice: number): OrderbookLevel[] {
  const levels: OrderbookLevel[] = [];
  const spread = 0.02; // 2% spread
  const tickSize = 0.01;
  
  // Generate asks (above mid price)
  let askCumulative = 0;
  for (let i = 5; i >= 1; i--) {
    const price = midPrice + (spread / 2) + (i * tickSize);
    const size = Math.random() * 5000 + 2000;
    askCumulative += size;
    levels.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size),
      cumulative: Math.round(askCumulative),
      type: "ask",
    });
  }
  
  // Generate bids (below mid price)
  let bidCumulative = 0;
  for (let i = 1; i <= 5; i++) {
    const price = midPrice - (spread / 2) - (i * tickSize);
    const size = Math.random() * 5000 + 2000;
    bidCumulative += size;
    levels.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size),
      cumulative: Math.round(bidCumulative),
      type: "bid",
    });
  }
  
  // Sort by price descending (asks first, then bids)
  return levels.sort((a, b) => b.price - a.price);
}

export function calculateSlippage(
  orderbook: OrderbookLevel[],
  size: number,
  side: "buy" | "sell",
  midPrice: number
): {
  avgFillPrice: number;
  slippagePercent: number;
  slippageCost: number;
} {
  const relevantLevels = orderbook.filter(
    (level) => level.type === (side === "buy" ? "ask" : "bid")
  );
  
  let remainingSize = size;
  let totalCost = 0;
  
  for (const level of relevantLevels) {
    if (remainingSize <= 0) break;
    
    const fillSize = Math.min(remainingSize, level.size);
    totalCost += fillSize * level.price;
    remainingSize -= fillSize;
  }
  
  // If we couldn't fill the full order, use worst case
  if (remainingSize > 0) {
    const worstPrice = relevantLevels[relevantLevels.length - 1]?.price || midPrice;
    totalCost += remainingSize * worstPrice;
  }
  
  const avgFillPrice = totalCost / size;
  const slippagePercent = ((avgFillPrice - midPrice) / midPrice) * 100;
  const slippageCost = (avgFillPrice - midPrice) * size;
  
  return {
    avgFillPrice: Math.round(avgFillPrice * 100) / 100,
    slippagePercent: Math.round(slippagePercent * 100) / 100,
    slippageCost: Math.round(slippageCost * 100) / 100,
  };
}

