import * as React from "react";
import { cn } from "@/lib/utils/formatting";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = "text", id, ...props }, ref) => {
    const inputId = React.useId();
    const finalId = id || inputId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={finalId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={finalId}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-gray-700 bg-[#0a0a0f] px-3 py-2",
            "text-sm text-gray-200 placeholder:text-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
            error && "border-[#ef4444] focus:ring-[#ef4444]",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-[#ef4444]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
