import * as React from "react";
import { cn } from "@/lib/utils/formatting";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-[#1a1a24] text-gray-300 border-gray-700",
      success: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30",
      warning: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30",
      danger: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30",
      info: "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:ring-offset-2 focus:ring-offset-[#0a0a0f]",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
