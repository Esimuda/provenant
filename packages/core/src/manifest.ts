import { sha256 } from "@noble/hashes/sha2";
import { LICENCE_CODE, MANIFEST_MAX_BYTES, NFT_KEY_MAX, NFT_VALUE_MAX } from "./constants.js";
import { bytesToHex, isAddress, isBytes32, utf8, type Address, type Hex } from "./hex.js";

export type ManifestWork = {
  id: string;
  title: string;
  fingerprint: Hex;
  author: Address;
  royalty: string;
  chunkCount: number;
};

export type Manifest = {
  version: 1;
  licence: typeof LICENCE_CODE;
  model: string;
  lab: Address;
  works: ManifestWork[];
  root: Hex;
};

export function canonicalManifest(manifest: Manifest): string {
  return JSON.stringify(manifest);
}

export function manifestHash(manifest: Manifest): Hex {
  const bytes = utf8(canonicalManifest(manifest));
  if (bytes.length > MANIFEST_MAX_BYTES) {
    throw new Error(`manifest is ${bytes.length} bytes; transactionStorage caps at ${MANIFEST_MAX_BYTES}`);
  }
  return bytesToHex(sha256(bytes));
}

export function assertManifest(manifest: Manifest): void {
  if (manifest.version !== 1) throw new Error("unsupported manifest version");
  if (!manifest.model.trim()) throw new Error("model name is required");
  if (!isAddress(manifest.lab)) throw new Error("lab address is invalid");
  if (!isBytes32(manifest.root)) throw new Error("root is invalid");
  if (manifest.works.length === 0) throw new Error("manifest has no works");
  for (const work of manifest.works) {
    if (!isBytes32(work.fingerprint)) throw new Error(`bad fingerprint for ${work.title}`);
    if (!isAddress(work.author)) throw new Error(`bad author for ${work.title}`);
    if (!/^\d+$/.test(work.royalty) || BigInt(work.royalty) <= 0n) {
      throw new Error(`bad royalty for ${work.title}`);
    }
  }
}

export type Attribute = { key: string; value: string };

export function workAttributes(input: {
  fingerprint: Hex;
  royaltyBps: number;
  title: string;
  chunkCount: number;
  authorName: string;
}): Attribute[] {
  const attributes: Attribute[] = [
    { key: "fingerprint", value: input.fingerprint },
    { key: "licence", value: LICENCE_CODE },
    { key: "royaltyBps", value: String(input.royaltyBps) },
    { key: "algo", value: "sha256-chunk-chain-v1" },
    { key: "chunks", value: String(input.chunkCount) },
    { key: "title", value: input.title },
    { key: "authorName", value: input.authorName },
    { key: "identity", value: "self-declared" },
  ];
  for (const attribute of attributes) {
    if (utf8(attribute.key).length > NFT_KEY_MAX) throw new Error(`attribute key too long: ${attribute.key}`);
    if (utf8(attribute.value).length > NFT_VALUE_MAX) {
      throw new Error(`attribute value too long: ${attribute.key}`);
    }
  }
  return attributes;
}

export type PlannedCall = { module: string; method: string; note: string };

/** The batchAll the native minter submits. Human-readable; encoding happens against chain metadata. */
export function mintPlan(hasCollection: boolean): PlannedCall[] {
  const calls: PlannedCall[] = [];
  if (!hasCollection) {
    calls.push({ module: "nfts", method: "create", note: "Open a Work collection. The issuer is the signer." });
  }
  calls.push({ module: "nfts", method: "mint", note: "Mint the Work item to the author." });
  calls.push({
    module: "nfts",
    method: "setAttribute",
    note: "CollectionOwner attributes: fingerprint, licence, royalty bps, algorithm. Locked next.",
  });
  calls.push({
    module: "nfts",
    method: "lockItemProperties",
    note: "Lock metadata and attributes. Irreversible on pallet-nfts.",
  });
  calls.push({
    module: "utility",
    method: "batchAll",
    note: "One extrinsic. Any failure rolls the whole registration back.",
  });
  return calls;
}
