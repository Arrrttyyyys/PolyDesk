"use client";

import { useState, useMemo } from "react";
import { Source } from "@/lib/agent/schemas";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  SortAsc,
  Calendar,
} from "lucide-react";

interface LegendSourcesTabProps {
  sources?: Source[];
  onSourceClick: (source: Source) => void;
}

type SortOption = "relevance" | "recency" | "sentiment";
type StanceFilter = "all" | "bullish" | "bearish" | "neutral";

export function LegendSourcesTab({
  sources = [],
  onSourceClick,
}: LegendSourcesTabProps) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(
    new Set()
  );
  const [sortBy, setSortBy] = useState<SortOption>("recency");
  const [filterStance, setFilterStance] = useState<StanceFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const toggleExpanded = (url: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(url)) {
      newExpanded.delete(url);
    } else {
      newExpanded.add(url);
    }
    setExpandedSources(newExpanded);
  };

  const getStanceIcon = (stance?: string) => {
    switch (stance) {
      case "bullish":
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case "bearish":
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return <Minus className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStanceBadge = (stance?: string) => {
    switch (stance) {
      case "bullish":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "bearish":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getSentimentColor = (sentiment?: number) => {
    if (!sentiment) return "text-gray-400";
    if (sentiment > 0.3) return "text-green-500";
    if (sentiment < -0.3) return "text-red-500";
    return "text-gray-400";
  };

  // Filter and sort sources
  const filteredAndSortedSources = useMemo(() => {
    let filtered = sources;

    // Apply stance filter
    if (filterStance !== "all") {
      filtered = filtered.filter((s) => s.stance === filterStance);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(term) ||
          s.publisher?.toLowerCase().includes(term) ||
          s.extractedText?.toLowerCase().includes(term)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "recency":
          return (
            new Date(b.publishedAt || 0).getTime() -
            new Date(a.publishedAt || 0).getTime()
          );
        case "sentiment":
          return (b.sentiment || 0) - (a.sentiment || 0);
        case "relevance":
        default:
          // If we had relevance scores, we'd use them here
          return 0;
      }
    });

    return sorted;
  }, [sources, filterStance, searchTerm, sortBy]);

  if (sources.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No sources available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filters and Sort */}
      <div className="p-4 space-y-3 border-b border-white/10">
        {/* Search */}
        <input
          type="text"
          placeholder="Search sources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
        />

        {/* Sort and Filter Controls */}
        <div className="flex gap-2 text-xs">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-white/20"
          >
            <option value="recency">Sort: Recent</option>
            <option value="sentiment">Sort: Sentiment</option>
            <option value="relevance">Sort: Relevance</option>
          </select>

          {/* Stance Filter */}
          <select
            value={filterStance}
            onChange={(e) => setFilterStance(e.target.value as StanceFilter)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:border-white/20"
          >
            <option value="all">All Stances</option>
            <option value="bullish">Bullish</option>
            <option value="bearish">Bearish</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        {/* Result Count */}
        <div className="text-xs text-gray-400">
          {filteredAndSortedSources.length} source(s)
        </div>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAndSortedSources.map((source) => {
          const isExpanded = expandedSources.has(source.url);

          return (
            <div
              key={source.url}
              className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
            >
              {/* Source Header */}
              <div
                className="p-3 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleExpanded(source.url)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                      {source.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {source.publisher && (
                        <span className="truncate">{source.publisher}</span>
                      )}
                      {source.publishedAt && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(source.publishedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>

                {/* Stance and Sentiment Badges */}
                <div className="flex items-center gap-2 mt-2">
                  {source.stance && (
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${getStanceBadge(
                        source.stance
                      )}`}
                    >
                      {getStanceIcon(source.stance)}
                      {source.stance}
                    </span>
                  )}
                  {source.sentiment !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getSentimentColor(
                        source.sentiment
                      )}`}
                    >
                      Sentiment: {source.sentiment > 0 ? "+" : ""}
                      {source.sentiment.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-white/10 p-3 bg-white/5 space-y-3">
                  {/* Evidence Snippets */}
                  {source.evidenceSnippets &&
                    source.evidenceSnippets.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-white mb-2">
                          Evidence Snippets
                        </div>
                        <ul className="space-y-2">
                          {source.evidenceSnippets.map((snippet, i) => (
                            <li
                              key={i}
                              className="text-xs text-gray-300 bg-white/5 rounded p-2 border-l-2 border-blue-500"
                            >
                              {snippet}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Extracted Text Preview */}
                  {source.extractedText && (
                    <div>
                      <div className="text-xs font-semibold text-white mb-2">
                        Preview
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
                        {source.extractedText}
                      </p>
                    </div>
                  )}

                  {/* Compressed Text Preview */}
                  {!source.extractedText && source.compressedText && (
                    <div>
                      <div className="text-xs font-semibold text-white mb-2">
                        Summary
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
                        {source.compressedText}
                      </p>
                    </div>
                  )}

                  {/* Link to Original */}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSourceClick(source);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Original Article
                  </a>
                </div>
              )}
            </div>
          );
        })}

        {filteredAndSortedSources.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No sources match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
