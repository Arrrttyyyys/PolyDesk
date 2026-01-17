"use client";

import { Briefcase, Copy, Trash2 } from "lucide-react";
import { PortfolioLeg } from "@/lib/types";

interface PortfolioTableProps {
  legs: PortfolioLeg[];
  onDuplicate: (leg: PortfolioLeg) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export default function PortfolioTable({
  legs,
  onDuplicate,
  onRemove,
  onClearAll,
}: PortfolioTableProps) {
  const totalCost = legs.reduce((sum, leg) => sum + leg.size * leg.entryPrice, 0);
  const totalPnL = legs.reduce(
    (sum, leg) => {
      const currentValue = leg.size * leg.currentMid;
      const entryValue = leg.size * leg.entryPrice;
      const pnl = leg.side === "buy" ? currentValue - entryValue : entryValue - currentValue;
      return sum + pnl;
    },
    0
  );

  if (legs.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">No positions yet</p>
        <button className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors">
          Add Position
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Portfolio Builder</h3>
          <span className="text-xs px-2 py-1 bg-secondary/50 rounded text-muted-foreground">
            {legs.length} leg{legs.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Market</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Side</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Out</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Size</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Entry</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cost</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Mid</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">PnL</th>
              <th className="text-center py-2 px-2 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg, idx) => {
              const currentValue = leg.size * leg.currentMid;
              const entryValue = leg.size * leg.entryPrice;
              const pnl = leg.side === "buy" ? currentValue - entryValue : entryValue - currentValue;
              const cost = leg.size * leg.entryPrice;

              return (
                <tr key={leg.id} className="border-b border-border/20 hover:bg-secondary/20">
                  <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                  <td className="py-2 px-2 text-foreground max-w-[200px] truncate">
                    {leg.marketTitle}
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        leg.side === "buy"
                          ? "bg-primary/20 text-primary"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      {leg.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        leg.outcome === "yes"
                          ? "bg-primary/20 text-primary"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      {leg.outcome.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">
                    {leg.size.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">
                    ${leg.entryPrice.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">
                    ${cost.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-foreground">
                    ${leg.currentMid.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-mono font-semibold ${
                      pnl >= 0 ? "text-primary" : "text-accent"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onDuplicate(leg)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemove(leg.id)}
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/30">
        <div className="bg-secondary/30 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
          <div className="text-lg font-mono font-bold text-foreground">
            ${totalCost.toFixed(2)}
          </div>
        </div>
        <div
          className={`rounded-lg p-3 ${
            totalPnL >= 0 ? "bg-primary/10 border border-primary/30" : "bg-accent/10 border border-accent/30"
          }`}
        >
          <div className="text-xs text-muted-foreground mb-1">Total PnL</div>
          <div
            className={`text-lg font-mono font-bold ${totalPnL >= 0 ? "text-primary" : "text-accent"}`}
          >
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

