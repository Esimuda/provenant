import { BLOCK_OPCODES, CREATE_OPCODES } from "./constants.js";
import { hexToBytes } from "./hex.js";

export type OpcodeHit = { pc: number; name: string };

/**
 * Linear scan that skips PUSH operands, so a PUSH of a value like 0x42
 * is not reported as TIMESTAMP. Also drops the Solidity CBOR metadata
 * trailer when it is present.
 */
export function scanBytecode(hex: string): { block: OpcodeHit[]; create: OpcodeHit[] } {
  const bytes = stripMetadata(hexToBytes(hex));
  const block: OpcodeHit[] = [];
  const create: OpcodeHit[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const op = bytes[i];
    if (op >= 0x60 && op <= 0x7f) {
      i += op - 0x5f;
      continue;
    }
    if (BLOCK_OPCODES[op]) block.push({ pc: i, name: BLOCK_OPCODES[op] });
    if (CREATE_OPCODES[op]) create.push({ pc: i, name: CREATE_OPCODES[op] });
  }
  return { block, create };
}

function stripMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4) return bytes;
  const length = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
  const tail = length + 2;
  if (length < 40 || length > 200 || tail >= bytes.length) return bytes;
  const start = bytes.length - tail;
  if (bytes[start] === 0xa1 || bytes[start] === 0xa2) return bytes.slice(0, start);
  return bytes;
}
