import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, decodeEventLog, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { NextResponse } from "next/server";
import { provenantAbi } from "@/lib/abi";

/** Public Hardhat keys. This route refuses any RPC that is not loopback. */
const KEYS = {
  author: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  lab: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
} as const;

function localRpc(): string | null {
  const rpc = process.env.LOCAL_EVM_RPC;
  if (!rpc) return null;
  try {
    const host = new URL(rpc).hostname;
    if (host === "127.0.0.1" || host === "localhost") return rpc;
  } catch {
    return null;
  }
  return null;
}

function remember(entry: Record<string, unknown>) {
  try {
    const dir = join(process.cwd(), "..", "evidence");
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "submitted-hashes.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
  } catch {
    // a read-only deploy still returns the hash to the caller
  }
}

export async function POST(request: Request) {
  const rpc = localRpc();
  if (!rpc) {
    return NextResponse.json(
      { error: "The demo signer only broadcasts to a local node. On Portaldot, confirm the transaction in MetaMask." },
      { status: 403 },
    );
  }
  const address = process.env.PROVENANT_ADDRESS || process.env.NEXT_PUBLIC_PROVENANT_ADDRESS;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "PROVENANT_ADDRESS is not set for the local node." }, { status: 400 });
  }
  const body = (await request.json()) as {
    action?: string;
    root?: Hex;
    manifestHash?: Hex;
    value?: string;
    datasetId?: string;
    fingerprint?: Hex;
    royalty?: string;
    proof?: Hex[];
  };
  const contract = address as Hex;
  const publicClient = createPublicClient({ chain: hardhat, transport: http(rpc) });
  const which = body.action === "claim" ? "author" : "lab";
  const account = privateKeyToAccount(KEYS[which]);
  const wallet = createWalletClient({ account, chain: hardhat, transport: http(rpc) });

  try {
    if (body.action === "register") {
      if (!body.root || !body.manifestHash || !body.value) {
        return NextResponse.json({ error: "root, manifestHash, and value are required" }, { status: 400 });
      }
      const hash = await wallet.writeContract({
        address: contract,
        abi: provenantAbi,
        functionName: "registerDataset",
        args: [body.root, body.manifestHash],
        value: BigInt(body.value),
        chain: hardhat,
        account,
      });
      remember({ kind: "registerDataset", hash, rpc });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      let datasetId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: provenantAbi, data: log.data, topics: log.topics });
          if (decoded.eventName === "DatasetRegistered") datasetId = String((decoded.args as { id: bigint }).id);
        } catch {
          // ignore
        }
      }
      return NextResponse.json({ hash, datasetId, lab: account.address });
    }
    if (body.action === "claim") {
      if (!body.datasetId || !body.fingerprint || !body.royalty || !body.proof) {
        return NextResponse.json({ error: "datasetId, fingerprint, royalty, and proof are required" }, { status: 400 });
      }
      const hash = await wallet.writeContract({
        address: contract,
        abi: provenantAbi,
        functionName: "claim",
        args: [BigInt(body.datasetId), body.fingerprint, BigInt(body.royalty), body.proof],
        chain: hardhat,
        account,
      });
      remember({ kind: "claim", hash, rpc });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        return NextResponse.json({ error: "The claim transaction reverted.", hash }, { status: 400 });
      }
      const balance = await publicClient.getBalance({ address: account.address });
      return NextResponse.json({ hash, balance: balance.toString() });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "transaction failed" }, { status: 400 });
  }
}
