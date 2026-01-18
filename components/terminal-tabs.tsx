"use client";

import { Briefcase, LineChart, Clock, FileText, BookOpen } from "lucide-react";

type TerminalTab = "position" | "portfolio" | "scenarios" | "memo" | "dossier";

interface TerminalTabsProps {
  activeTab: TerminalTab;
  onTabChange: (tab: TerminalTab) => void;
}

const tabs: { id: TerminalTab; label: string; icon: typeof Briefcase }[] = [
  { id: "position", label: "Position", icon: Briefcase },
  { id: "portfolio", label: "Portfolio", icon: LineChart },
  { id: "scenarios", label: "Scenarios", icon: Clock },
  { id: "dossier", label: "Dossier", icon: BookOpen },
  { id: "memo", label: "Trade Memo", icon: FileText },
];

export default function TerminalTabs({
  activeTab,
  onTabChange,
}: TerminalTabsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 mb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

