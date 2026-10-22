import type { ApiPromise } from "@polkadot/api";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import {
  MANIFEST_MAX_BYTES,
  workAttributes,
  type Address,
  type Hex,
} from "@provenant/core";
import { vestingSchedule } from "@provenant/core";
import { itemIdFromFingerprint } from "./ids.js";

export { itemIdFromFingerprint };

type AnyTx = ReturnType<ApiPromise["tx"]["system"]["remark"]>;
type Section = Record<string, (...args: never[]) => AnyTx>;

export function palletNames(api: ApiPromise): string[] {
  return api.runtimeMetadata.asLatest.pallets.map((pallet) => pallet.name.toString());
}

export function sectionName(pallet: string): string {
  return pallet[0].toLowerCase() + pallet.slice(1);
}

export function findPallet(api: ApiPromise, candidates: string[]): string | null {
  const names = palletNames(api);
  return names.find((name) => candidates.some((candidate) => candidate.toLowerCase() === name.toLowerCase())) ?? null;
}

export function txSection(api: ApiPromise, pallet: string): Section {
  const key = sectionName(pallet);
  const section = (api.tx as unknown as Record<string, Section>)[key];
  if (!section) throw new Error(`runtime has no tx.${key}`);
  return section;
}

/**
 * Fill identity from the chain's own type.
 * Display is Raw, capped at 32 bytes. Other fields are None.
 * Testnet registrars() is empty, so this stays self-declared.
 */
export function identityInfo(api: ApiPromise, display: string): Record<string, unknown> {
  const clipped = [...display].slice(0, 32).join("").trim();
  if (!clipped) throw new Error("display name is empty");
  const typeName = String(api.tx.identity.setIdentity.meta.args[0].type);
  const blank = api.registry.createType(typeName as never);
  const fields = Object.keys((blank.toHuman() as Record<string, unknown>) || {});
  const info: Record<string, unknown> = {};
  for (const field of fields) {
    if (field === "display") info.display = { raw: clipped };
    else if (field === "additional") info.additional = [];
    else if (/pgp/i.test(field)) info[field] = null;
    else info[field] = { none: null };
  }
  return info;
}

function bytesOf(value: string): string {
  return u8aToHex(stringToU8a(value));
}

export type MintInput = {
  admin: string;
  owner: string;
  itemId: number;
  collectionId: number;
  createCollection: boolean;
  title: string;
  authorName: string;
  fingerprint: Hex;
  royaltyBps: number;
  chunkCount: number;
};

function collectionConfig(): Record<string, unknown> {
  return {
    settings: 0,
    maxSupply: null,
    mintSettings: {
      mintType: { Issuer: null },
      price: null,
      startBlock: null,
      endBlock: null,
      defaultItemSettings: 0,
    },
  };
}

/**
 * Mint a Work NFT, write the locked licence attributes, and batch them.
 * Collection id is the queried next id when we create in the same batch.
 */
export function mintBatch(api: ApiPromise, input: MintInput): { tx: AnyTx; collectionId: number; calls: string[] } {
  const nfts = txSection(api, findPallet(api, ["Nfts"]) || "Nfts");
  const utility = txSection(api, findPallet(api, ["Utility"]) || "Utility");
  const calls: AnyTx[] = [];
  const notes: string[] = [];
  const collectionId = input.collectionId;
  if (input.createCollection) {
    calls.push(nfts.create(input.admin, collectionConfig()));
    notes.push(`nfts.create collection ${collectionId}`);
  }
  calls.push(nfts.mint(collectionId, input.itemId, input.owner, null));
  notes.push(`nfts.mint item ${input.itemId}`);
  for (const attribute of workAttributes({
    fingerprint: input.fingerprint,
    royaltyBps: input.royaltyBps,
    title: input.title,
    chunkCount: input.chunkCount,
    authorName: input.authorName,
  })) {
    calls.push(
      nfts.setAttribute(collectionId, input.itemId, { CollectionOwner: null }, bytesOf(attribute.key), bytesOf(attribute.value)),
    );
    notes.push(`nfts.setAttribute ${attribute.key}`);
  }
  calls.push(nfts.lockItemProperties(collectionId, input.itemId, true, true));
  notes.push("nfts.lockItemProperties");
  if (typeof utility.batchAll !== "function") throw new Error("utility.batchAll is not on this runtime");
  return { tx: utility.batchAll(calls), collectionId, calls: notes };
}

export async function readNextCollectionId(api: ApiPromise): Promise<number> {
  const query = api.query as unknown as {
    nfts?: { nextCollectionId?: () => Promise<{ toNumber?: () => number; toString: () => string }> };
  };
  const next = query.nfts?.nextCollectionId;
  if (!next) throw new Error("nfts.nextCollectionId is not in storage");
  const value = await next();
  return value.toNumber ? value.toNumber() : Number(value.toString());
}

export function identityCall(api: ApiPromise, display: string): AnyTx {
  const identity = txSection(api, findPallet(api, ["Identity"]) || "Identity");
  const typeName = String(api.tx.identity.setIdentity.meta.args[0].type);
  const info = api.registry.createType(typeName as never, identityInfo(api, display));
  return identity.setIdentity(info);
}

export function manifestCall(api: ApiPromise, json: string, mode: "store" | "preimage" | "remark" = "store"): { tx: AnyTx; mode: string; bytes: number } {
  const bytes = stringToU8a(json);
  if (bytes.length > MANIFEST_MAX_BYTES) {
    throw new Error(`manifest is ${bytes.length} bytes; cap is ${MANIFEST_MAX_BYTES}`);
  }
  const encoded = u8aToHex(bytes);
  if (mode === "store") {
    const name = findPallet(api, ["TransactionStorage"]);
    if (!name) throw new Error("transactionStorage is not on this runtime");
    const section = txSection(api, name);
    if (typeof section.store !== "function") throw new Error("transactionStorage.store is missing");
    return { tx: section.store(encoded), mode: "transactionStorage.store", bytes: bytes.length };
  }
  if (mode === "preimage") {
    const section = txSection(api, findPallet(api, ["Preimage"]) || "Preimage");
    return { tx: section.notePreimage(encoded), mode: "preimage.notePreimage", bytes: bytes.length };
  }
  const system = txSection(api, "System");
  return { tx: system.remarkWithEvent(encoded), mode: "system.remarkWithEvent", bytes: bytes.length };
}

export function vestCall(api: ApiPromise, dest: string, lockedPlanck: bigint, blocks: bigint, startingBlock: bigint): AnyTx {
  const schedule = vestingSchedule(lockedPlanck, blocks, startingBlock);
  const min = minVested(api);
  if (min !== null && schedule.locked < min) {
    throw new Error(`vesting minimum is ${min} planck; got ${schedule.locked}`);
  }
  const vesting = txSection(api, findPallet(api, ["Vesting"]) || "Vesting");
  return vesting.vestedTransfer(dest, {
    locked: schedule.locked.toString(),
    perBlock: schedule.perBlock.toString(),
    startingBlock: schedule.startingBlock.toString(),
  });
}

export function minVested(api: ApiPromise): bigint | null {
  const consts = api.consts as unknown as { vesting?: { minVestedTransfer?: { toString: () => string } } };
  const value = consts.vesting?.minVestedTransfer;
  return value ? BigInt(value.toString()) : null;
}

export async function mapAccount(api: ApiPromise, evm: Address): Promise<string> {
  const call = (api.call as unknown as { reviveApi?: { accountId?: (address: string) => Promise<{ toString: () => string }> } }).reviveApi;
  if (!call?.accountId) throw new Error("reviveApi.accountId is not exposed on this runtime");
  const mapped = await call.accountId(evm);
  return mapped.toString();
}

