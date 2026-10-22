import { sha256 } from "@noble/hashes/sha2";
import { FINGERPRINT_ALGO, FINGERPRINT_DOMAIN } from "./constants.js";
import { bytesToHex, concat, utf8, type Hex } from "./hex.js";

export type Chunk = {
  index: number;
  text: string;
  sha256: Hex;
};

export type WorkFingerprint = {
  algorithm: typeof FINGERPRINT_ALGO;
  chunks: Chunk[];
  fingerprint: Hex;
};

/**
 * Split a chapter into exact chunks on blank lines.
 * Newlines are normalized; each chunk is trimmed. Internal spaces stay as pasted.
 */
export function chunkText(input: string): string[] {
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];
  return text
    .split(/\n[ \t]*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** SHA-256 chain: H0 = sha256(domain), Hi = sha256(H{i-1} || sha256(chunk i)). */
export function fingerprintText(input: string): WorkFingerprint {
  const parts = chunkText(input);
  if (parts.length === 0) throw new Error("chapter is empty");
  let acc = sha256(utf8(FINGERPRINT_DOMAIN));
  const chunks: Chunk[] = parts.map((text, index) => {
    const digest = sha256(utf8(text));
    acc = sha256(concat([acc, digest]));
    return { index, text, sha256: bytesToHex(digest) };
  });
  return {
    algorithm: FINGERPRINT_ALGO,
    chunks,
    fingerprint: bytesToHex(acc),
  };
}
