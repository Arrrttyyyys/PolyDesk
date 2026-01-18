// Trade dossier tool
import {
  MarketCard,
  TradeDossier,
  TimelineMarker,
  ThetaSignal,
  ResolutionRisk,
  RuleToTrade,
  Source,
} from "@/lib/agent/schemas";

/**
 * Generate trade dossier from market and compressed evidence
 */
export async function tool_generateTradeDossier(params: {
  market: MarketCard;
  compressedEvidenceBundle?: string;
  sources?: Source[];
}): Promise<{
  dossier: TradeDossier;
  error?: string;
}> {
  const { market, compressedEvidenceBundle, sources = [] } = params;

  try {
    const dossier: TradeDossier = {
      timelineMarkers: [],
      unknowns: [],
    };

    // 1. Build timeline markers from sources
    const timelineMarkers: TimelineMarker[] = [];

    for (const source of sources) {
      if (source.publishedAt && source.stance) {
        const date = new Date(source.publishedAt).toISOString().split("T")[0];
        const impact = source.sentiment
          ? Math.abs(source.sentiment) > 0.5
            ? "high"
            : Math.abs(source.sentiment) > 0.2
              ? "medium"
              : "low"
          : "medium";

        const direction =
          source.stance === "bullish"
            ? "bullish"
            : source.stance === "bearish"
              ? "bearish"
              : "neutral";

        timelineMarkers.push({
          date,
          event: source.title,
          impact: impact as "high" | "medium" | "low",
          direction: direction as "bullish" | "bearish" | "neutral",
        });
      }
    }

    // Sort by date
    timelineMarkers.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    dossier.timelineMarkers = timelineMarkers.slice(-10); // Keep last 10

    // 2. Calculate theta signals
    if (market.endDate) {
      const endDate = new Date(market.endDate);
      const now = new Date();
      const daysToResolution = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      if (daysToResolution > 0) {
        // Decay rate increases as resolution approaches
        const decayRate = 1 / daysToResolution;

        // Optimal entry: early for better odds, but not too early (theta decay)
        const optimalEntryDays = Math.max(
          7,
          Math.floor(daysToResolution * 0.7)
        );
        const optimalExitDays = 7;

        const thetaSignals: ThetaSignal = {
          daysToResolution,
          decayRate,
          optimalEntryWindow: `${optimalEntryDays}-${Math.floor(daysToResolution * 0.9)} days before resolution`,
          optimalExitWindow: `${optimalExitDays} days before resolution`,
        };

        dossier.thetaSignals = thetaSignals;
      }
    }

    // 3. Resolution risk assessment
    const resolutionRisk: ResolutionRisk = {
      clarity: "medium",
      ambiguityRisk: "Standard resolution criteria apply",
      precedents: [],
      criteriaCheck: market.question,
    };

    // Analyze question for ambiguity
    const questionLower = market.question.toLowerCase();
    if (
      questionLower.includes("will") &&
      questionLower.includes("before") &&
      market.endDate
    ) {
      resolutionRisk.clarity = "high";
      resolutionRisk.ambiguityRisk =
        "Clear time-bound condition with specific date";
    } else if (
      questionLower.includes("at least") ||
      questionLower.includes("more than") ||
      questionLower.includes("less than")
    ) {
      resolutionRisk.clarity = "high";
      resolutionRisk.ambiguityRisk = "Quantifiable condition with clear threshold";
    } else if (
      questionLower.includes("announced") ||
      questionLower.includes("officially") ||
      questionLower.includes("confirmed")
    ) {
      resolutionRisk.clarity = "medium";
      resolutionRisk.ambiguityRisk =
        "Depends on official announcement or confirmation";
    } else {
      resolutionRisk.clarity = "low";
      resolutionRisk.ambiguityRisk =
        "Subjective criteria - check resolution rules carefully";
    }

    // Extract precedents from evidence
    if (compressedEvidenceBundle) {
      const precedentKeywords = [
        "previously",
        "historically",
        "last time",
        "in the past",
      ];
      for (const keyword of precedentKeywords) {
        if (compressedEvidenceBundle.toLowerCase().includes(keyword)) {
          resolutionRisk.precedents.push(
            `Historical patterns mentioned in evidence`
          );
          break;
        }
      }
    }

    dossier.resolutionRisk = resolutionRisk;

    // 4. Rule-to-trade conversion
    const ruleToTrade: RuleToTrade = {
      rule: market.question,
      implications: [],
      edgeCases: [],
    };

    // Analyze question structure for implications
    if (questionLower.includes("and")) {
      ruleToTrade.implications.push(
        "Both conditions must be met for YES resolution"
      );
    }
    if (questionLower.includes("or")) {
      ruleToTrade.implications.push(
        "Either condition is sufficient for YES resolution"
      );
    }
    if (questionLower.includes("before") && market.endDate) {
      ruleToTrade.implications.push(
        `Must occur before ${new Date(market.endDate).toLocaleDateString()}`
      );
    }

    // Common edge cases
    ruleToTrade.edgeCases = [
      "Check exact resolution criteria in market rules",
      "Consider timezone for time-based resolutions",
      "Verify source requirements for confirmation",
    ];

    dossier.ruleToTrade = ruleToTrade;

    // 5. Identify unknowns
    const unknowns: string[] = [];

    // Extract unknowns from evidence
    if (compressedEvidenceBundle) {
      const uncertaintyKeywords = [
        "unclear",
        "uncertain",
        "unknown",
        "depends on",
        "could",
        "might",
        "possibly",
      ];
      for (const keyword of uncertaintyKeywords) {
        if (compressedEvidenceBundle.toLowerCase().includes(keyword)) {
          unknowns.push(`Uncertainty detected: ${keyword}`);
        }
      }
    }

    // Generic unknowns based on market type
    if (questionLower.includes("will") && !questionLower.includes("when")) {
      unknowns.push("Timing of event is uncertain");
    }
    if (questionLower.includes("how many") || questionLower.includes("how much")) {
      unknowns.push("Exact magnitude is uncertain");
    }

    // Information gap
    if (sources.length < 3) {
      unknowns.push("Limited information sources - high uncertainty");
    }

    dossier.unknowns = unknowns.slice(0, 5); // Keep top 5

    // 6. Calculate overall confidence
    let confidence = 0.5; // Base confidence

    // Adjust based on resolution clarity
    if (resolutionRisk.clarity === "high") confidence += 0.2;
    if (resolutionRisk.clarity === "low") confidence -= 0.2;

    // Adjust based on evidence
    if (sources.length > 5) confidence += 0.1;
    if (sources.length < 2) confidence -= 0.1;

    // Adjust based on unknowns
    confidence -= unknowns.length * 0.05;

    dossier.confidence = Math.max(0, Math.min(1, confidence));

    return { dossier };
  } catch (error) {
    return {
      dossier: {
        timelineMarkers: [],
        unknowns: [],
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
