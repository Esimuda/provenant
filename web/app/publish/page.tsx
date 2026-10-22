"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_LAB, formatTpot, isAddress, parseTpot, royaltyWei, shortHex, type Address } from "@provenant/core";
import { useRegistry } from "@/components/registry-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSet } from "@/lib/build-set";
import { chainMode } from "@/lib/utils";
import { walletRegister } from "@/lib/wallet-tx";
import { useWallet } from "@/components/wallet";

export default function PublishPage() {
  const { ready, registry, publish } = useRegistry();
  const { address } = useWallet();
  const [model, setModel] = useState("lab-run-001");
  const [lab, setLab] = useState<string>(DEMO_LAB);
  const [deposit, setDeposit] = useState("1");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ root: string; txHash?: string; local: boolean } | null>(null);

  const quote = useMemo(() => {
    try {
      const value = parseTpot(deposit);
      const rows = registry.works.filter((work) => selected.includes(work.id)).map((work) => ({
        work,
        royalty: royaltyWei(value, work.royaltyBps),
      }));
      const total = rows.reduce((sum, row) => sum + row.royalty, 0n);
      return { value, rows, total, error: null as string | null };
    } catch (cause) {
      return { value: 0n, rows: [], total: 0n, error: cause instanceof Error ? cause.message : "Check the deposit." };
    }
  }, [deposit, registry.works, selected]);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(null);
    if (!model.trim()) return setError("Name the model or the training run.");
    if (!isAddress(lab)) return setError("Lab payout address must be a 20-byte 0x address.");
    if (quote.error) return setError(quote.error);
    if (quote.rows.length === 0) return setError("Select at least one work.");
    if (quote.total > quote.value) return setError("Royalties exceed the deposit.");
    setPending(true);
    try {
      const chosen = registry.works.filter((work) => selected.includes(work.id));
      const built = buildSet(chosen, quote.value, model.trim(), lab as Address);
      const mode = chainMode();
      let txHash: string | undefined;
      let chainId: string | undefined;
      let labAddress: string = lab;
      if (mode === "local") {
        const response = await fetch("/api/evm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "register", root: built.root, manifestHash: built.manifestHash, value: quote.value.toString() }),
        });
        const body = (await response.json()) as { hash?: string; datasetId?: string; lab?: string; error?: string };
        if (!response.ok) throw new Error(body.error || "The local node rejected the manifest.");
        txHash = body.hash;
        chainId = body.datasetId;
        if (body.lab && isAddress(body.lab)) labAddress = body.lab;
      } else if (mode === "portaldot") {
        const sent = await walletRegister(built.root, built.manifestHash, quote.value);
        txHash = sent.hash;
        chainId = sent.datasetId;
      }
      const dataset = publish({ model, lab: labAddress, deposit: quote.value, workIds: selected, txHash, chainId });
      setDone({ root: dataset.root, txHash, local: !txHash });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish.");
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
        <div className="h-8 w-48 animate-pulse bg-line" />
        <div className="mt-6 h-40 animate-pulse bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">Lab</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Publish a training set</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Pick the works, post a deposit, and the Merkle root is the commitment. On Portaldot the bytes of the manifest go to transactionStorage. The root and the deposit go to the contract.
      </p>
      {registry.works.length === 0 ? (
        <div className="mt-10 border border-line bg-white p-6">
          <h2 className="font-display text-3xl">No works yet</h2>
          <p className="mt-2 text-sm text-muted">A manifest needs at least one registered fingerprint.</p>
          <Button asChild className="mt-6"><Link href="/register">Register a work</Link></Button>
        </div>
      ) : (
        <form className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" onSubmit={(event) => void onSubmit(event)}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Works in this run</legend>
            {registry.works.map((work) => (
              <label key={work.id} className="flex cursor-pointer gap-3 border border-line bg-white p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-support"
                  checked={selected.includes(work.id)}
                  onChange={() => toggle(work.id)}
                />
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{work.title}</span>
                    {work.sample ? <Badge tone="line">Sample</Badge> : null}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{work.authorName} · {work.royaltyBps} bps · {work.chunkCount} chunks</span>
                  <span className="mt-1 block break-all font-mono text-xs text-muted">{shortHex(work.fingerprint, 12, 6)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-5 border border-line bg-white p-5">
            <div className="space-y-2">
              <Label htmlFor="model">Model or run</Label>
              <Input id="model" value={model} onChange={(event) => setModel(event.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="lab">Lab address</Label>
                {address ? (
                  <button type="button" className="text-xs text-support underline decoration-line underline-offset-4" onClick={() => setLab(address)}>
                    Use connected wallet
                  </button>
                ) : null}
              </div>
              <Input id="lab" value={lab} onChange={(event) => setLab(event.target.value)} placeholder="0x…" spellCheck={false} />
              {chainMode() === "local" ? (
                <p className="text-xs text-muted">Local mode signs with the Hardhat lab key. This address is what the workshop registry stores.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit">Deposit, tPOT</Label>
              <Input id="deposit" value={deposit} onChange={(event) => setDeposit(event.target.value)} inputMode="decimal" />
            </div>
            <dl className="space-y-2 border-t border-line pt-4 text-sm">
              {quote.rows.map((row) => (
                <div key={row.work.id} className="flex justify-between gap-3">
                  <dt className="text-muted">{row.work.title}</dt>
                  <dd className="font-mono">{formatTpot(row.royalty)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-medium">
                <dt>Royalties</dt>
                <dd className="font-mono">{formatTpot(quote.total)} / {deposit || "0"}</dd>
              </div>
            </dl>
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={pending}>{pending ? "Publishing…" : "Publish manifest"}</Button>
            {done ? (
              <div role="status" className="border border-line bg-paper p-3 text-sm">
                <Badge tone={done.local ? "line" : "support"}>{done.local ? "Workshop root" : "On chain"}</Badge>
                <p className="mt-2 break-all font-mono text-xs">{done.root}</p>
                {done.txHash ? <p className="mt-2 break-all font-mono text-xs">EVM tx {done.txHash}</p> : null}
              </div>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}
