import { DEMO_AUTHOR, DEMO_LAB, LICENCE_CODE } from "./constants.js";
import { fingerprintText } from "./fingerprint.js";
import type { Address, Hex } from "./hex.js";
import { leaf, merkleProof, merkleRoot, verifyProof } from "./merkle.js";
import { assertPlanck } from "./money.js";

export type SampleWork = {
  id: string;
  title: string;
  authorName: string;
  source: string;
  year: number;
  text: string;
  inTraining: boolean;
  royaltyBps: number;
};

/**
 * Short public-domain openings. They are the demo corpus, not placeholder copy.
 * Austen 1813, Doyle 1891, Shelley 1818.
 */
export const SAMPLE_WORKS: SampleWork[] = [
  {
    id: "austen-pnp-1",
    title: "Pride and Prejudice, opening",
    authorName: "Jane Austen",
    source: "Pride and Prejudice",
    year: 1813,
    inTraining: true,
    royaltyBps: 500,
    text: [
      "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
      "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
    ].join("\n\n"),
  },
  {
    id: "doyle-scandal-1",
    title: "A Scandal in Bohemia, opening",
    authorName: "Arthur Conan Doyle",
    source: "The Adventures of Sherlock Holmes",
    year: 1892,
    inTraining: true,
    royaltyBps: 500,
    text: [
      "To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name.",
      "In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.",
    ].join("\n\n"),
  },
  {
    id: "shelley-frank-1",
    title: "Frankenstein, opening letter",
    authorName: "Mary Shelley",
    source: "Frankenstein",
    year: 1818,
    inTraining: false,
    royaltyBps: 500,
    text: [
      "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.",
      "I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.",
    ].join("\n\n"),
  },
];

export type MarketWork = {
  id: string;
  title: string;
  authorName: string;
  source: string;
  year: number;
  text: string;
  inTraining: boolean;
  royaltyBps: number;
  fingerprint: Hex;
  chunkCount: number;
  author: Address;
  royalty: bigint;
};

export type SampleMarket = {
  model: string;
  lab: Address;
  licence: typeof LICENCE_CODE;
  deposit: bigint;
  royaltyEach: bigint;
  root: Hex;
  works: MarketWork[];
  trained: MarketWork[];
  heldOut: MarketWork;
};

const SAMPLE_ROYALTY = 100_000_000_000_000_000n;
const SAMPLE_DEPOSIT = 1_000_000_000_000_000_000n;

export function sampleMarket(): SampleMarket {
  assertPlanck(SAMPLE_DEPOSIT, "deposit");
  assertPlanck(SAMPLE_ROYALTY, "royalty");
  const works: MarketWork[] = SAMPLE_WORKS.map((work) => {
    const finger = fingerprintText(work.text);
    return {
      ...work,
      fingerprint: finger.fingerprint,
      chunkCount: finger.chunks.length,
      author: DEMO_AUTHOR,
      royalty: work.inTraining ? SAMPLE_ROYALTY : 0n,
    };
  });
  const trained = works.filter((work) => work.inTraining);
  const leaves = trained.map((work) => leaf(work.fingerprint, work.author, work.royalty));
  const root = merkleRoot(leaves);
  const heldOut = works.find((work) => !work.inTraining);
  if (!heldOut) throw new Error("sample market needs a held-out work");
  return {
    model: "portaldot-demo-lora",
    lab: DEMO_LAB,
    licence: LICENCE_CODE,
    deposit: SAMPLE_DEPOSIT,
    royaltyEach: SAMPLE_ROYALTY,
    root,
    works,
    trained,
    heldOut,
  };
}

export function proofFor(market: SampleMarket, fingerprint: Hex): { index: number; proof: Hex[]; royalty: bigint; author: Address } | null {
  const index = market.trained.findIndex((work) => work.fingerprint.toLowerCase() === fingerprint.toLowerCase());
  if (index < 0) return null;
  const work = market.trained[index];
  const leaves = market.trained.map((item) => leaf(item.fingerprint, item.author, item.royalty));
  const proof = merkleProof(leaves, index);
  const claimLeaf = leaf(work.fingerprint, work.author, work.royalty);
  if (!verifyProof(market.root, claimLeaf, proof)) throw new Error("sample proof did not verify");
  return { index, proof, royalty: work.royalty, author: work.author };
}
