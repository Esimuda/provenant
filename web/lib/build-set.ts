import { leaf, manifestHash, merkleRoot, royaltyWei, type Address, type Hex } from "@provenant/core";
import type { WorkRecord } from "./types";

export function buildSet(works: WorkRecord[], deposit: bigint, model: string, lab: Address) {
  if (works.length === 0) throw new Error("Select at least one registered work.");
  const rows = works.map((work) => ({ work, royalty: royaltyWei(deposit, work.royaltyBps) }));
  const total = rows.reduce((sum, row) => sum + row.royalty, 0n);
  if (total > deposit) throw new Error("Royalties exceed the deposit. Raise the deposit or lower a licence rate.");
  const root = merkleRoot(rows.map((row) => leaf(row.work.fingerprint, row.work.evmAddress, row.royalty)));
  const listed = rows.map((row) => ({
    id: row.work.id,
    title: row.work.title,
    fingerprint: row.work.fingerprint,
    author: row.work.evmAddress,
    royalty: row.royalty.toString(),
    chunkCount: row.work.chunkCount,
  }));
  return {
    root,
    total,
    rows,
    manifestHash: manifestHash({ version: 1, licence: "training-royalty-v1", model, lab, root, works: listed }),
  };
}

export type { Hex };
