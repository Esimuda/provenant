import { keccak_256 } from "@noble/hashes/sha3";
import { bytes32, bytesToHex, cmpHex, concat, hexToBytes, u256Bytes, addressBytes, type Address, type Hex } from "./hex.js";

function keccak(data: Uint8Array): Hex {
  return bytesToHex(keccak_256(data));
}

/** Sorted-pair keccak, matching Provenant.sol. */
export function hashPair(a: Hex, b: Hex): Hex {
  const [left, right] = cmpHex(a, b) <= 0 ? [a, b] : [b, a];
  return keccak(concat([bytes32(left), bytes32(right)]));
}

/**
 * Leaf committed by the lab: keccak256(abi.encodePacked(fingerprint, author, royalty)).
 * The author is the EVM address that must call claim. Royalty is wei, a multiple of 10^4.
 */
export function leaf(fingerprint: Hex, author: Address, royalty: bigint): Hex {
  return keccak(concat([bytes32(fingerprint), addressBytes(author), u256Bytes(royalty)]));
}

export function merkleRoot(leaves: Hex[]): Hex {
  if (leaves.length === 0) throw new Error("empty tree");
  const seen = new Set<string>();
  for (const item of leaves) {
    const key = item.toLowerCase();
    if (seen.has(key)) throw new Error("duplicate leaf");
    seen.add(key);
  }
  let level = leaves.map((item) => item.toLowerCase() as Hex);
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    level = next;
  }
  return level[0];
}

/** Sibling list. An odd node with no sibling contributes no proof element, matching the contract. */
export function merkleProof(leaves: Hex[], index: number): Hex[] {
  if (index < 0 || index >= leaves.length) throw new Error("leaf index out of range");
  let level = leaves.map((item) => item.toLowerCase() as Hex);
  let cursor = index;
  const proof: Hex[] = [];
  while (level.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) next.push(level[i]);
      else next.push(hashPair(level[i], level[i + 1]));
    }
    const sibling = cursor ^ 1;
    if (sibling < level.length) proof.push(level[sibling]);
    cursor = Math.floor(cursor / 2);
    level = next;
  }
  return proof;
}

export function verifyProof(root: Hex, claimLeaf: Hex, proof: Hex[]): boolean {
  let hash = claimLeaf.toLowerCase() as Hex;
  for (const step of proof) hash = hashPair(hash, step);
  return hash === root.toLowerCase();
}

export function hexToBytes32(hex: Hex): Uint8Array {
  return hexToBytes(hex);
}
