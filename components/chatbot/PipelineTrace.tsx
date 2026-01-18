"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";

export type StepStatus = "pending" | "active" | "complete" | "error";

export interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
}

interface PipelineTraceProps {
  steps: PipelineStep[];
}

export function PipelineTrace({ steps }: PipelineTraceProps) {
  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "complete":
        return <Check className="w-4 h-4 text-green-400" />;
      case "active":
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "pending":
        return <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />;
    }
  };

  const getStepColor = (status: StepStatus) => {
    switch (status) {
      case "complete":
        return "bg-green-500/20 border-green-500/30 text-green-400";
      case "active":
        return "bg-primary/20 border-primary/30 text-primary animate-pulse";
      case "error":
        return "bg-red-500/20 border-red-500/30 text-red-400";
      case "pending":
        return "bg-secondary border-border/50 text-muted-foreground";
    }
  };

  const completedCount = steps.filter((s) => s.status === "complete").length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <div className="p-4 rounded-lg bg-card/30 border border-border">
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground font-medium">
            Pipeline Progress
          </span>
          <span className="text-foreground font-mono">
            {completedCount}/{steps.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-green-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${getStepColor(
              step.status
            )}`}
          >
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {getStepIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{step.label}</div>
            </div>
            <div className="text-xs font-mono opacity-60">
              {String(index + 1).padStart(2, "0")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
