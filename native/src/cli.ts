import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { fingerprintText, isAddress, manifestHash, type Manifest } from "@provenant/core";
import { connect, describeTx, signer, ss58Prefix, submit } from "./chain.js";
import {
  findPallet,
  identityCall,
  itemIdFromFingerprint,
  manifestCall,
  mapAccount,
  mintBatch,
  palletNames,
  readNextCollectionId,
  vestCall,
} from "./calls.js";
import { say } from "./log.js";

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    title: { type: "string" },
    text: { type: "string" },
    "text-file": { type: "string" },
    "author-name": { type: "string" },
    owner: { type: "string" },
    evm: { type: "string" },
    "royalty-bps": { type: "string", default: "500" },
    collection: { type: "string" },
    display: { type: "string" },
    file: { type: "string" },
    mode: { type: "string", default: "store" },
    dest: { type: "string" },
    locked: { type: "string" },
    blocks: { type: "string", default: "10000" },
    submit: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

function help(): void {
  say(`provenant-native <mint|identity|manifest|vest|map|pallets>

  mint        --title --text-file --author-name --owner 5... [--evm 0x] [--royalty-bps 500] [--collection id] [--submit]
  identity    --display "Name" [--submit]
  manifest    --file manifest.json [--mode store|preimage|remark] [--submit]
  vest        --dest 5... --locked <planck> [--blocks 10000] [--submit]
  map         --evm 0x...
  pallets

SURI is read from the environment when --submit is set. It is never a flag.
Without --submit the command encodes against the live runtime and prints the call.`);
}

async function main(): Promise<void> {
  const command = positionals[0];
  if (!command || values.help) {
    help();
    return;
  }
  const api = await connect();
  say(`connected ${api.runtimeChain.toString()} spec ${api.runtimeVersion.specName.toString()} v${api.runtimeVersion.specVersion.toString()} ss58 ${ss58Prefix(api)}`);
  const pair = values.submit ? await signer() : null;
  if (values.submit && !pair) throw new Error("SURI is not set; refusing to submit");

  if (command === "pallets") {
    for (const name of palletNames(api)) say(name);
    return;
  }

  if (command === "map") {
    if (!values.evm || !isAddress(values.evm)) throw new Error("--evm must be a 0x address");
    const mapped = await mapAccount(api, values.evm);
    say(JSON.stringify({ evm: values.evm, native: mapped }, null, 2));
    return;
  }

  if (command === "mint") {
    const text = values["text-file"] ? readFileSync(values["text-file"], "utf8") : values.text;
    if (!text || !values.title || !values["author-name"] || !values.owner) {
      throw new Error("mint needs --title --author-name --owner and --text or --text-file");
    }
    const finger = fingerprintText(text);
    const creating = !values.collection;
    const collectionId = values.collection ? Number(values.collection) : await readNextCollectionId(api);
    const built = mintBatch(api, {
      admin: pair?.address || values.owner,
      owner: values.owner,
      itemId: itemIdFromFingerprint(finger.fingerprint),
      collectionId,
      createCollection: creating,
      title: values.title,
      authorName: values["author-name"],
      fingerprint: finger.fingerprint,
      royaltyBps: Number(values["royalty-bps"]),
      chunkCount: finger.chunks.length,
    });
    const described = await describeTx(api, built.tx as never);
    say(JSON.stringify({
      fingerprint: finger.fingerprint,
      chunks: finger.chunks.length,
      collectionId,
      calls: built.calls,
      partialFee: described.partialFee,
      callHex: described.callHex,
      submitted: Boolean(pair),
    }, null, 2));
    if (pair) {
      const result = await submit(api, built.tx as never, pair, "nfts.mintWork");
      say(JSON.stringify({ ...result, explorer: `https://node-console.portaldot.dev/#/explorer/query/${result.hash}` }, null, 2));
    }
    return;
  }

  if (command === "identity") {
    if (!values.display) throw new Error("identity needs --display");
    const tx = identityCall(api, values.display);
    const described = await describeTx(api, tx as never);
    say(JSON.stringify({ display: values.display, selfDeclared: true, registrar: "none on testnet", partialFee: described.partialFee, callHex: described.callHex }, null, 2));
    if (pair) say(JSON.stringify(await submit(api, tx as never, pair, "identity.setIdentity"), null, 2));
    return;
  }

  if (command === "manifest") {
    if (!values.file) throw new Error("manifest needs --file");
    const mode = values.mode === "preimage" || values.mode === "remark" ? values.mode : "store";
    const json = readFileSync(values.file, "utf8");
    const parsed = JSON.parse(json) as Manifest;
    const built = manifestCall(api, json, mode);
    const described = await describeTx(api, built.tx as never);
    say(JSON.stringify({
      mode: built.mode,
      bytes: built.bytes,
      manifestHash: manifestHash(parsed),
      root: parsed.root,
      partialFee: described.partialFee,
      callHex: described.callHex,
    }, null, 2));
    if (pair) say(JSON.stringify(await submit(api, built.tx as never, pair, built.mode), null, 2));
    return;
  }

  if (command === "vest") {
    if (!values.dest || !values.locked) throw new Error("vest needs --dest and --locked (planck)");
    const header = await api.rpc.chain.getHeader();
    const start = header.number.toNumber() + 1;
    const tx = vestCall(api, values.dest, BigInt(values.locked), BigInt(values.blocks || "10000"), BigInt(start));
    const described = await describeTx(api, tx as never);
    say(JSON.stringify({ dest: values.dest, locked: values.locked, blocks: values.blocks, startingBlock: start, partialFee: described.partialFee, callHex: described.callHex }, null, 2));
    if (pair) say(JSON.stringify(await submit(api, tx as never, pair, "vesting.vestedTransfer"), null, 2));
    return;
  }

  if (!findPallet(api, [command])) {
    throw new Error(`unknown command ${command}`);
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 50);
  });
