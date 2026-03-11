import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: string;
  label?: string;
}

export function Input({
  className,
  leftIcon,
  rightIcon,
  error,
  label,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none dark:focus-visible:border-white",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
            leftIcon ? "pl-9" : undefined,
            rightIcon ? "pr-9" : undefined,
            error ? "border-destructive focus-visible:border-red-500" : undefined,
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
