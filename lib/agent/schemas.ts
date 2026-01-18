import { z } from "zod";

// Market card schema
export const MarketCardSchema = z.object({
  id: z.string(),
  question: z.string(),
  yesTokenId: z.string().optional(),
  noTokenId: z.string().optional(),
  yesPrice: z.number(),
  noPrice: z.number(),
  volume: z.union([z.string(), z.number()]),
  liquidity: z.union([z.string(), z.number()]).optional(),
  endDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type MarketCard = z.infer<typeof MarketCardSchema>;

// Source schema for evidence
export const SourceSchema = z.object({
  url: z.string(),
  title: z.string(),
  publisher: z.string().optional(),
  publishedAt: z.string().optional(),
  extractedText: z.string().optional(),
  compressedText: z.string().optional(),
  stance: z.enum(["bullish", "bearish", "neutral"]).optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  evidenceSnippets: z.array(z.string()).default([]),
});

export type Source = z.infer<typeof SourceSchema>;

// Evidence graph schema
export const EvidenceNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["market", "source", "signal", "event"]),
  label: z.string(),
  data: z.record(z.string(), z.any()).optional(),
});

export const EvidenceEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum(["supports", "contradicts", "correlates", "causes"]),
  weight: z.number().min(0).max(1).optional(),
});

export const EvidenceGraphSchema = z.object({
  nodes: z.array(EvidenceNodeSchema),
  edges: z.array(EvidenceEdgeSchema),
});

export type EvidenceNode = z.infer<typeof EvidenceNodeSchema>;
export type EvidenceEdge = z.infer<typeof EvidenceEdgeSchema>;
export type EvidenceGraph = z.infer<typeof EvidenceGraphSchema>;

// Strategy leg schema
export const StrategyLegSchema = z.object({
  marketId: z.string(),
  marketTitle: z.string(),
  side: z.enum(["buy", "sell"]),
  outcome: z.enum(["yes", "no"]),
  size: z.number(),
  entryPrice: z.number(),
  currentPrice: z.number().optional(),
  tokenId: z.string().optional(),
  rationale: z.string().optional(),
});

export type StrategyLeg = z.infer<typeof StrategyLegSchema>;

// Payoff curve point
export const PayoffPointSchema = z.object({
  scenario: z.string(),
  pnl: z.number(),
  probability: z.number().optional(),
});

export type PayoffPoint = z.infer<typeof PayoffPointSchema>;

// Scenario grid cell
export const ScenarioGridCellSchema = z.object({
  market1Outcome: z.enum(["yes", "no"]),
  market2Outcome: z.enum(["yes", "no"]).optional(),
  pnl: z.number(),
  probability: z.number().optional(),
});

export type ScenarioGridCell = z.infer<typeof ScenarioGridCellSchema>;

// Strategy trigger
export const TriggerSchema = z.object({
  type: z.enum(["entry", "exit", "hedge", "unwind"]),
  condition: z.string(),
  marketId: z.string().optional(),
  priceLevel: z.number().optional(),
  timeCondition: z.string().optional(),
});

export type Trigger = z.infer<typeof TriggerSchema>;

// Backtest result
export const BacktestResultSchema = z.object({
  timestamp: z.string(),
  event: z.string(),
  pnl: z.number(),
  cumulativePnl: z.number(),
  triggeredBy: z.string().optional(),
});

export type BacktestResult = z.infer<typeof BacktestResultSchema>;

// Complete strategy schema
export const StrategySchema = z.object({
  legs: z.array(StrategyLegSchema),
  payoffCurve: z.array(PayoffPointSchema).default([]),
  scenarioGrid: z.array(ScenarioGridCellSchema).default([]),
  triggers: z.array(TriggerSchema).default([]),
  backtestResults: z.array(BacktestResultSchema).default([]),
  maxRisk: z.number().optional(),
  expectedReturn: z.number().optional(),
  sharpeRatio: z.number().optional(),
});

export type Strategy = z.infer<typeof StrategySchema>;

// Trade dossier schema
export const TimelineMarkerSchema = z.object({
  date: z.string(),
  event: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  direction: z.enum(["bullish", "bearish", "neutral"]).optional(),
});

export const ThetaSignalSchema = z.object({
  daysToResolution: z.number(),
  decayRate: z.number(),
  optimalEntryWindow: z.string(),
  optimalExitWindow: z.string(),
});

export const ResolutionRiskSchema = z.object({
  clarity: z.enum(["high", "medium", "low"]),
  ambiguityRisk: z.string(),
  precedents: z.array(z.string()).default([]),
  criteriaCheck: z.string(),
});

export const RuleToTradeSchema = z.object({
  rule: z.string(),
  implications: z.array(z.string()),
  edgeCases: z.array(z.string()).default([]),
});

export const TradeDossierSchema = z.object({
  timelineMarkers: z.array(TimelineMarkerSchema).default([]),
  thetaSignals: ThetaSignalSchema.optional(),
  resolutionRisk: ResolutionRiskSchema.optional(),
  ruleToTrade: RuleToTradeSchema.optional(),
  unknowns: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

export type TimelineMarker = z.infer<typeof TimelineMarkerSchema>;
export type ThetaSignal = z.infer<typeof ThetaSignalSchema>;
export type ResolutionRisk = z.infer<typeof ResolutionRiskSchema>;
export type RuleToTrade = z.infer<typeof RuleToTradeSchema>;
export type TradeDossier = z.infer<typeof TradeDossierSchema>;

// Analysis board schema
export const MicrostructureAnalysisSchema = z.object({
  spread: z.number(),
  depth: z.object({
    bid: z.number(),
    ask: z.number(),
  }),
  imbalance: z.number(),
  slippage: z.object({
    small: z.number(),
    medium: z.number(),
    large: z.number(),
  }),
  interpretation: z.string().optional(),
});

export const TrendRegimeSchema = z.object({
  trend: z.enum(["uptrend", "downtrend", "sideways", "volatile"]),
  strength: z.number().min(0).max(1),
  volatility: z.number(),
  momentum: z.number(),
  recentDrawdown: z.number().optional(),
});

export const RelationshipSchema = z.object({
  marketId: z.string(),
  marketTitle: z.string(),
  correlation: z.number().min(-1).max(1),
  leadLag: z.object({
    direction: z.enum(["leads", "lags", "none"]),
    lagHours: z.number().optional(),
  }).optional(),
  type: z.enum(["positive", "negative", "neutral"]),
});

export const InefficiencySchema = z.object({
  type: z.enum(["mispricing", "arbitrage", "momentum", "mean_reversion"]),
  primaryMarketId: z.string(),
  relatedMarketId: z.string().optional(),
  score: z.number().min(0).max(1),
  description: z.string(),
  confidence: z.number().min(0).max(1),
});

export const RecommendationSchema = z.object({
  action: z.enum(["buy", "sell", "wait", "hedge"]),
  marketId: z.string(),
  outcome: z.enum(["yes", "no"]),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  entryPrice: z.number().optional(),
  targetPrice: z.number().optional(),
  stopLoss: z.number().optional(),
});

export const AnalysisBoardSchema = z.object({
  microstructure: MicrostructureAnalysisSchema.optional(),
  trendRegime: TrendRegimeSchema.optional(),
  relationships: z.array(RelationshipSchema).default([]),
  inefficiencies: z.array(InefficiencySchema).default([]),
  recommendations: z.array(RecommendationSchema).default([]),
  context: z.string().optional(),
});

export type MicrostructureAnalysis = z.infer<typeof MicrostructureAnalysisSchema>;
export type TrendRegime = z.infer<typeof TrendRegimeSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type Inefficiency = z.infer<typeof InefficiencySchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type AnalysisBoard = z.infer<typeof AnalysisBoardSchema>;

// Tool input/output schemas
export const PriceDataPointSchema = z.object({
  timestamp: z.string(),
  price: z.number(),
  volume: z.number().optional(),
});

export type PriceDataPoint = z.infer<typeof PriceDataPointSchema>;

export const OrderbookLevelSchema = z.object({
  price: z.number(),
  size: z.number(),
  type: z.enum(["bid", "ask"]),
});

export const OrderbookFeaturesSchema = z.object({
  spread: z.number(),
  depth: z.object({
    bid: z.number(),
    ask: z.number(),
  }),
  imbalance: z.number(),
  slippage: z.object({
    small: z.number(),
    medium: z.number(),
    large: z.number(),
  }),
  levels: z.array(OrderbookLevelSchema).default([]),
});

export type OrderbookLevel = z.infer<typeof OrderbookLevelSchema>;
export type OrderbookFeatures = z.infer<typeof OrderbookFeaturesSchema>;
