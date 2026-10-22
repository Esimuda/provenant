import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const file = join(repoRoot, "evidence", "submitted-hashes.jsonl");

/** Persist a hash the moment we have one. The EVM RPC prunes receipts; we do not wait. */
export function rememberHash(entry: Record<string, unknown>): void {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

export function say(message: string): void {
  process.stdout.write(`${message}\n`);
}
