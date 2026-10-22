import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import type { KeyringPair } from "@polkadot/keyring/types";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { SUBSTRATE_RPC } from "@provenant/core";
import { rememberHash } from "./log.js";

export function substrateUrl(): string {
  return process.env.PORTALDOT_SUBSTRATE_RPC || SUBSTRATE_RPC;
}

let cached: ApiPromise | null = null;

export async function connect(): Promise<ApiPromise> {
  if (cached?.isConnected) return cached;
  const provider = new WsProvider(substrateUrl(), 2_000);
  const api = await Promise.race([
    ApiPromise.create({ provider, noInitWarn: true }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`timed out connecting to ${substrateUrl()}`)), 25_000);
    }),
  ]);
  await api.isReady;
  cached = api;
  return api;
}

export async function signer(): Promise<KeyringPair | null> {
  const suri = process.env.SURI?.trim();
  if (!suri) return null;
  await cryptoWaitReady();
  const api = await connect();
  const prefix = ss58Prefix(api);
  const keyring = new Keyring({ type: "sr25519", ss58Format: prefix });
  return keyring.addFromUri(suri);
}

export function ss58Prefix(api: ApiPromise): number {
  const fromChain = api.registry.chainSS58;
  return typeof fromChain === "number" ? fromChain : 42;
}

export async function dryAddress(api: ApiPromise): Promise<string> {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: "sr25519", ss58Format: ss58Prefix(api) });
  return keyring.addFromUri("//provenant-dry-run").address;
}

type Tx = {
  hash: { toHex: () => string };
  method: { toHex: () => string };
  paymentInfo: (address: string) => Promise<{ partialFee: { toString: () => string }; weight: { toString: () => string } }>;
  signAndSend: (
    pair: KeyringPair,
    callback: (result: {
      status: { isInBlock: boolean; isFinalized: boolean; asInBlock?: { toHex: () => string } };
      dispatchError?: { isModule?: boolean; toString: () => string };
      events: { event: { section: string; method: string; data: { toString: () => string } } }[];
    }) => void,
  ) => Promise<() => void>;
};

export async function describeTx(api: ApiPromise, tx: Tx): Promise<{ callHex: string; partialFee: string }> {
  const callHex = tx.method.toHex();
  let partialFee = "unavailable";
  try {
    const info = await tx.paymentInfo(await dryAddress(api));
    partialFee = info.partialFee.toString();
  } catch (error) {
    partialFee = error instanceof Error ? error.message : String(error);
  }
  return { callHex, partialFee };
}

/**
 * Submit and write the hash before inclusion. Returns once the extrinsic is in a block.
 * Dispatch errors reject after the hash has already been saved.
 */
export async function submit(api: ApiPromise, tx: Tx, pair: KeyringPair, label: string): Promise<{ hash: string; block: string; events: string[] }> {
  const preview = await describeTx(api, tx);
  rememberHash({ kind: "prepared", label, callHex: preview.callHex, signer: pair.address });
  return new Promise((resolve, reject) => {
    let saved = false;
    tx.signAndSend(pair, (result) => {
      const hash = tx.hash.toHex();
      if (!saved) {
        saved = true;
        rememberHash({ kind: "signed", label, hash, signer: pair.address });
      }
      if (!result.status.isInBlock && !result.status.isFinalized) return;
      const block = result.status.asInBlock?.toHex?.() ?? "";
      const events = result.events.map((record) => `${record.event.section}.${record.event.method}`);
      if (result.dispatchError) {
        let message = result.dispatchError.toString();
        const error = result.dispatchError as { isModule?: boolean; asModule?: unknown };
        if (error.isModule && error.asModule) {
          try {
            const decoded = api.registry.findMetaError(error.asModule as never);
            message = `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`;
          } catch {
            // keep the raw message
          }
        }
        rememberHash({ kind: "failed", label, hash, block, message, events });
        reject(new Error(message));
        return;
      }
      rememberHash({ kind: "inBlock", label, hash, block, events });
      resolve({ hash, block, events });
    }).catch((error: unknown) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}
