"use client";

import {
  Newspaper,
  Zap,
  CheckCircle,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  DollarSign,
  Gauge,
  Layers,
} from "lucide-react";
import { Domain, Article } from "@/lib/types";
import { domainData } from "@/lib/domain-data";

interface NewsPanelProps {
  domain: Domain;
  articles: Article[];
  compressionMetrics: {
    tokensBefore: number;
    tokensAfter: number;
    saved: number;
    compressionTime?: number;
    costSavings?: number;
    charactersBefore?: number;
    charactersAfter?: number;
    compressionRatio?: number;
    articlesFitBefore?: number;
    articlesFitAfter?: number;
  } | null;
  loadingStep: number;
  onGenerateThesis: () => void;
}

export default function NewsPanel({
  domain,
  articles,
  compressionMetrics,
  loadingStep,
  onGenerateThesis,
}: NewsPanelProps) {
  const data = domainData[domain];
  const loadingSteps = [
    "Fetching market data...",
    "Pulling news...",
    "Compressing articles...",
    "Generating thesis...",
  ];

  return (
    <div className="space-y-4">
      {/* News Feed Section */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">News Feed</h3>
          </div>
          <span className="text-xs px-2 py-1 bg-secondary/50 rounded text-muted-foreground">
            {articles.length} articles
          </span>
        </div>

        {/* Source Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {data.sources.map((source, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 bg-secondary/30 rounded text-muted-foreground"
            >
              {source}
            </span>
          ))}
        </div>

        {/* Article List */}
        <div className="max-h-[250px] overflow-y-auto space-y-2">
          {articles.length > 0 ? (
            articles.map((article) => (
              <div
                key={article.id}
                className="bg-secondary/30 hover:bg-secondary/50 rounded-lg p-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                    {article.title}
                  </h4>
                  {article.compressed && (
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{article.source}</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{article.timestamp}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        article.relevance === "High"
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {article.relevance}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No articles yet. Fetch research to load news.
            </div>
          )}
        </div>
      </div>

      {/* Compression Stats Section */}
      {articles.length > 0 && (
        <div className="glass rounded-xl p-4 glow-green border border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Compression Stats</h3>
          </div>

          {/* Model Attribution & Settings */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-primary/10">
            <span className="text-xs px-2.5 py-1 bg-primary/10 border border-primary/30 rounded text-primary font-medium">
              bear-1
            </span>
            <span className="text-xs px-2.5 py-1 bg-secondary/30 rounded text-muted-foreground">
              by The Token Company
            </span>
            <span className="text-xs px-2.5 py-1 bg-secondary/30 rounded text-muted-foreground">
              70% aggressiveness
            </span>
            <span className="text-xs text-muted-foreground">
              Compression-first approach: articles compressed before LLM analysis
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Articles Pulled</div>
              <div className="text-xl font-mono font-bold text-foreground">{articles.length}</div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Tokens Before</div>
              <div className="text-xl font-mono font-bold text-foreground">
                {compressionMetrics?.tokensBefore.toLocaleString() || "—"}
              </div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Tokens After</div>
              <div className="text-xl font-mono font-bold text-foreground">
                {compressionMetrics?.tokensAfter.toLocaleString() || "—"}
              </div>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Saved</div>
              <div className="text-xl font-mono font-bold text-primary">
                {compressionMetrics?.saved ? `${compressionMetrics.saved}%` : "—"}
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          {compressionMetrics && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <h4 className="text-sm font-semibold text-foreground mb-3">Benefits</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Cost Savings */}
                <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <div className="text-xs text-muted-foreground">Cost Savings</div>
                  </div>
                  <div className="text-lg font-mono font-bold text-primary">
                    ${compressionMetrics.costSavings ? compressionMetrics.costSavings.toFixed(4) : "0.0000"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    per research cycle
                  </div>
                </div>

                {/* Latency/Performance */}
                <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    <div className="text-xs text-muted-foreground">Compression Speed</div>
                  </div>
                  <div className="text-lg font-mono font-bold text-primary">
                    {compressionMetrics.compressionTime ? `${compressionMetrics.compressionTime.toFixed(2)}ms` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    faster API calls
                  </div>
                </div>

                {/* Context Efficiency */}
                <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <div className="text-xs text-muted-foreground">Context Efficiency</div>
                  </div>
                  <div className="text-lg font-mono font-bold text-primary">
                    {compressionMetrics.compressionRatio ? `${compressionMetrics.compressionRatio}:1` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {compressionMetrics.articlesFitBefore && compressionMetrics.articlesFitAfter
                      ? `${compressionMetrics.articlesFitBefore} → ${compressionMetrics.articlesFitAfter} articles fit`
                      : "more articles fit"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Angles */}
          <div className="flex flex-wrap gap-2 mt-4">
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
      )}

      {/* Loading States */}
      {loadingStep >= 0 && loadingStep < 4 && (
        <div className="glass rounded-xl p-4">
          <div className="space-y-3">
            {loadingSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {idx < loadingStep ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : idx === loadingStep ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span
                  className={`text-sm ${
                    idx <= loadingStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate AI Thesis Button */}
      {articles.length > 0 && loadingStep >= 4 && (
        <button
          onClick={onGenerateThesis}
          className="w-full py-3 px-4 bg-secondary/50 text-foreground font-medium rounded-lg hover:bg-secondary/70 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate AI Thesis
        </button>
      )}
    </div>
  );
}

