"use client";

import { Clock, Info } from "lucide-react";
import { PortfolioLeg } from "@/lib/types";
import { useMemo, useState } from "react";

interface ScenarioModelingProps {
  legs: PortfolioLeg[];
  resolutionDate?: string;
}

export default function ScenarioModeling({ legs, resolutionDate }: ScenarioModelingProps) {
  const [daysToResolution, setDaysToResolution] = useState(30);
  const [impliedProbability, setImpliedProbability] = useState(50);

  if (legs.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <p className="text-muted-foreground">Add positions to model scenarios</p>
      </div>
    );
  }

  const totalCost = useMemo(
    () => legs.reduce((sum, leg) => sum + leg.size * leg.entryPrice, 0),
    [legs]
  );

  // Mark-to-market model:
  // User sets a "target probability" and a "days" horizon.
  // We assume prices converge toward the target with a half-life.
  const calculateMtMPnL = (prob: number, days: number) => {
    const targetYes = prob / 100;

    const halfLifeDays = 14;
    const k = 1 - Math.pow(0.5, Math.max(days, 0) / halfLifeDays); // 0..1

    let totalPnL = 0;

    for (const leg of legs) {
      const current = leg.currentMid;
      const target = leg.outcome === "yes" ? targetYes : 1 - targetYes;

      // expected exit price after `days`
      const expectedExit = current + k * (target - current);
      const priceChange = expectedExit - current;

      const pnl = leg.side === "buy" ? leg.size * priceChange : leg.size * -priceChange;
      totalPnL += pnl;
    }

    return totalPnL;
  };

  const currentPnL = calculateMtMPnL(impliedProbability, daysToResolution);
  const roi = totalCost > 0 ? (currentPnL / totalCost) * 100 : 0;

  const heatmap = useMemo(() => {
    const days = [7, 14, 30, 60, 90];
    const probs = [10, 20, 30, 40, 50, 60, 70, 80, 90];

    const out: { day: number; prob: number; roi: number }[] = [];
    for (const day of days) {
      for (const prob of probs) {
        const pnl = calculateMtMPnL(prob, day);
        const roiValue = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
        out.push({ day, prob, roi: roiValue });
      }
    }
    return out;
  }, [legs, totalCost]);

  const getHeatmapColor = (roiValue: number) => {
    if (roiValue > 20) return "bg-primary/40";
    if (roiValue > 10) return "bg-primary/30";
    if (roiValue > 0) return "bg-primary/20";
    if (roiValue > -10) return "bg-accent/20";
    if (roiValue > -20) return "bg-accent/30";
    return "bg-accent/40";
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Scenario Modeling</h3>
        </div>
        {resolutionDate && (
          <span className="text-xs px-2 py-1 bg-secondary/50 rounded text-muted-foreground">
            {resolutionDate}
          </span>
        )}
      </div>

      {/* Sliders */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Days to Resolution: {daysToResolution}
          </label>
          <input
            type="range"
            min="1"
            max="120"
            value={daysToResolution}
            onChange={(e) => setDaysToResolution(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Implied Probability: {impliedProbability}%
          </label>
          <input
            type="range"
            min="1"
            max="99"
            value={impliedProbability}
            onChange={(e) => setImpliedProbability(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Current Scenario Result */}
      <div
        className={`rounded-lg p-4 mb-6 border-2 ${
          currentPnL >= 0
            ? "bg-primary/10 border-primary/30"
            : "bg-accent/10 border-accent/30"
        }`}
      >
        <div className="text-sm text-muted-foreground mb-2">Mark-to-Market PnL (expected)</div>
        <div
          className={`text-3xl font-mono font-bold mb-2 ${
            currentPnL >= 0 ? "text-primary" : "text-accent"
          }`}
        >
          {currentPnL >= 0 ? "+" : ""}${currentPnL.toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground">
          ROI: {roi >= 0 ? "+" : ""}
          {roi.toFixed(1)}%
        </div>
      </div>

      {/* PnL Sensitivity Heatmap */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">PnL Sensitivity Heatmap</h4>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-10 gap-1 mb-1">
              <div className="text-xs text-muted-foreground font-medium p-2"></div>
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((prob) => (
                <div key={prob} className="text-xs text-muted-foreground font-medium p-2 text-center">
                  {prob}%
                </div>
              ))}
            </div>

            {[7, 14, 30, 60, 90].map((day) => (
              <div key={day} className="grid grid-cols-10 gap-1 mb-1">
                <div className="text-xs text-muted-foreground font-medium p-2">{day}d</div>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((prob) => {
                  const cell = heatmap.find((h) => h.day === day && h.prob === prob);
                  const roiValue = cell?.roi ?? 0;

                  return (
                    <div
                      key={prob}
                      className={`${getHeatmapColor(
                        roiValue
                      )} rounded p-2 text-center cursor-pointer hover:opacity-80 transition-opacity group relative`}
                      title={`${day}d @ ${prob}%: ${roiValue >= 0 ? "+" : ""}${roiValue.toFixed(
                        1
                      )}% ROI`}
                    >
                      <div className="text-xs font-mono text-foreground">
                        {roiValue >= 0 ? "+" : ""}
                        {roiValue.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-secondary/30 rounded-lg">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground italic">
          Mark-to-market uses midpoint price and a simple convergence model (half-life). Resolution
          timing is a scenario input, not a prediction.
        </p>
      </div>
    </div>
  );
}
