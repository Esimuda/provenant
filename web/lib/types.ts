import type { Address, Hex } from "@provenant/core";

export type WorkRecord = {
  id: string;
  title: string;
  authorName: string;
  evmAddress: Address;
  royaltyBps: number;
  text: string;
  fingerprint: Hex;
  chunkCount: number;
  createdAt: string;
  sample: boolean;
  txHash?: string;
  nativeCall?: string;
};

export type DatasetWork = {
  workId: string;
  title: string;
  fingerprint: Hex;
  author: Address;
  royalty: string;
  chunkCount: number;
};

export type ClaimRecord = {
  fingerprint: Hex;
  author: Address;
  amount: string;
  at: string;
  txHash?: string;
  local: boolean;
};

export type DatasetRecord = {
  localId: string;
  chainId?: string;
  model: string;
  lab: Address;
  deposit: string;
  root: Hex;
  manifestHash: Hex;
  works: DatasetWork[];
  claims: ClaimRecord[];
  txHash?: string;
  createdAt: string;
  sample: boolean;
};

export type Registry = {
  works: WorkRecord[];
  datasets: DatasetRecord[];
};
