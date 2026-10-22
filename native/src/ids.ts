import type { Hex } from "@provenant/core";

/** Stable u32 item id in 1..2^32-2. Salt skips an id the chain already minted. */
export function itemIdFromFingerprint(fingerprint: Hex, salt = 0): number {
  const value = BigInt(fingerprint);
  const span = 0xffff_fffe;
  const base = Number(value % BigInt(span));
  return ((base + salt) % span) + 1;
}
