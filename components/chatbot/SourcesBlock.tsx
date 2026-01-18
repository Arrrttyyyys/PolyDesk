"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

export type Stance = "supportive" | "neutral" | "contradicts";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url?: string;
  timestamp: Date | string;
  stance: Stance;
  snippet?: string;
}

interface SourcesBlockProps {
  sources: Source[];
}

export function SourcesBlock({ sources }: SourcesBlockProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStanceColor = (stance: Stance) => {
    switch (stance) {
      case "supportive":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "neutral":
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
      case "contradicts":
        return "text-red-400 bg-red-500/10 border-red-500/20";
    }
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-2 p-4 rounded-lg bg-card/30 border border-border">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ExternalLink className="w-4 h-4 text-primary" />
        Sources ({sources.length})
      </h3>
      <div className="space-y-2">
        {sources.map((source) => {
          const isExpanded = expandedIds.has(source.id);
          return (
            <div
              key={source.id}
              className="p-3 rounded-lg bg-secondary/50 border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors"
                        >
                          {source.title}
                        </a>
                      ) : (
                        source.title
                      )}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap ${getStanceColor(
                        source.stance
                      )}`}
                    >
                      {source.stance}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{source.publisher}</span>
                    <span>•</span>
                    <span>{formatTimestamp(source.timestamp)}</span>
                  </div>
                </div>
                {source.snippet && (
                  <button
                    onClick={() => toggleExpanded(source.id)}
                    className="flex-shrink-0 p-1 hover:bg-border/50 rounded transition-colors"
                    aria-label={isExpanded ? "Collapse snippet" : "Expand snippet"}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              {isExpanded && source.snippet && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-2">
                  {source.snippet}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
