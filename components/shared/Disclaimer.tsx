"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface DisclaimerProps {
  variant?: "default" | "compact" | "inline";
  message?: string;
}

export default function Disclaimer({ 
  variant = "default",
  message = "Not financial advice. All recommendations are hypotheses and simulations for educational purposes only."
}: DisclaimerProps) {
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-500/80">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-500/70 py-2 px-3 bg-amber-500/5 border border-amber-500/20 rounded">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <div className="flex items-start gap-3 p-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-500 mb-1">Important Disclaimer</h4>
          <p className="text-sm text-amber-500/80">
            {message}
          </p>
          <p className="text-xs text-amber-500/60 mt-2">
            This tool is for educational and research purposes only. Always conduct your own research and consult with financial professionals before making any decisions.
          </p>
        </div>
      </div>
    </Card>
  );
}
