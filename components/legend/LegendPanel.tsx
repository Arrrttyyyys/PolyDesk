"use client";

import { useState } from "react";
import { TrendingUp, BarChart, Network, Target, FileText, Link } from "lucide-react";
import { Market, OrderbookLevel, PriceHistoryPoint } from "@/lib/types";
import {
  Source,
  EvidenceGraph,
  Strategy,
  TradeDossier,
  AnalysisBoard,
} from "@/lib/agent/schemas";
import { LegendMarketTab } from "./LegendMarketTab";
import { LegendAnalysisTab } from "./LegendAnalysisTab";
import { LegendGraphTab } from "./LegendGraphTab";
import { LegendStrategyTab } from "./LegendStrategyTab";
import { LegendDossierTab } from "./LegendDossierTab";
import { LegendSourcesTab } from "./LegendSourcesTab";

interface LegendPanelProps {
  selectedMarket: Market | null;
  sources?: Source[];
  graph?: EvidenceGraph | null;
  strategy?: Strategy | null;
  dossier?: TradeDossier | null;
  analysisBoard?: AnalysisBoard | null;
  priceHistory?: PriceHistoryPoint[];
  orderbook?: OrderbookLevel[];
}

type TabType = "market" | "analysis" | "graph" | "strategy" | "dossier" | "sources";

export function LegendPanel({
  selectedMarket,
  sources = [],
  graph = null,
  strategy = null,
  dossier = null,
  analysisBoard = null,
  priceHistory = [],
  orderbook = [],
}: LegendPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("market");

  const tabs = [
    { id: "market" as TabType, label: "Market", icon: TrendingUp },
    { id: "analysis" as TabType, label: "Analysis", icon: BarChart },
    { id: "graph" as TabType, label: "Graph", icon: Network },
    { id: "strategy" as TabType, label: "Strategy", icon: Target },
    { id: "dossier" as TabType, label: "Dossier", icon: FileText },
    { id: "sources" as TabType, label: "Sources", icon: Link },
  ];

  return (
    <div className="h-full flex flex-col bg-black/40 backdrop-blur-sm border-l border-white/10">
      {/* Tab Navigation */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white/10 text-white border-b-2 border-green-500"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="transition-opacity duration-200">
          {activeTab === "market" && (
            <LegendMarketTab
              market={selectedMarket}
              priceHistory={priceHistory}
              orderbook={orderbook}
            />
          )}
          {activeTab === "analysis" && (
            <LegendAnalysisTab analysisBoard={analysisBoard} />
          )}
          {activeTab === "graph" && <LegendGraphTab graph={graph} />}
          {activeTab === "strategy" && (
            <LegendStrategyTab
              strategy={strategy}
              onAddLeg={() => {}}
              onRemoveLeg={() => {}}
              onAddTrigger={() => {}}
              onRunBacktest={() => {}}
            />
          )}
          {activeTab === "dossier" && <LegendDossierTab dossier={dossier} />}
          {activeTab === "sources" && (
            <LegendSourcesTab sources={sources} onSourceClick={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
}
