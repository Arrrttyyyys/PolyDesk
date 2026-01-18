export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "created" | "key_event" | "resolution" | "milestone";
}

export interface ResolutionRisk {
  score: number; // 0-100
  level: "low" | "medium" | "high";
  factors: Array<{
    factor: string;
    status: "positive" | "negative" | "warning";
    description: string;
  }>;
}

export interface RuleToTradeCompiler {
  conditions: string[];
  resolutionCriteria: string;
  exceptions: string[];
  sources: string[];
}

export interface Unknown {
  id: string;
  question: string;
  status: "open" | "resolved";
  notes?: string;
}

export interface Dossier {
  id: string;
  marketId: string;
  marketTitle: string;
  createdAt: number;
  updatedAt: number;
  timeline: TimelineEvent[];
  resolutionRisk: ResolutionRisk;
  ruleToTrade: RuleToTradeCompiler;
  unknowns: Unknown[];
  sources: string[]; // Source IDs
  summary: string;
}
