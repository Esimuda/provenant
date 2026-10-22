import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { ethers } from "ethers";
import {
  DEMO_AUTHOR,
  FINGERPRINT_DOMAIN,
  PLANCK_WEI,
  chunkText,
  fingerprintText,
  formatTpot,
  leaf,
  manifestHash,
  merkleProof,
  merkleRoot,
  mintPlan,
  parseTpot,
  proofFor,
  royaltyWei,
  sampleMarket,
  scanBytecode,
  verifyProof,
  vestingSchedule,
  workAttributes,
  type Hex,
} from "../src/index.ts";

function referenceFingerprint(chunks: string[]): string {
  let acc = createHash("sha256").update(FINGERPRINT_DOMAIN).digest();
  for (const chunk of chunks) {
    const digest = createHash("sha256").update(chunk).digest();
    acc = createHash("sha256").update(Buffer.concat([acc, digest])).digest();
  }
  return `0x${acc.toString("hex")}`;
}

test("chunking keeps exact paragraphs and drops empty ones", () => {
  const chunks = chunkText("  Alpha\r\n\r\n\r\nBeta  \n\n  ");
  assert.deepEqual(chunks, ["Alpha", "Beta"]);
});

test("fingerprint matches an independent SHA-256 chain", () => {
  const text = "First sentence of the chapter.\n\nSecond sentence, still exact.";
  const finger = fingerprintText(text);
  assert.equal(finger.chunks.length, 2);
  assert.equal(finger.fingerprint, referenceFingerprint(finger.chunks.map((chunk) => chunk.text)));
  assert.notEqual(fingerprintText("First sentence of the chapter.\n\nSecond sentence, still exact!").fingerprint, finger.fingerprint);
});

test("leaf matches ethers abi.encodePacked keccak", () => {
  const fingerprint = `0x${"ab".repeat(32)}` as Hex;
  const author = DEMO_AUTHOR;
  const royalty = 100_000_000_000_000_000n;
  const ours = leaf(fingerprint, author, royalty);
  const theirs = ethers.solidityPackedKeccak256(
    ["bytes32", "address", "uint256"],
    [fingerprint, author, royalty],
  );
  assert.equal(ours, theirs.toLowerCase());
});

test("sorted-pair proofs verify for 1, 2, 3 and 5 leaves, and reject a stranger", () => {
  for (const count of [1, 2, 3, 5]) {
    const leaves = Array.from({ length: count }, (_, index) =>
      leaf(`0x${(index + 1).toString(16).padStart(64, "0")}` as Hex, DEMO_AUTHOR, 10_000n * BigInt(index + 1)),
    );
    const root = merkleRoot(leaves);
    for (let index = 0; index < leaves.length; index++) {
      const proof = merkleProof(leaves, index);
      assert.equal(verifyProof(root, leaves[index], proof), true);
      assert.equal(verifyProof(root, leaves[index], proof.slice(0, -1)), count === 1 ? true : false);
    }
  }
  assert.throws(() => merkleRoot([]));
  const pair = [
    leaf(`0x${"11".repeat(32)}` as Hex, DEMO_AUTHOR, 10_000n),
    leaf(`0x${"11".repeat(32)}` as Hex, DEMO_AUTHOR, 10_000n),
  ];
  assert.throws(() => merkleRoot(pair));
});

test("sample market pays Austen and Doyle and refuses Frankenstein", () => {
  const market = sampleMarket();
  assert.equal(market.trained.length, 2);
  assert.equal(market.deposit % PLANCK_WEI, 0n);
  for (const work of market.trained) {
    const proof = proofFor(market, work.fingerprint);
    assert.ok(proof);
    assert.equal(proof.royalty, market.royaltyEach);
  }
  assert.equal(proofFor(market, market.heldOut.fingerprint), null);
  const manifest = manifestHash({
    version: 1,
    licence: market.licence,
    model: market.model,
    lab: market.lab,
    root: market.root,
    works: market.trained.map((work) => ({
      id: work.id,
      title: work.title,
      fingerprint: work.fingerprint,
      author: work.author,
      royalty: work.royalty.toString(),
      chunkCount: work.chunkCount,
    })),
  });
  assert.match(manifest, /^0x[0-9a-f]{64}$/);
});

test("royalty and vesting math stay on planck boundaries", () => {
  assert.equal(royaltyWei(parseTpot("1"), 500), parseTpot("0.05"));
  assert.equal(formatTpot(parseTpot("0.1")), "0.1");
  const schedule = vestingSchedule(10_000_000_000_000_000n, 10_000n, 20n);
  assert.equal(schedule.perBlock, 1_000_000_000_000n);
  assert.throws(() => vestingSchedule(10n, 3n, 0n));
});

test("attribute plan respects pallet limits and describes the batch", () => {
  const market = sampleMarket();
  const work = market.trained[0];
  const attributes = workAttributes({
    fingerprint: work.fingerprint,
    royaltyBps: work.royaltyBps,
    title: work.title,
    chunkCount: work.chunkCount,
    authorName: work.authorName,
  });
  assert.ok(attributes.some((item) => item.key === "licence" && item.value === "training-royalty-v1"));
  assert.ok(attributes.some((item) => item.value === "self-declared"));
  const plan = mintPlan(false);
  assert.equal(plan.at(-1)?.method, "batchAll");
  assert.ok(plan.some((step) => step.method === "lockItemProperties"));
});

test("bytecode scanner sees TIMESTAMP in a push-aware way and ignores PUSH data", () => {
  // PUSH1 0x42, then TIMESTAMP, then CREATE
  const hex = "0x604242f0";
  const hits = scanBytecode(hex);
  assert.deepEqual(hits.block.map((hit) => hit.name), ["TIMESTAMP"]);
  assert.deepEqual(hits.create.map((hit) => hit.name), ["CREATE"]);
});
