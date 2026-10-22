"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fingerprintText, isAddress, leaf, manifestHash, merkleRoot, royaltyWei, type Address, type Hex } from "@provenant/core";
import { seedRegistry } from "@/lib/seed";
import type { ClaimRecord, DatasetRecord, Registry, WorkRecord } from "@/lib/types";

const KEY = "provenant.registry.v1";

type RegistryApi = {
  ready: boolean;
  registry: Registry;
  addWork: (input: { title: string; authorName: string; evmAddress: string; royaltyBps: number; text: string; txHash?: string; nativeCall?: string }) => WorkRecord;
  publish: (input: { model: string; lab: string; deposit: bigint; workIds: string[]; txHash?: string; chainId?: string }) => DatasetRecord;
  recordClaim: (localId: string, claim: ClaimRecord) => void;
  reset: () => void;
  loadSample: () => void;
};

const Ctx = createContext<RegistryApi | null>(null);

export function RegistryProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<Registry>({ works: [], datasets: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved) {
      try {
        setRegistry(JSON.parse(saved) as Registry);
        setReady(true);
        return;
      } catch {
        // fall through to the sample market
      }
    }
    const seeded = seedRegistry();
    window.localStorage.setItem(KEY, JSON.stringify(seeded));
    setRegistry(seeded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(KEY, JSON.stringify(registry));
  }, [ready, registry]);

  const api = useMemo<RegistryApi>(() => {
    return {
      ready,
      registry,
      addWork: (input) => {
        if (!isAddress(input.evmAddress)) throw new Error("Payout address must be a 20-byte 0x address.");
        const finger = fingerprintText(input.text);
        const work: WorkRecord = {
          id: `work-${finger.fingerprint.slice(2, 10)}-${Date.now().toString(36)}`,
          title: input.title.trim(),
          authorName: input.authorName.trim(),
          evmAddress: input.evmAddress,
          royaltyBps: input.royaltyBps,
          text: input.text,
          fingerprint: finger.fingerprint,
          chunkCount: finger.chunks.length,
          createdAt: new Date().toISOString(),
          sample: false,
          txHash: input.txHash,
          nativeCall: input.nativeCall,
        };
        setRegistry((current) => ({ ...current, works: [work, ...current.works] }));
        return work;
      },
      publish: (input) => {
        if (!isAddress(input.lab)) throw new Error("Lab address must be a 20-byte 0x address.");
        const chosen = registry.works.filter((work) => input.workIds.includes(work.id));
        if (chosen.length === 0) throw new Error("Select at least one registered work.");
        const rows = chosen.map((work) => {
          const royalty = royaltyWei(input.deposit, work.royaltyBps);
          return { work, royalty };
        });
        const total = rows.reduce((sum, row) => sum + row.royalty, 0n);
        if (total > input.deposit) throw new Error("Royalties exceed the deposit. Raise the deposit or lower a licence rate.");
        const leaves = rows.map((row) => leaf(row.work.fingerprint, row.work.evmAddress, row.royalty));
        const root = merkleRoot(leaves);
        const lab = input.lab as Address;
        const works = rows.map((row) => ({
          workId: row.work.id,
          title: row.work.title,
          fingerprint: row.work.fingerprint,
          author: row.work.evmAddress,
          royalty: row.royalty.toString(),
          chunkCount: row.work.chunkCount,
        }));
        const dataset: DatasetRecord = {
          localId: `dataset-${root.slice(2, 10)}`,
          chainId: input.chainId,
          model: input.model.trim(),
          lab,
          deposit: input.deposit.toString(),
          root,
          manifestHash: manifestHash({
            version: 1,
            licence: "training-royalty-v1",
            model: input.model.trim(),
            lab,
            root,
            works: works.map((work) => ({
              id: work.workId,
              title: work.title,
              fingerprint: work.fingerprint,
              author: work.author,
              royalty: work.royalty,
              chunkCount: work.chunkCount,
            })),
          }),
          works,
          claims: [],
          txHash: input.txHash,
          createdAt: new Date().toISOString(),
          sample: false,
        };
        setRegistry((current) => ({ ...current, datasets: [dataset, ...current.datasets] }));
        return dataset;
      },
      recordClaim: (localId, claim) => {
        setRegistry((current) => ({
          ...current,
          datasets: current.datasets.map((dataset) =>
            dataset.localId === localId ? { ...dataset, claims: [...dataset.claims, claim] } : dataset,
          ),
        }));
      },
      reset: () => setRegistry({ works: [], datasets: [] }),
      loadSample: () => setRegistry(seedRegistry()),
    };
  }, [ready, registry]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useRegistry(): RegistryApi {
  const value = useContext(Ctx);
  if (!value) throw new Error("useRegistry must be used inside RegistryProvider");
  return value;
}

export type { Hex };
