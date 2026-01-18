"use client";

import { Sparkles } from "lucide-react";

export interface Clicker {
  id: string;
  label: string;
  action: string;
}

interface ClickersRowProps {
  clickers: Clicker[];
  onClickerClick: (clicker: Clicker) => void;
}

export function ClickersRow({ clickers, onClickerClick }: ClickersRowProps) {
  return (
    <div className="w-full overflow-x-auto hide-scrollbar">
      <div className="flex gap-2 px-4 py-3 min-w-max">
        {clickers.map((clicker) => (
          <button
            key={clicker.id}
            onClick={() => onClickerClick(clicker)}
            className="group relative px-4 py-2 rounded-full bg-secondary border border-border hover:border-primary/50 hover:bg-secondary/80 transition-all duration-200 whitespace-nowrap"
            aria-label={`Quick action: ${clicker.label}`}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary group-hover:text-primary transition-colors" />
              {clicker.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
