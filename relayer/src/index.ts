import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  http,
  parseAbiItem,
  type Hex,
} from "viem";
import { EVM_RPC, PORTALDOT_CHAIN_ID, fingerprintText, isAddress, manifestHash, type Manifest } from "@provenant/core";
import {
  connect,
  describeTx,
  mapAccount,
  signer,
  submit,
  vestCall,
  manifestCall,
  identityCall,
  mintBatch,
  readNextCollectionId,
  itemIdFromFingerprint,
  repoRoot,
} from "@provenant/native";

const royalty = parseAbiItem(
  "event RoyaltyPaid(uint256 indexed datasetId, bytes32 indexed fingerprint, address indexed author, uint256 amount)",
);

const eventsFile = join(repoRoot, "evidence", "relayer-events.jsonl");
const cursorFile = join(repoRoot, "evidence", "relayer-cursor.json");

function persist(entry: Record<string, unknown>): void {
  mkdirSync(join(repoRoot, "evidence"), { recursive: true });
  appendFileSync(eventsFile, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": process.env.WEB_ORIGIN || "http://localhost:3000",
    "access-control-allow-headers": "content-type, x-provenant-token",
  });
  res.end(json);
}

function authorized(req: IncomingMessage): boolean {
  const token = process.env.RELAYER_TOKEN;
  if (!token) return true;
  return req.headers["x-provenant-token"] === token;
}

async function prepare(kind: string, body: Record<string, unknown>) {
  const api = await connect();
  if (kind === "mint") {
    const text = String(body.text || "");
    const title = String(body.title || "");
    const authorName = String(body.authorName || "");
    const owner = String(body.owner || "");
    if (!text || !title || !authorName || !owner) throw new Error("title, authorName, owner, and text are required");
    const finger = fingerprintText(text);
    const collectionId = body.collectionId ? Number(body.collectionId) : await readNextCollectionId(api);
    const built = mintBatch(api, {
      admin: owner,
      owner,
      itemId: itemIdFromFingerprint(finger.fingerprint),
      collectionId,
      createCollection: !body.collectionId,
      title,
      authorName,
      fingerprint: finger.fingerprint,
      royaltyBps: Number(body.royaltyBps || 500),
      chunkCount: finger.chunks.length,
    });
    const described = await describeTx(api, built.tx as never);
    return { mode: "prepared", fingerprint: finger.fingerprint, chunks: finger.chunks, collectionId, calls: built.calls, callHex: described.callHex, partialFee: described.partialFee, submitted: false };
  }
  if (kind === "identity") {
    const tx = identityCall(api, String(body.display || ""));
    const described = await describeTx(api, tx as never);
    return { mode: "prepared", selfDeclared: true, callHex: described.callHex, partialFee: described.partialFee, submitted: false };
  }
  if (kind === "manifest") {
    const manifest = body.manifest as Manifest;
    const json = JSON.stringify(manifest);
    const built = manifestCall(api, json, "store");
    const described = await describeTx(api, built.tx as never);
    return { mode: "prepared", manifestHash: manifestHash(manifest), bytes: built.bytes, callHex: described.callHex, partialFee: described.partialFee, submitted: false };
  }
  throw new Error(`unknown prepare kind ${kind}`);
}

async function watch(): Promise<void> {
  const address = process.env.PROVENANT_ADDRESS as Hex | undefined;
  if (!address) {
    process.stdout.write("relayer: PROVENANT_ADDRESS unset, event watch idle\n");
    return;
  }
  const rpc = process.env.PORTALDOT_EVM_RPC || process.env.LOCAL_EVM_RPC || EVM_RPC;
  const client = createPublicClient({ transport: http(rpc) });
  const chainId = await client.getChainId();
  let cursor = chainId === PORTALDOT_CHAIN_ID ? "latest" : 0;
  try {
    cursor = JSON.parse(readFileSync(cursorFile, "utf8")).block ?? cursor;
  } catch {
    // first run
  }
  const seen = new Set<string>();
  process.stdout.write(`relayer: watching ${address} on ${rpc} from ${cursor}\n`);

  const tick = async () => {
    const latest = Number(await client.getBlockNumber());
    const from = cursor === "latest" ? Math.max(0, latest - 20) : Number(cursor);
    const to = Math.min(latest, from + 2_000);
    if (to < from) return;
    const logs = await client.getLogs({ address, event: royalty, fromBlock: BigInt(from), toBlock: BigInt(to) });
    for (const log of logs) {
      const key = `${log.transactionHash}:${log.logIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const args = log.args as { datasetId?: bigint; fingerprint?: Hex; author?: Hex; amount?: bigint };
      if (!args.datasetId || !args.fingerprint || !args.author || args.amount === undefined) continue;
      const entry = {
        kind: "RoyaltyPaid",
        transactionHash: log.transactionHash,
        blockNumber: Number(log.blockNumber),
        datasetId: args.datasetId.toString(),
        fingerprint: args.fingerprint,
        author: args.author,
        amount: args.amount.toString(),
      };
      persist(entry);
      if (chainId !== PORTALDOT_CHAIN_ID) continue;
      await streamRoyalty(entry);
    }
    cursor = to + 1;
    writeFileSync(cursorFile, `${JSON.stringify({ block: cursor })}\n`);
  };

  const loop = async () => {
    try {
      await tick();
    } catch (error) {
      process.stderr.write(`relayer tick: ${error instanceof Error ? error.message : String(error)}\n`);
    }
    setTimeout(loop, 6_000);
  };
  await loop();
}

async function streamRoyalty(entry: { author: string; amount: string; transactionHash: string | null }): Promise<void> {
  const pair = await signer();
  if (!pair) {
    persist({ kind: "vest-skipped", reason: "SURI unset", transactionHash: entry.transactionHash });
    return;
  }
  if (!isAddress(entry.author)) return;
  try {
    const api = await connect();
    const dest = await mapAccount(api, entry.author);
    const locked = BigInt(process.env.VESTING_LOCKED || "1000000000000000");
    const blocks = BigInt(process.env.VESTING_BLOCKS || "10000");
    const start = (await api.rpc.chain.getHeader()).number.toNumber() + 1;
    const tx = vestCall(api, dest, locked, blocks, BigInt(start));
    const result = await submit(api, tx as never, pair, `vesting.for.${entry.transactionHash}`);
    persist({ kind: "vestedTransfer", transactionHash: entry.transactionHash, vestingHash: result.hash, dest, locked: locked.toString() });
  } catch (error) {
    persist({
      kind: "vest-failed",
      transactionHash: entry.transactionHash,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main(): Promise<void> {
  const host = process.env.RELAYER_HOST || "127.0.0.1";
  const port = Number(process.env.RELAYER_PORT || 8787);
  createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        send(res, 204, {});
        return;
      }
      if (req.url === "/health") {
        send(res, 200, { ok: true, signer: Boolean(process.env.SURI), contract: process.env.PROVENANT_ADDRESS || null });
        return;
      }
      if (!authorized(req)) {
        send(res, 401, { error: "relayer token rejected" });
        return;
      }
      const kind = req.url?.split("/").filter(Boolean)[1];
      if (req.method === "POST" && req.url?.startsWith("/prepare/") && kind) {
        const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
        send(res, 200, await prepare(kind, body));
        return;
      }
      send(res, 404, { error: "not found" });
    } catch (error) {
      send(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  }).listen(port, host, () => {
    process.stdout.write(`relayer listening on http://${host}:${port}\n`);
  });
  await watch();
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
