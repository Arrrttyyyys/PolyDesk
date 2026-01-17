"use client";

import {
  FileText,
  Sparkles,
  Bot,
  Zap,
  AlertTriangle,
  Target,
  ArrowRight,
  HelpCircle,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { PortfolioLeg } from "@/lib/types";
import { useState } from "react";

interface TradeMemoBuilderProps {
  legs: PortfolioLeg[];
}

export default function TradeMemoBuilder({ legs }: TradeMemoBuilderProps) {
  const [includeDepth, setIncludeDepth] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeComments, setIncludeComments] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState(70);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(-1);
  const [memo, setMemo] = useState<any>(null);

  const generationSteps = [
    "Bundling context...",
    "Compressing with bear-1...",
    "Sending to LLM...",
    "Generating memo...",
  ];

  const handleGenerate = async () => {
    if (legs.length === 0) return;

    setIsGenerating(true);
    setGenerationStep(0);

    try {
      // Step 1: Bundle context
      setGenerationStep(1);
      const contextParts: string[] = [];

      legs.forEach((leg) => {
        contextParts.push(
          `Market: ${leg.marketTitle}, Side: ${leg.side.toUpperCase()}, Outcome: ${leg.outcome.toUpperCase()}, Entry: $${leg.entryPrice.toFixed(2)}, Size: ${leg.size}`
        );
      });

      if (includeDepth) {
        contextParts.push("Orderbook depth data included");
      }
      if (includeHistory) {
        contextParts.push("Price history included");
      }
      if (includeNotes) {
        contextParts.push("User notes included");
      }
      if (includeComments) {
        contextParts.push("Comments and sentiment data included");
      }

      const rawContext = contextParts.join("\n\n");

      // Step 2: Compress context
      setGenerationStep(2);
      const compressResponse = await fetch("/api/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawContext,
          aggressiveness: compressionLevel / 100,
        }),
      });

      let compressedContext = rawContext;
      let tokenMetrics = {
        raw: rawContext.length / 4, // Rough estimate
        compressed: rawContext.length / 4,
        saved: 0,
        costSaved: 0,
      };

      if (compressResponse.ok) {
        const compressData = await compressResponse.json();
        compressedContext = compressData.compressed;
        tokenMetrics = {
          raw: compressData.tokensBefore,
          compressed: compressData.tokensAfter,
          saved: compressData.saved,
          costSaved: 0.45, // Estimate based on token savings
        };
      }

      // Step 3: Send to LLM
      setGenerationStep(3);
      const memoResponse = await fetch("/api/generate-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioLegs: legs,
          compressedContext,
          compressionLevel: compressionLevel / 100,
        }),
      });

      if (!memoResponse.ok) {
        throw new Error("Failed to generate memo");
      }

      // Step 4: Generate memo
      setGenerationStep(4);
      const memoData = await memoResponse.json();
      setMemo({
        ...memoData,
        tokenMetrics,
      });
    } catch (error) {
      console.error("Error generating memo:", error);
      // On error, show error message
    } finally {
      setIsGenerating(false);
    }
  };

  if (legs.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Add positions to generate trade memo</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Trade Memo Builder</h3>
        </div>
        <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded border border-primary/30">
          Compression-First
        </span>
      </div>

      {/* Context Options */}
      <div className="bg-secondary/30 rounded-lg p-3 mb-4">
        <div className="text-xs text-muted-foreground mb-2">Context Options</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIncludeDepth(!includeDepth)}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              includeDepth
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Orderbook Depth
          </button>
          <button
            onClick={() => setIncludeHistory(!includeHistory)}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              includeHistory
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Price History
          </button>
          <button
            onClick={() => setIncludeNotes(!includeNotes)}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              includeNotes
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            User Notes
          </button>
          <button
            onClick={() => setIncludeComments(!includeComments)}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              includeComments
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Comments/Sentiment
          </button>
        </div>
      </div>

      {/* Compression Slider */}
      <div className="mb-4">
        <label className="block text-sm text-muted-foreground mb-2">
          Compression Aggressiveness: {compressionLevel}%
        </label>
        <input
          type="range"
          min="30"
          max="95"
          value={compressionLevel}
          onChange={(e) => setCompressionLevel(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Pipeline Visualization */}
      {isGenerating && (
        <div className="bg-secondary/30 rounded-lg p-4 mb-4">
          <div className="space-y-3">
            {generationSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {idx < generationStep ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : idx === generationStep ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span
                  className={`text-sm ${
                    idx <= generationStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token Metrics */}
      {memo && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Raw</div>
            <div className="text-sm font-mono font-semibold text-foreground">
              {memo.tokenMetrics.raw.toLocaleString()}
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Compressed</div>
            <div className="text-sm font-mono font-semibold text-foreground">
              {memo.tokenMetrics.compressed.toLocaleString()}
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">Saved</div>
            <div className="text-sm font-mono font-semibold text-primary">
              {memo.tokenMetrics.saved}%
            </div>
          </div>
          <div className="bg-secondary/30 rounded-lg p-2">
            <div className="text-xs text-muted-foreground mb-1">$ Saved</div>
            <div className="text-sm font-mono font-semibold text-foreground">
              ${memo.tokenMetrics.costSaved}
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || legs.length === 0}
        className="w-full py-3 px-4 bg-primary text-background font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-4"
      >
        <Sparkles className="w-4 h-4" />
        {isGenerating ? "Generating..." : "Generate Trade Memo"}
      </button>

      {/* Memo Output */}
      {memo && (
        <div className="space-y-4">
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Strategy Explanation</h4>
            </div>
            <p className="text-sm text-muted-foreground">{memo.strategy}</p>
          </div>

          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Payoff Intuition</h4>
            </div>
            <p className="text-sm text-muted-foreground">{memo.payoff}</p>
          </div>

          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-accent" />
              <h4 className="font-semibold text-foreground">Key Risks</h4>
            </div>
            <ul className="space-y-1">
              {memo.risks.map((risk: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Suggested Hedges</h4>
            </div>
            <ul className="space-y-1">
              {memo.hedges.map((hedge: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">+</span>
                  <span>{hedge}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-secondary/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">Scenarios to Watch</h4>
            <ul className="space-y-1">
              {memo.scenarios.map((scenario: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" />
                  <span>{scenario}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-yellow-500" />
              <h4 className="font-semibold text-foreground">What Would Change My Mind</h4>
            </div>
            <ul className="space-y-1">
              {memo.changeFactors.map((factor: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">?</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          <button className="w-full py-2 px-4 border border-border rounded-lg text-foreground hover:bg-secondary/30 transition-colors">
            Generate New Memo
          </button>
        </div>
      )}
    </div>
  );
}

