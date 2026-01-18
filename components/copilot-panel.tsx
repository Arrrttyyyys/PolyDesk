"use client";

import {
  Bot,
  Lightbulb,
  Info,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  Shield,
  Loader2,
} from "lucide-react";
import { Domain, Thesis } from "@/lib/types";
import { domainData } from "@/lib/domain-data";

interface CopilotPanelProps {
  domain: Domain;
  thesis: Thesis | null;
  isLoading: boolean;
}

export default function CopilotPanel({ domain, thesis, isLoading }: CopilotPanelProps) {
  const data = domainData[domain];

  // Empty State
  if (!thesis && !isLoading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bot className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">AI Research Copilot</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a market and fetch research to see AI-powered analysis
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {data.angles.map((angle, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 bg-secondary/30 rounded text-muted-foreground"
            >
              {angle}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 pulse-glow">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Analyzing {data.label}...
        </h3>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  // Research Results
  if (!thesis) return null;

  const recommendationGlow =
    thesis.recommendation === "BUY YES"
      ? "glow-green"
      : thesis.recommendation === "BUY NO"
      ? "glow-red"
      : "";

  return (
    <div className="space-y-4">
      {/* Thesis Panel */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">AI Research Thesis</h3>
          </div>
          <span className="text-xs px-2 py-1 bg-secondary/50 rounded text-muted-foreground">
            {data.label}
          </span>
        </div>

        {/* Executive Summary */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground">Executive Summary</h4>
          </div>
          <p className="text-sm text-muted-foreground">{thesis.summary}</p>
        </div>

        {/* Key Evidence */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground">Key Evidence</h4>
          </div>
          <ul className="space-y-1">
            {thesis.evidence.map((item, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  {item}
                  <span className="text-xs text-primary ml-1">[m{idx + 1}]</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Counterpoints & Risks */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <h4 className="font-medium text-foreground">Counterpoints & Risks</h4>
          </div>
          <ul className="space-y-1">
            {thesis.counterpoints.map((item, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hedging & Risk Management */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground">Hedging & Risk Management</h4>
          </div>
          <div className="space-y-3">
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-2">Hedging Strategies</div>
              <ul className="space-y-1">
                {thesis.hedging.strategies.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-2">Hedge Triggers</div>
              <ul className="space-y-1">
                {thesis.hedging.triggers.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-2">Unwind Signals</div>
              <ul className="space-y-1">
                {thesis.hedging.unwindSignals.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-2">Risk Management</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-primary">Take Profit:</span>{" "}
                  {thesis.riskManagement.takeProfit.join(" · ")}
                </div>
                <div>
                  <span className="text-accent">Stop Loss:</span>{" "}
                  {thesis.riskManagement.stopLoss.join(" · ")}
                </div>
                <div>
                  <span className="text-muted-foreground">Time Stops:</span>{" "}
                  {thesis.riskManagement.timeStops.join(" · ")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Catalysts */}
        <div className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-foreground">Bullish Triggers</h4>
            </div>
            <ul className="space-y-1">
              {thesis.catalysts.bullish.map((item, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-accent" />
              <h4 className="font-medium text-foreground">Bearish Triggers</h4>
            </div>
            <ul className="space-y-1">
              {thesis.catalysts.bearish.map((item, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-accent mt-1">−</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recommendation Card */}
      <div className={`glass rounded-xl p-5 ${recommendationGlow}`}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Recommendation</h3>
        </div>

        <div className="text-center mb-4">
          <div
            className={`inline-block px-6 py-3 rounded-lg font-bold text-lg ${
              thesis.recommendation === "BUY YES"
                ? "bg-primary/20 text-primary border border-primary/50"
                : thesis.recommendation === "BUY NO"
                ? "bg-accent/20 text-accent border border-accent/50"
                : "bg-secondary text-foreground border border-border"
            }`}
          >
            {thesis.recommendation}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Confidence</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${thesis.confidence}%` }}
                />
              </div>
              <span className="text-sm font-mono font-semibold text-foreground">
                {thesis.confidence}%
              </span>
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
            <div
              className={`text-sm font-semibold ${
                thesis.riskLevel === "Low"
                  ? "text-primary"
                  : thesis.riskLevel === "Medium"
                  ? "text-yellow-500"
                  : "text-accent"
              }`}
            >
              {thesis.riskLevel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

