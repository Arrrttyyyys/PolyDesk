"use client";

import { TrendingUp, Newspaper, Trophy } from "lucide-react";
import { Domain } from "@/lib/types";
import { domainData } from "@/lib/domain-data";

interface DomainSwitcherProps {
  activeDomain: Domain;
  onDomainChange: (domain: Domain) => void;
}

const iconMap = {
  TrendingUp,
  Newspaper,
  Trophy,
};

export default function DomainSwitcher({
  activeDomain,
  onDomainChange,
}: DomainSwitcherProps) {
  const domains: Domain[] = ["markets", "news", "sports"];

  return (
    <div className="glass rounded-xl p-2 mb-6">
      <div className="flex gap-2">
        {domains.map((domain) => {
          const data = domainData[domain];
          const Icon = iconMap[data.icon as keyof typeof iconMap];

          return (
            <button
              key={domain}
              onClick={() => onDomainChange(domain)}
              className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all ${
                activeDomain === domain
                  ? "bg-primary/20 border border-primary/50 text-primary shadow-lg shadow-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <Icon className="w-5 h-5" />
              <div className="text-center md:text-left">
                <div className="font-medium">{data.label}</div>
                <div className="text-xs hidden md:block">{data.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

