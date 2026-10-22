import { fingerprintText, leaf, merkleProof, verifyProof, type Hex } from "@provenant/core";
import type { DatasetRecord } from "./types";

export type InclusionHit = {
  dataset: DatasetRecord;
  title: string;
  author: `0x${string}`;
  royalty: bigint;
  proof: Hex[];
  fingerprint: Hex;
};

export function inclusion(text: string, datasets: DatasetRecord[]): { fingerprint: Hex; chunks: number; hits: InclusionHit[] } {
  const finger = fingerprintText(text);
  const hits: InclusionHit[] = [];
  for (const dataset of datasets) {
    const index = dataset.works.findIndex((work) => work.fingerprint.toLowerCase() === finger.fingerprint.toLowerCase());
    if (index < 0) continue;
    const work = dataset.works[index];
    const royalty = BigInt(work.royalty);
    const leaves = dataset.works.map((item) => leaf(item.fingerprint, item.author, BigInt(item.royalty)));
    const proof = merkleProof(leaves, index);
    if (!verifyProof(dataset.root, leaves[index], proof)) continue;
    hits.push({
      dataset,
      title: work.title,
      author: work.author,
      royalty,
      proof,
      fingerprint: finger.fingerprint,
    });
  }
  return { fingerprint: finger.fingerprint, chunks: finger.chunks.length, hits };
}
