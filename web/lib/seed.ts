import { fingerprintText, manifestHash, sampleMarket, type Address } from "@provenant/core";
import type { Registry } from "./types";

export function seedRegistry(): Registry {
  const market = sampleMarket();
  const works = market.works.map((work) => {
    const finger = fingerprintText(work.text);
    return {
      id: work.id,
      title: work.title,
      authorName: work.authorName,
      evmAddress: work.author,
      royaltyBps: work.royaltyBps,
      text: work.text,
      fingerprint: finger.fingerprint,
      chunkCount: finger.chunks.length,
      createdAt: "2026-10-22T00:00:00.000Z",
      sample: true,
    };
  });
  const trained = works.filter((work) => market.trained.some((item) => item.id === work.id));
  const manifest = {
    version: 1 as const,
    licence: market.licence,
    model: market.model,
    lab: market.lab,
    root: market.root,
    works: trained.map((work) => ({
      id: work.id,
      title: work.title,
      fingerprint: work.fingerprint,
      author: work.evmAddress,
      royalty: market.royaltyEach.toString(),
      chunkCount: work.chunkCount,
    })),
  };
  return {
    works,
    datasets: [
      {
        localId: "sample-dataset",
        chainId: "1",
        model: market.model,
        lab: market.lab as Address,
        deposit: market.deposit.toString(),
        root: market.root,
        manifestHash: manifestHash(manifest),
        works: manifest.works.map((work) => ({
          workId: work.id,
          title: work.title,
          fingerprint: work.fingerprint,
          author: work.author,
          royalty: work.royalty,
          chunkCount: work.chunkCount,
        })),
        claims: [],
        createdAt: "2026-10-22T00:00:00.000Z",
        sample: true,
      },
    ],
  };
}
