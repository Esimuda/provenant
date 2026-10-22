"use client";

import { useEffect, useState } from "react";
import { Fingerprint, ScrollText, Stamp, Database, Cpu, ShieldCheck, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = [ScrollText, Fingerprint, Stamp, Database, Cpu, ShieldCheck, Coins];

export type TrailStep = {
  kicker: string;
  title: string;
  detail: string;
  tone?: "ink" | "accent" | "support";
};

export function ProvenanceTrail({
  sentence,
  attribution,
  steps,
}: {
  sentence: string;
  attribution: string;
  steps: TrailStep[];
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [sentence, steps.length]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <figure className="border border-line bg-white p-6 shadow-card sm:p-8">
        <figcaption className="text-xs uppercase tracking-[0.16em] text-muted">The sentence</figcaption>
        <blockquote className="mt-4 font-display text-3xl italic leading-snug tracking-tight text-ink sm:text-4xl">
          {sentence}
        </blockquote>
        <p className="mt-6 text-sm text-muted">{attribution}</p>
      </figure>
      <ol className="relative m-0 list-none p-0 pl-8">
        <div
          aria-hidden
          className={cn(
            "absolute bottom-3 left-[11px] top-3 w-px origin-top bg-accent motion-safe:transition-transform motion-safe:duration-300",
            drawn ? "scale-y-100" : "scale-y-0",
          )}
        />
        {steps.map((step, index) => {
          const Icon = icons[index] ?? ScrollText;
          const tone = step.tone ?? "ink";
          return (
            <li
              key={step.kicker}
              className={cn(
                "relative pb-5 motion-safe:transition-opacity motion-safe:duration-200",
                drawn ? "opacity-100" : "opacity-0",
              )}
              style={{ transitionDelay: `${Math.min(index * 40, 240)}ms` }}
            >
              <span
                className={cn(
                  "absolute -left-8 top-1 grid h-6 w-6 place-items-center rounded-full border bg-paper",
                  tone === "support" ? "border-support text-support" : tone === "accent" ? "border-accent text-accent" : "border-ink text-ink",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{step.kicker}</p>
              <p className="mt-1 text-sm font-medium text-ink">{step.title}</p>
              <p className="mt-1 break-all font-mono text-xs leading-relaxed text-muted">{step.detail}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
