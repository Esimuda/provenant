import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function chainMode(): "portaldot" | "local" | "workshop" {
  const rpc = process.env.NEXT_PUBLIC_EVM_RPC || "";
  const address = process.env.NEXT_PUBLIC_PROVENANT_ADDRESS || "";
  if (!address) return "workshop";
  if (rpc.includes("portaldot.dev")) return "portaldot";
  if (rpc.includes("127.0.0.1") || rpc.includes("localhost")) return "local";
  return "workshop";
}

export function contractAddress(): `0x${string}` | null {
  const value = process.env.NEXT_PUBLIC_PROVENANT_ADDRESS;
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? (value as `0x${string}`) : null;
}

export function evmRpc(): string | null {
  return process.env.NEXT_PUBLIC_EVM_RPC || null;
}
