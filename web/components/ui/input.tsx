import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[4px] border border-line bg-white px-3 text-sm text-ink outline-none transition-colors duration-200 placeholder:text-muted/80",
        className,
      )}
      {...props}
    />
  );
}
