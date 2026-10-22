"use client";

import { useMemo, useState } from "react";
import { fingerprintText, isAddress, mintPlan, shortHex } from "@provenant/core";
import { useRegistry } from "@/components/registry-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/components/wallet";

export default function RegisterPage() {
  const { addWork } = useRegistry();
  const { address } = useWallet();
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const [royaltyBps, setRoyaltyBps] = useState("500");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ id: string; fingerprint: string; native?: string } | null>(null);

  const preview = useMemo(() => {
    try {
      return fingerprintText(text);
    } catch {
      return null;
    }
  }, [text]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(null);
    const bps = Number(royaltyBps);
    if (!title.trim()) return setError("Give the work a title.");
    if (!authorName.trim()) return setError("The author name is self-declared, and it is required.");
    if (!isAddress(evmAddress)) return setError("Payout address must be a 20-byte 0x address.");
    if (!Number.isInteger(bps) || bps < 1 || bps > 10_000) return setError("Royalty must be a whole number of basis points from 1 to 10000.");
    if (!preview) return setError("Paste at least one paragraph.");
    setPending(true);
    try {
      let nativeCall: string | undefined;
      const prepared = await fetch("/api/native/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, authorName, owner: evmAddress, text, royaltyBps: bps }),
      });
      const body = (await prepared.json()) as { callHex?: string; mode?: string; error?: string };
      if (body.callHex) nativeCall = body.callHex;
      const work = addWork({ title, authorName, evmAddress, royaltyBps: bps, text, nativeCall });
      setDone({ id: work.id, fingerprint: work.fingerprint, native: nativeCall });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not register the work.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Author</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Register a work</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Fingerprinting happens in the browser. The licence rate is what a lab owes when this work is in a training manifest. Identity on testnet is self-declared: there is no registrar.
        </p>
        <form className="mt-8 space-y-5" onSubmit={(event) => void onSubmit(event)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Pride and Prejudice, chapter 1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author name</Label>
            <Input id="author" value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="Jane Austen" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="payout">EVM payout address</Label>
              {address ? (
                <button type="button" className="text-xs text-support underline decoration-line underline-offset-4" onClick={() => setEvmAddress(address)}>
                  Use connected wallet
                </button>
              ) : null}
            </div>
            <Input id="payout" value={evmAddress} onChange={(event) => setEvmAddress(event.target.value)} placeholder="0x…" spellCheck={false} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bps">Royalty, basis points</Label>
            <Input id="bps" inputMode="numeric" value={royaltyBps} onChange={(event) => setRoyaltyBps(event.target.value)} />
            <p className="text-xs text-muted">500 is 5% of the training deposit the lab posts for a run that includes this work.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chapter">Chapter</Label>
            <Textarea id="chapter" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the text. A blank line starts a new chunk." />
          </div>
          {error ? <p role="alert" className="border border-danger/30 bg-white px-3 py-2 text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={pending}>{pending ? "Registering…" : "Register work"}</Button>
        </form>
        {done ? (
          <div className="mt-6 border border-line bg-white p-4" role="status">
            <Badge tone="support">In the workshop registry</Badge>
            <p className="mt-3 break-all font-mono text-xs">{done.fingerprint}</p>
            <p className="mt-2 text-sm text-muted">Id {done.id}. The native batch is encoded when the relayer can see the chain. It is not submitted until SURI and tPOT are set.</p>
            {done.native ? <p className="mt-2 break-all font-mono text-xs text-muted">{done.native.slice(0, 120)}…</p> : null}
          </div>
        ) : null}
      </div>
      <aside className="border border-line bg-white p-5 lg:sticky lg:top-6 lg:self-start">
        <h2 className="text-sm font-medium">Fingerprint</h2>
        {preview ? (
          <div className="mt-4 space-y-4">
            <p className="break-all font-mono text-xs">{preview.fingerprint}</p>
            <ol className="space-y-3">
              {preview.chunks.map((chunk) => (
                <li key={chunk.sha256} className="border-t border-line pt-3">
                  <p className="text-sm leading-relaxed">{chunk.text}</p>
                  <p className="mt-1 font-mono text-xs text-muted">{shortHex(chunk.sha256, 12, 6)}</p>
                </li>
              ))}
            </ol>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Native batchAll</p>
              <ul className="mt-2 space-y-1 text-sm">
                {mintPlan(false).map((step) => (
                  <li key={step.method + step.note}><span className="font-mono text-xs">{step.module}.{step.method}</span></li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted">Paste a chapter to see the chunks and the fingerprint. Nothing is hashed on a server.</p>
        )}
      </aside>
    </div>
  );
}
