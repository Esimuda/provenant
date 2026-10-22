import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "ink", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "ink" | "support" | "accent" | "line" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-medium tracking-wide",
        tone === "ink" && "bg-ink text-paper",
        tone === "support" && "bg-support text-white",
        tone === "accent" && "bg-accent text-ink",
        tone === "line" && "border border-line bg-white text-muted",
        className,
      )}
      {...props}
    />
  );
}
