export type Hex = `0x${string}`;
export type Address = `0x${string}`;

export function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function bytesToHex(bytes: Uint8Array): Hex {
  let out = "0x";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out as Hex;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("odd hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function isAddress(value: string): value is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function isBytes32(value: string): value is Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function addressBytes(address: string): Uint8Array {
  if (!isAddress(address)) throw new Error("expected a 20-byte address");
  return hexToBytes(address.toLowerCase());
}

export function bytes32(hex: string): Uint8Array {
  if (!isBytes32(hex)) throw new Error("expected bytes32");
  return hexToBytes(hex.toLowerCase());
}

export function u256Bytes(value: bigint): Uint8Array {
  if (value < 0n || value >= 2n ** 256n) throw new Error("uint256 out of range");
  return hexToBytes(value.toString(16).padStart(64, "0"));
}

export function shortHex(hex: string, lead = 6, tail = 4): string {
  if (hex.length <= lead + tail + 2) return hex;
  return `${hex.slice(0, 2 + lead)}…${hex.slice(-tail)}`;
}

export function cmpHex(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
