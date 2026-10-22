"use client";

import Link from "next/link";
import { formatTpot, shortHex } from "@provenant/core";
import { useRegistry } from "@/components/registry-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function RegistryPage() {
  const { ready, registry, reset, loadSample } = useRegistry();
  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6" aria-busy="true" aria-live="polite">
        <div className="h-10 w-64 animate-pulse bg-line" />
        <div className="h-28 animate-pulse bg-white" />
        <div className="h-28 animate-pulse bg-white" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Registry</p>
          <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Works and manifests</h1>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadSample}>Load sample</Button>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>Clear</Button>
        </div>
      </div>
      <section className="mt-10" aria-labelledby="works-heading">
        <h2 id="works-heading" className="text-sm font-medium">Works · {registry.works.length}</h2>
        {registry.works.length === 0 ? (
          <div className="mt-4 border border-dashed border-line bg-white p-6">
            <p className="font-display text-3xl">The registry is empty.</p>
            <p className="mt-2 text-sm text-muted">Register a chapter, or load the public-domain sample market.</p>
            <Button asChild className="mt-5"><Link href="/register">Register a work</Link></Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line bg-white">
            {registry.works.map((work) => (
              <li key={work.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-medium">{work.title}</p>
                  <p className="text-sm text-muted">{work.authorName} · {work.royaltyBps} bps · {work.chunkCount} chunks</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">{shortHex(work.fingerprint, 16, 8)}</p>
                </div>
                <div className="flex gap-2">
                  {work.sample ? <Badge tone="line">Sample</Badge> : <Badge tone="ink">Registered</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-10" aria-labelledby="sets-heading">
        <h2 id="sets-heading" className="text-sm font-medium">Training sets · {registry.datasets.length}</h2>
        {registry.datasets.length === 0 ? (
          <p className="mt-4 border border-dashed border-line bg-white p-6 text-sm text-muted">No manifest has been published from this browser.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {registry.datasets.map((dataset) => (
              <li key={dataset.localId} className="border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{dataset.model}</h3>
                  {dataset.sample ? <Badge tone="line">Sample</Badge> : null}
                  {dataset.txHash ? <Badge tone="support">On chain</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted">{dataset.works.length} works · deposit {formatTpot(BigInt(dataset.deposit))} tPOT · {dataset.claims.length} claims</p>
                <p className="mt-2 break-all font-mono text-xs text-muted">Root {dataset.root}</p>
                {dataset.txHash ? <p className="mt-1 break-all font-mono text-xs">EVM tx {dataset.txHash}</p> : null}
                {dataset.claims.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
                    {dataset.claims.map((claim) => (
                      <li key={claim.at + claim.fingerprint} className="break-all font-mono text-muted">
                        {claim.local ? "workshop" : "chain"} · {formatTpot(BigInt(claim.amount))} tPOT · {claim.txHash || "no tx"}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
