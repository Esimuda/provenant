import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-40 w-full resize-y rounded-[4px] border border-line bg-white px-3 py-3 text-sm leading-relaxed text-ink outline-none transition-colors duration-200 placeholder:text-muted/80",
        className,
      )}
      {...props}
    />
  );
}
