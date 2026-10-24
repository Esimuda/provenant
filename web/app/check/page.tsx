"use client";

import { useState } from "react";
import { formatTpot, shortHex, SAMPLE_WORKS } from "@provenant/core";
import { ProvenanceTrail, type TrailStep } from "@/components/provenance-trail";
import { useRegistry } from "@/components/registry-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inclusion, type InclusionHit } from "@/lib/inclusion";
import { chainMode } from "@/lib/utils";
import { walletClaim } from "@/lib/wallet-tx";
import { useWallet } from "@/components/wallet";

type Receipt = { local: boolean; hash?: string; amount: string; title: string };

export default function CheckPage() {
  const { ready, registry, recordClaim } = useRegistry();
  const { address } = useWallet();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ fingerprint: string; hits: InclusionHit[] } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  function runCheck(value: string) {
    setError(null);
    setReceipt(null);
    try {
      const found = inclusion(value, registry.datasets);
      setResult({ fingerprint: found.fingerprint, hits: found.hits });
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "Could not fingerprint that text.");
    }
  }

  async function claim(hit: InclusionHit) {
    setError(null);
    setPending(true);
    try {
      const mode = chainMode();
      const sameWallet = Boolean(address && address.toLowerCase() === hit.author.toLowerCase());
      if (mode === "portaldot") {
        if (!sameWallet) {
          throw new Error(`This royalty is payable to ${shortHex(hit.author, 8, 4)}. Connect that wallet to claim on testnet.`);
        }
        const hash = await walletClaim(BigInt(hit.dataset.chainId || "1"), hit.fingerprint, hit.royalty, hit.proof);
        recordClaim(hit.dataset.localId, {
          fingerprint: hit.fingerprint,
          author: hit.author,
          amount: hit.royalty.toString(),
          at: new Date().toISOString(),
          txHash: hash,
          local: false,
        });
        setReceipt({ local: false, hash, amount: hit.royalty.toString(), title: hit.title });
        return;
      }
      if (mode === "local") {
        const response = await fetch("/api/evm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "claim",
            datasetId: hit.dataset.chainId || "1",
            fingerprint: hit.fingerprint,
            royalty: hit.royalty.toString(),
            proof: hit.proof,
          }),
        });
        const body = (await response.json()) as { hash?: string; error?: string };
        if (!response.ok) throw new Error(body.error || "Claim failed.");
        recordClaim(hit.dataset.localId, {
          fingerprint: hit.fingerprint,
          author: hit.author,
          amount: hit.royalty.toString(),
          at: new Date().toISOString(),
          txHash: body.hash,
          local: false,
        });
        setReceipt({ local: false, hash: body.hash, amount: hit.royalty.toString(), title: hit.title });
        return;
      }
      recordClaim(hit.dataset.localId, {
        fingerprint: hit.fingerprint,
        author: hit.author,
        amount: hit.royalty.toString(),
        at: new Date().toISOString(),
        local: true,
      });
      setReceipt({ local: true, amount: hit.royalty.toString(), title: hit.title });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Claim failed.");
    } finally {
      setPending(false);
    }
  }

  const hit = result?.hits[0];
  const steps: TrailStep[] = !result
    ? [
        { kicker: "Waiting", title: "Paste a chapter", detail: "The trail draws once the fingerprint exists." },
      ]
    : hit
      ? [
          { kicker: "Fingerprint", title: "Exact chunks", detail: result.fingerprint },
          { kicker: "Manifest", title: hit.dataset.model, detail: hit.dataset.root },
          { kicker: "Proof", title: `${hit.proof.length} sibling${hit.proof.length === 1 ? "" : "s"}`, detail: hit.proof[0] || "Single-leaf tree" },
          { kicker: "Payout", title: receipt ? `${formatTpot(BigInt(receipt.amount))} tPOT` : "Royalty owed", detail: receipt?.hash || hit.author, tone: receipt ? "support" : "accent" },
        ]
      : [
          { kicker: "Fingerprint", title: "Exact chunks", detail: result.fingerprint, tone: "accent" },
          { kicker: "Manifest", title: "No membership", detail: "This text is not a leaf of a published root." },
        ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">Author</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Was my work used?</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Paste your chapter. A match pays out instantly.
      </p>
      {!ready ? (
        <div className="mt-8 h-48 animate-pulse bg-white" aria-busy="true" />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              runCheck(text);
            }}
          >
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setText(SAMPLE_WORKS[0].text); runCheck(SAMPLE_WORKS[0].text); }}>
                Austen, in the sample set
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setText(SAMPLE_WORKS[2].text); runCheck(SAMPLE_WORKS[2].text); }}>
                Shelley, held out
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-text">Chapter</Label>
              <Textarea id="check-text" value={text} onChange={(event) => setText(event.target.value)} />
            </div>
            <Button type="submit">Check inclusion</Button>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            {result && !hit ? (
              <div className="border border-line bg-white p-4" role="status">
                <Badge tone="accent">Not included</Badge>
                <p className="mt-3 text-sm leading-relaxed">No published manifest contains this fingerprint. There is no royalty to pay.</p>
                <p className="mt-2 break-all font-mono text-xs text-muted">{result.fingerprint}</p>
              </div>
            ) : null}
            {hit ? (
              <div className="border border-line bg-white p-4" role="status">
                <Badge tone="support">Included</Badge>
                <h2 className="mt-3 font-display text-3xl tracking-tight">{hit.title}</h2>
                <p className="mt-1 text-sm text-muted">{hit.dataset.model} · dataset {hit.dataset.chainId || hit.dataset.localId}</p>
                <p className="mt-4 font-display text-4xl">{formatTpot(hit.royalty)} tPOT</p>
                <p className="mt-1 text-xs text-muted">Payable to {shortHex(hit.author, 8, 4)}</p>
                <Button type="button" className="mt-4" disabled={pending || Boolean(receipt)} onClick={() => void claim(hit)}>
                  {pending ? "Claiming…" : receipt ? "Royalty recorded" : "Claim royalty"}
                </Button>
                {receipt ? (
                  <div className="mt-4 border-t border-line pt-3 text-sm">
                    <p>{receipt.local ? "Recorded in the workshop registry. No tPOT moved." : "Royalty paid on the configured chain."}</p>
                    {receipt.hash ? (
                      <p className="mt-2 break-all font-mono text-xs">EVM tx {receipt.hash}. There is no public EVM explorer; the hash is the proof.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </form>
          <ProvenanceTrail
            sentence={text.trim() ? text.trim().split(/\n\s*\n/)[0].slice(0, 280) : "Paste a sentence. The path runs from that sentence to a payout."}
            attribution={hit ? hit.title : "Provenance trail"}
            steps={steps}
          />
        </div>
      )}
    </div>
  );
}
