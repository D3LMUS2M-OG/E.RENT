import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-md border border-border-strong bg-background px-3 text-base text-foreground placeholder:text-muted disabled:opacity-40 aria-[invalid=true]:border-2",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Field({ label, error, children, htmlFor }: { label: string; error?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium">Error: {error}</p>}
    </div>
  );
}
