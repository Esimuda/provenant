import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ethers } from "ethers";
import { manifestHash, proofFor, sampleMarket } from "@provenant/core";
import { artifact, deployProvenant, evidenceDir, isLocal, providerFor, remember, walletFor } from "./evm.js";

const rpc = process.env.LOCAL_EVM_RPC || "http://127.0.0.1:8545";

async function main(): Promise<void> {
  if (!isLocal(rpc)) throw new Error("e2e.ts only runs against a local node");
  const deployed = await deployProvenant(rpc);
  const { abi } = artifact();
  const lab = walletFor(rpc, "lab");
  const author = walletFor(rpc, "author");
  const nonceOf = (wallet: ethers.Wallet) => wallet.provider!.getTransactionCount(wallet.address, "latest");
  const contract = new ethers.Contract(deployed.address, abi, lab);
  const market = sampleMarket();
  const hash = manifestHash({
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
  });
  const register = await contract.registerDataset(market.root, hash, { value: market.deposit, nonce: await nonceOf(lab) });
  remember({ kind: "registerDataset", hash: register.hash });
  const registerReceipt = await register.wait();
  const settle = process.env.E2E_CLAIM !== "0";
  const authorContract = contract.connect(author) as typeof contract;
  const claims: { title: string; hash: string; royalty: string }[] = [];
  let heldOutReverted = false;
  if (settle) {
    let authorNonce = await nonceOf(author);
    for (const work of market.trained) {
      const proof = proofFor(market, work.fingerprint);
      if (!proof) throw new Error(`missing proof for ${work.title}`);
      const tx = await authorContract.claim(1, work.fingerprint, proof.royalty, proof.proof, { nonce: authorNonce });
      authorNonce += 1;
      remember({ kind: "claim", hash: tx.hash, title: work.title });
      await tx.wait();
      claims.push({ title: work.title, hash: tx.hash, royalty: proof.royalty.toString() });
    }
    try {
      await authorContract.claim.staticCall(1, market.heldOut.fingerprint, market.royaltyEach, []);
    } catch {
      heldOutReverted = true;
    }
    if (!heldOutReverted) throw new Error("held-out chapter was accepted");
  }
  const stored = await contract.dataset(1);
  const authorBalance = await providerFor(rpc).getBalance(author.address);
  const record = {
    ranAt: new Date().toISOString(),
    rpc,
    chainId: 31337,
    localStandIn: true,
    note: "Hardhat stand-in for pallet-revive. BLOCK opcodes are not rejected here; Provenant does not use them. Not a Portaldot deployment.",
    contract: deployed.address,
    deployTx: deployed.hash,
    bytecodeBytes: deployed.bytes,
    registerTx: registerReceipt?.hash,
    datasetId: "1",
    root: market.root,
    manifestHash: hash,
    deposit: market.deposit.toString(),
    claimed: stored.claimed.toString(),
    expectedClaimed: (market.royaltyEach * 2n).toString(),
    claims,
    heldOutReverted,
    author: author.address,
    lab: lab.address,
    authorBalance: authorBalance.toString(),
  };
  const expected = settle ? market.royaltyEach * 2n : 0n;
  if (stored.claimed !== expected) {
    throw new Error(`claimed ${stored.claimed} != ${expected}`);
  }
  record.expectedClaimed = expected.toString();
  record.heldOutReverted = heldOutReverted;
  const evidenceName = settle ? "local-e2e.json" : "local-seed.json";
  writeFileSync(join(evidenceDir(), evidenceName), `${JSON.stringify(record, null, 2)}\n`);
  const envLocal = [
    "NEXT_PUBLIC_EVM_RPC=http://127.0.0.1:8545",
    `NEXT_PUBLIC_PROVENANT_ADDRESS=${deployed.address}`,
    "LOCAL_EVM_RPC=http://127.0.0.1:8545",
    `PROVENANT_ADDRESS=${deployed.address}`,
    "",
  ].join("\n");
  writeFileSync(join(rootFromHere(), "web", ".env.local"), envLocal);
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

function rootFromHere(): string {
  return join(fileUrl());
}

function fileUrl(): string {
  return join(evidenceDir(), "..");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
