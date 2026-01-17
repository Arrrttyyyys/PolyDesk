"use client";

import { Clock, Info } from "lucide-react";
import { PortfolioLeg } from "@/lib/types";
import { useState } from "react";

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

  // Calculate mark-to-market PnL
  const calculateMtMPnL = (prob: number, days: number) => {
    const price = prob / 100;
    let totalPnL = 0;

    legs.forEach((leg) => {
      // Simple linear drift assumption
      const currentPrice = leg.currentMid;
      const targetPrice = leg.outcome === "yes" ? price : 1 - price;
      const priceChange = targetPrice - currentPrice;
      const pnl = leg.side === "buy" 
        ? leg.size * priceChange 
        : leg.size * -priceChange;
      totalPnL += pnl;
    });

    return totalPnL;
  };

  const currentPnL = calculateMtMPnL(impliedProbability, daysToResolution);
  const totalCost = legs.reduce((sum, leg) => sum + leg.size * leg.entryPrice, 0);
  const roi = totalCost > 0 ? (currentPnL / totalCost) * 100 : 0;

  // Generate heatmap data
  const generateHeatmap = () => {
    const days = [7, 14, 30, 60, 90];
    const probs = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const heatmap: { day: number; prob: number; roi: number }[] = [];

    days.forEach((day) => {
      probs.forEach((prob) => {
        const pnl = calculateMtMPnL(prob, day);
        const cost = totalCost;
        const roiValue = cost > 0 ? (pnl / cost) * 100 : 0;
        heatmap.push({ day, prob, roi: roiValue });
      });
    });

    return heatmap;
  };

  const heatmap = generateHeatmap();

  const getHeatmapColor = (roi: number) => {
    if (roi > 20) return "bg-primary/40";
    if (roi > 10) return "bg-primary/30";
    if (roi > 0) return "bg-primary/20";
    if (roi > -10) return "bg-accent/20";
    if (roi > -20) return "bg-accent/30";
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
        <div className="text-sm text-muted-foreground mb-2">Mark-to-Market PnL</div>
        <div
          className={`text-3xl font-mono font-bold mb-2 ${
            currentPnL >= 0 ? "text-primary" : "text-accent"
          }`}
        >
          {currentPnL >= 0 ? "+" : ""}${currentPnL.toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground">
          ROI: {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
        </div>
      </div>

      {/* PnL Sensitivity Heatmap */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">PnL Sensitivity Heatmap</h4>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="grid grid-cols-10 gap-1 mb-1">
              <div className="text-xs text-muted-foreground font-medium p-2"></div>
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((prob) => (
                <div key={prob} className="text-xs text-muted-foreground font-medium p-2 text-center">
                  {prob}%
                </div>
              ))}
            </div>
            {/* Data Rows */}
            {[7, 14, 30, 60, 90].map((day) => (
              <div key={day} className="grid grid-cols-10 gap-1 mb-1">
                <div className="text-xs text-muted-foreground font-medium p-2">{day}d</div>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((prob) => {
                  const cell = heatmap.find((h) => h.day === day && h.prob === prob);
                  const roiValue = cell?.roi || 0;
                  return (
                    <div
                      key={prob}
                      className={`${getHeatmapColor(roiValue)} rounded p-2 text-center cursor-pointer hover:opacity-80 transition-opacity group relative`}
                      title={`${day}d @ ${prob}%: ${roiValue >= 0 ? "+" : ""}${roiValue.toFixed(1)}% ROI`}
                    >
                      <div className="text-xs font-mono text-foreground">
                        {roiValue >= 0 ? "+" : ""}{roiValue.toFixed(0)}%
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
          Mark-to-market uses midpoint price. Resolution date is modeled, not predicted. Assumes
          linear probability drift.
        </p>
      </div>
    </div>
  );
}

