// Strategy agent tools
import {
  MarketCard,
  StrategyLeg,
  Strategy,
  PayoffPoint,
  ScenarioGridCell,
  Trigger,
  BacktestResult,
  PriceDataPoint,
} from "@/lib/agent/schemas";

// ============================================================================
// HEDGE SUGGESTIONS
// ============================================================================

/**
 * Suggest hedge markets based on correlations and stance signals
 */
export async function tool_suggestHedges(params: {
  primaryMarket: MarketCard;
  candidateMarkets: MarketCard[];
  correlations: Array<{
    token1: string;
    token2: string;
    correlation: number;
  }>;
  stanceSignals?: Array<{
    marketId: string;
    stance: "bullish" | "bearish" | "neutral";
    confidence: number;
  }>;
  inefficiencies?: Array<{
    type: string;
    primaryMarketId: string;
    relatedMarketId?: string;
    score: number;
  }>;
}): Promise<{
  hedges: Array<{
    market: MarketCard;
    correlation: number;
    hedgeRatio: number;
    rationale: string;
    confidence: number;
  }>;
  error?: string;
}> {
  const {
    primaryMarket,
    candidateMarkets,
    correlations,
    stanceSignals = [],
    inefficiencies = [],
  } = params;

  try {
    const hedges: Array<{
      market: MarketCard;
      correlation: number;
      hedgeRatio: number;
      rationale: string;
      confidence: number;
    }> = [];

    const primaryTokenId = primaryMarket.yesTokenId || primaryMarket.id;

    for (const candidate of candidateMarkets) {
      const candidateTokenId = candidate.yesTokenId || candidate.id;

      // Find correlation
      const corr = correlations.find(
        (c) =>
          (c.token1 === primaryTokenId && c.token2 === candidateTokenId) ||
          (c.token2 === primaryTokenId && c.token1 === candidateTokenId)
      );

      if (!corr) continue;

      // Negative correlation = good hedge
      if (corr.correlation < -0.3) {
        const hedgeRatio = Math.abs(corr.correlation);
        const stance = stanceSignals.find(
          (s) => s.marketId === candidate.id
        );

        let rationale = `Negative correlation (${(corr.correlation * 100).toFixed(0)}%) provides downside protection`;
        if (stance) {
          rationale += `. ${stance.stance === "bullish" ? "Bullish" : stance.stance === "bearish" ? "Bearish" : "Neutral"} sentiment detected`;
        }

        // Check for inefficiencies
        const ineff = inefficiencies.find(
          (i) =>
            i.primaryMarketId === primaryTokenId &&
            i.relatedMarketId === candidateTokenId
        );
        if (ineff) {
          rationale += `. ${ineff.type} opportunity (score: ${ineff.score.toFixed(2)})`;
        }

        const confidence = stance ? stance.confidence * 0.7 + 0.3 : 0.6;

        hedges.push({
          market: candidate,
          correlation: corr.correlation,
          hedgeRatio,
          rationale,
          confidence,
        });
      }
      // Positive correlation = spread trade opportunity
      else if (corr.correlation > 0.7) {
        const ineff = inefficiencies.find(
          (i) =>
            i.primaryMarketId === primaryTokenId &&
            i.relatedMarketId === candidateTokenId &&
            i.type === "arbitrage"
        );

        if (ineff) {
          hedges.push({
            market: candidate,
            correlation: corr.correlation,
            hedgeRatio: 1,
            rationale: `High correlation (${(corr.correlation * 100).toFixed(0)}%) with divergence detected - spread trade opportunity`,
            confidence: 0.8,
          });
        }
      }
    }

    // Sort by confidence
    hedges.sort((a, b) => b.confidence - a.confidence);

    return { hedges: hedges.slice(0, 5) };
  } catch (error) {
    return {
      hedges: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// STRATEGY BUILDER
// ============================================================================

/**
 * Build strategy template with legs and triggers
 */
export async function tool_buildStrategyTemplate(params: {
  primaryMarket: MarketCard;
  hedges: Array<{
    market: MarketCard;
    correlation: number;
    hedgeRatio: number;
    rationale: string;
  }>;
  style: "conservative" | "moderate" | "aggressive";
}): Promise<{
  strategy: Strategy;
  error?: string;
}> {
  const { primaryMarket, hedges, style } = params;

  try {
    const legs: StrategyLeg[] = [];

    // Primary leg
    const primarySize = style === "conservative" ? 100 : style === "moderate" ? 200 : 500;
    const primaryOutcome: "yes" | "no" = primaryMarket.yesPrice < 0.5 ? "yes" : "no";

    legs.push({
      marketId: primaryMarket.id,
      marketTitle: primaryMarket.question,
      side: "buy",
      outcome: primaryOutcome,
      size: primarySize,
      entryPrice: primaryOutcome === "yes" ? primaryMarket.yesPrice : primaryMarket.noPrice,
      currentPrice: primaryOutcome === "yes" ? primaryMarket.yesPrice : primaryMarket.noPrice,
      tokenId: primaryOutcome === "yes" ? primaryMarket.yesTokenId : primaryMarket.noTokenId,
      rationale: "Primary position",
    });

    // Hedge legs
    for (const hedge of hedges.slice(0, style === "conservative" ? 1 : style === "moderate" ? 2 : 3)) {
      const hedgeSize = Math.floor(primarySize * hedge.hedgeRatio);
      const hedgeOutcome: "yes" | "no" =
        hedge.correlation < 0 ? primaryOutcome : primaryOutcome === "yes" ? "no" : "yes";

      legs.push({
        marketId: hedge.market.id,
        marketTitle: hedge.market.question,
        side: "buy",
        outcome: hedgeOutcome,
        size: hedgeSize,
        entryPrice: hedgeOutcome === "yes" ? hedge.market.yesPrice : hedge.market.noPrice,
        currentPrice: hedgeOutcome === "yes" ? hedge.market.yesPrice : hedge.market.noPrice,
        tokenId: hedgeOutcome === "yes" ? hedge.market.yesTokenId : hedge.market.noTokenId,
        rationale: hedge.rationale,
      });
    }

    // Build triggers
    const triggers: Trigger[] = [];

    // Entry trigger
    triggers.push({
      type: "entry",
      condition: `Enter when primary market ${primaryOutcome.toUpperCase()} price is below ${(legs[0].entryPrice * 1.05).toFixed(3)}`,
      marketId: primaryMarket.id,
      priceLevel: legs[0].entryPrice * 1.05,
    });

    // Take profit
    triggers.push({
      type: "exit",
      condition: `Take profit at ${style === "conservative" ? "15%" : style === "moderate" ? "25%" : "40%"} gain`,
      marketId: primaryMarket.id,
      priceLevel: legs[0].entryPrice * (style === "conservative" ? 1.15 : style === "moderate" ? 1.25 : 1.4),
    });

    // Stop loss
    triggers.push({
      type: "exit",
      condition: `Stop loss at ${style === "conservative" ? "10%" : style === "moderate" ? "15%" : "25%"} loss`,
      marketId: primaryMarket.id,
      priceLevel: legs[0].entryPrice * (style === "conservative" ? 0.9 : style === "moderate" ? 0.85 : 0.75),
    });

    // Time stop
    if (primaryMarket.endDate) {
      triggers.push({
        type: "unwind",
        condition: "Unwind 7 days before resolution",
        timeCondition: primaryMarket.endDate,
      });
    }

    const strategy: Strategy = {
      legs,
      triggers,
      payoffCurve: [],
      scenarioGrid: [],
      backtestResults: [],
    };

    return { strategy };
  } catch (error) {
    return {
      strategy: { legs: [], triggers: [], payoffCurve: [], scenarioGrid: [], backtestResults: [] },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// PAYOFF SIMULATION
// ============================================================================

/**
 * Simulate payoff curve and scenario grid
 */
export async function tool_simulatePayoff(params: {
  legs: StrategyLeg[];
}): Promise<{
  payoffCurve: PayoffPoint[];
  scenarioGrid: ScenarioGridCell[];
  maxRisk: number;
  expectedReturn: number;
  error?: string;
}> {
  const { legs } = params;

  try {
    if (legs.length === 0) {
      throw new Error("No strategy legs provided");
    }

    const payoffCurve: PayoffPoint[] = [];
    const scenarioGrid: ScenarioGridCell[] = [];

    // Calculate total cost
    const totalCost = legs.reduce(
      (sum, leg) => sum + leg.entryPrice * leg.size,
      0
    );

    // Generate payoff curve (primary market outcomes)
    const primaryLeg = legs[0];
    const scenarios = [
      { name: "Primary YES resolves", primaryYes: true, prob: primaryLeg.entryPrice },
      { name: "Primary NO resolves", primaryYes: false, prob: 1 - primaryLeg.entryPrice },
    ];

    for (const scenario of scenarios) {
      let pnl = 0;

      for (const leg of legs) {
        const isPrimary = leg.marketId === primaryLeg.marketId;
        const legResolves =
          (isPrimary && scenario.primaryYes && leg.outcome === "yes") ||
          (isPrimary && !scenario.primaryYes && leg.outcome === "no") ||
          (!isPrimary && Math.random() > 0.5); // Simplified for hedges

        if (legResolves) {
          pnl += leg.size * (1 - leg.entryPrice);
        } else {
          pnl -= leg.size * leg.entryPrice;
        }
      }

      payoffCurve.push({
        scenario: scenario.name,
        pnl,
        probability: scenario.prob,
      });
    }

    // Scenario grid (2x2 for primary + first hedge)
    if (legs.length > 1) {
      const hedgeLeg = legs[1];
      const outcomes: Array<"yes" | "no"> = ["yes", "no"];

      for (const primaryOutcome of outcomes) {
        for (const hedgeOutcome of outcomes) {
          let pnl = 0;

          // Primary leg
          if (
            (primaryOutcome === "yes" && primaryLeg.outcome === "yes") ||
            (primaryOutcome === "no" && primaryLeg.outcome === "no")
          ) {
            pnl += primaryLeg.size * (1 - primaryLeg.entryPrice);
          } else {
            pnl -= primaryLeg.size * primaryLeg.entryPrice;
          }

          // Hedge leg
          if (
            (hedgeOutcome === "yes" && hedgeLeg.outcome === "yes") ||
            (hedgeOutcome === "no" && hedgeLeg.outcome === "no")
          ) {
            pnl += hedgeLeg.size * (1 - hedgeLeg.entryPrice);
          } else {
            pnl -= hedgeLeg.size * hedgeLeg.entryPrice;
          }

          scenarioGrid.push({
            market1Outcome: primaryOutcome,
            market2Outcome: hedgeOutcome,
            pnl,
            probability:
              (primaryOutcome === "yes" ? primaryLeg.entryPrice : 1 - primaryLeg.entryPrice) *
              (hedgeOutcome === "yes" ? hedgeLeg.entryPrice : 1 - hedgeLeg.entryPrice),
          });
        }
      }
    }

    // Calculate metrics
    const maxRisk = Math.min(...payoffCurve.map((p) => p.pnl));
    const expectedReturn = payoffCurve.reduce(
      (sum, p) => sum + p.pnl * (p.probability || 0.5),
      0
    );

    return {
      payoffCurve,
      scenarioGrid,
      maxRisk,
      expectedReturn,
    };
  } catch (error) {
    return {
      payoffCurve: [],
      scenarioGrid: [],
      maxRisk: 0,
      expectedReturn: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// BACKTEST
// ============================================================================

/**
 * Backtest triggers using historical prices
 */
export async function tool_backtestTriggers(params: {
  legs: StrategyLeg[];
  triggers: Trigger[];
  priceHistories: Array<{
    marketId: string;
    history: PriceDataPoint[];
  }>;
}): Promise<{
  backtestResults: BacktestResult[];
  totalPnl: number;
  sharpeRatio: number;
  error?: string;
}> {
  const { legs, triggers, priceHistories } = params;

  try {
    const backtestResults: BacktestResult[] = [];
    let cumulativePnl = 0;

    // Find entry points
    const entryTriggers = triggers.filter((t) => t.type === "entry");
    const exitTriggers = triggers.filter((t) => t.type === "exit");

    let position: "open" | "closed" = "closed";
    let entryPrices: Record<string, number> = {};

    for (const leg of legs) {
      const history = priceHistories.find((h) => h.marketId === leg.marketId);
      if (!history || history.history.length === 0) continue;

      for (let i = 0; i < history.history.length; i++) {
        const point = history.history[i];

        // Check entry triggers
        if (position === "closed") {
          for (const trigger of entryTriggers) {
            if (
              trigger.marketId === leg.marketId &&
              trigger.priceLevel &&
              point.price <= trigger.priceLevel
            ) {
              position = "open";
              entryPrices[leg.marketId] = point.price;

              backtestResults.push({
                timestamp: point.timestamp,
                event: `ENTRY: ${trigger.condition}`,
                pnl: 0,
                cumulativePnl,
                triggeredBy: trigger.condition,
              });
            }
          }
        }

        // Check exit triggers
        if (position === "open" && entryPrices[leg.marketId]) {
          for (const trigger of exitTriggers) {
            if (trigger.marketId === leg.marketId && trigger.priceLevel) {
              const entryPrice = entryPrices[leg.marketId];
              const shouldExit =
                (point.price >= trigger.priceLevel && point.price > entryPrice) ||
                (point.price <= trigger.priceLevel && point.price < entryPrice);

              if (shouldExit) {
                const pnl = (point.price - entryPrice) * leg.size;
                cumulativePnl += pnl;
                position = "closed";

                backtestResults.push({
                  timestamp: point.timestamp,
                  event: `EXIT: ${trigger.condition}`,
                  pnl,
                  cumulativePnl,
                  triggeredBy: trigger.condition,
                });
              }
            }
          }
        }
      }
    }

    // Calculate Sharpe ratio (simplified)
    const returns = backtestResults
      .filter((r) => r.pnl !== 0)
      .map((r) => r.pnl);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const stdDev =
      returns.length > 1
        ? Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
              returns.length
          )
        : 1;
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    return {
      backtestResults,
      totalPnl: cumulativePnl,
      sharpeRatio,
    };
  } catch (error) {
    return {
      backtestResults: [],
      totalPnl: 0,
      sharpeRatio: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
