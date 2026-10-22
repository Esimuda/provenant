import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { EVM_RPC, PORTALDOT_CHAIN_ID, sampleMarket } from "@provenant/core";
import { connect, describeTx, ss58Prefix } from "./chain.js";
import { repoRoot } from "./log.js";
import {
  findPallet,
  identityCall,
  identityInfo,
  itemIdFromFingerprint,
  manifestCall,
  minVested,
  mintBatch,
  palletNames,
  readNextCollectionId,
  vestCall,
} from "./calls.js";
import { canonicalManifest, manifestHash, type Manifest } from "@provenant/core";

async function evmChainId(): Promise<{ chainId: number | null; block: string | null; error?: string }> {
  try {
    const response = await fetch(process.env.PORTALDOT_EVM_RPC || EVM_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    const body = (await response.json()) as { result?: string };
    const chainId = body.result ? Number.parseInt(body.result, 16) : null;
    const blockResponse = await fetch(process.env.PORTALDOT_EVM_RPC || EVM_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] }),
    });
    const blockBody = (await blockResponse.json()) as { result?: string };
    return { chainId, block: blockBody.result ?? null };
  } catch (error) {
    return { chainId: null, block: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main(): Promise<void> {
  const api = await connect();
  const wanted = ["Nfts", "Identity", "Vesting", "Utility", "Revive", "TransactionStorage", "Preimage", "System", "Balances", "Contracts"];
  const present = Object.fromEntries(wanted.map((name) => [name, findPallet(api, [name])]));
  const market = sampleMarket();
  const manifest: Manifest = {
    version: 1,
    licence: market.licence,
    model: market.model,
    lab: market.lab,
    root: market.root,
    works: market.trained.map((work) => ({
      id: work.id,
      title: work.title,
      fingerprint: work.fingerprint,
      author: work.author,
      royalty: work.royalty.toString(),
      chunkCount: work.chunkCount,
    })),
  };
  const encodings: Record<string, { ok: boolean; detail: string }> = {};

  async function tryEncode(label: string, build: () => Promise<{ hex: string; fee: string }>): Promise<void> {
    try {
      const built = await build();
      encodings[label] = { ok: true, detail: `${built.hex.length / 2 - 1} bytes, fee ${built.fee}` };
    } catch (error) {
      encodings[label] = { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  const admin = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
  await tryEncode("nfts.batchAll mint", async () => {
    const next = await readNextCollectionId(api);
    const built = mintBatch(api, {
      admin,
      owner: admin,
      itemId: itemIdFromFingerprint(market.trained[0].fingerprint),
      collectionId: next,
      createCollection: true,
      title: market.trained[0].title,
      authorName: market.trained[0].authorName,
      fingerprint: market.trained[0].fingerprint,
      royaltyBps: 500,
      chunkCount: market.trained[0].chunkCount,
    });
    const described = await describeTx(api, built.tx as never);
    return { hex: described.callHex, fee: `${described.partialFee} (next collection ${next})` };
  });
  await tryEncode("identity.setIdentity", async () => {
    const tx = identityCall(api, "Ada Lovelace");
    const described = await describeTx(api, tx as never);
    return { hex: described.callHex, fee: described.partialFee };
  });
  await tryEncode("transactionStorage.store", async () => {
    const built = manifestCall(api, canonicalManifest(manifest), "store");
    const described = await describeTx(api, built.tx as never);
    return { hex: described.callHex, fee: described.partialFee };
  });
  await tryEncode("vesting.vestedTransfer", async () => {
    const header = await api.rpc.chain.getHeader();
    const tx = vestCall(api, admin, 1_000_000_000_000_000n, 10_000n, BigInt(header.number.toNumber() + 1));
    const described = await describeTx(api, tx as never);
    return { hex: described.callHex, fee: described.partialFee };
  });

  let registrars: unknown = null;
  try {
    const query = api.query as unknown as { identity?: { registrars?: () => Promise<{ toJSON: () => unknown }> } };
    registrars = query.identity?.registrars ? (await query.identity.registrars()).toJSON() : "missing";
  } catch (error) {
    registrars = error instanceof Error ? error.message : String(error);
  }

  const evm = await evmChainId();
  const report = {
    probedAt: new Date().toISOString(),
    chain: api.runtimeChain.toString(),
    specName: api.runtimeVersion.specName.toString(),
    specVersion: api.runtimeVersion.specVersion.toString(),
    ss58: ss58Prefix(api),
    tokenDecimals: api.registry.chainDecimals,
    tokenSymbol: api.registry.chainTokens,
    block: (await api.rpc.chain.getHeader()).number.toNumber(),
    pallets: present,
    palletCount: palletNames(api).length,
    minVestedTransfer: minVested(api)?.toString() ?? null,
    nftDeposits: Object.fromEntries(
      ["collectionDeposit", "itemDeposit", "metadataDepositBase", "attributeDepositBase"].map((name) => {
        const consts = api.consts as unknown as { nfts?: Record<string, { toString: () => string }> };
        return [name, consts.nfts?.[name]?.toString() ?? null];
      }),
    ),
    registrars,
    identityShape: Object.keys(identityInfo(api, "Ada Lovelace")),
    encodings,
    evm,
    evmChainIdMatches: evm.chainId === PORTALDOT_CHAIN_ID,
    manifestHash: manifestHash(manifest),
    note: "Read-only. No extrinsic was submitted. Deployed contract fields stay empty until tPOT is available.",
    deployed: {
      contract: null,
      deployTx: null,
      nftTx: null,
      manifestTx: null,
    },
  };

  const dir = join(repoRoot, "evidence");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "testnet-readonly.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  const failed = Object.entries(encodings).filter(([, value]) => !value.ok);
  if (failed.length) process.exitCode = 2;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
}).finally(() => {
  setTimeout(() => process.exit(process.exitCode ?? 0), 100);
});
