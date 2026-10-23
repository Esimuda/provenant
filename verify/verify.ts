import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ethers } from "ethers";
import {
  DEMO_AUTHOR,
  EVM_RPC,
  PLANCK_WEI,
  PORTALDOT_CHAIN_ID,
  leaf,
  proofFor,
  sampleMarket,
  scanBytecode,
} from "@provenant/core";

const root = join(import.meta.dirname, "..");
const offline = process.argv.includes("--offline");
const local = process.argv.includes("--local");
const rpcFlag = process.argv.find((arg) => arg.startsWith("--rpc="));

type Status = "pass" | "fail" | "skip";
const results: { name: string; status: Status; detail: string }[] = [];

function pass(name: string, detail = "ok") {
  results.push({ name, status: "pass", detail });
}
function fail(name: string, detail: string) {
  results.push({ name, status: "fail", detail });
}
function skip(name: string, detail: string) {
  results.push({ name, status: "skip", detail });
}

function artifact(name: string) {
  return JSON.parse(readFileSync(join(root, "contracts", "artifacts", "contracts", name), "utf8")) as { deployedBytecode: string };
}

async function rpc(url: string, method: string, params: unknown[] = []) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await response.json()) as { result?: unknown; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

async function main() {
  const readme = existsSync(join(root, "README.md")) ? readFileSync(join(root, "README.md"), "utf8") : "";
  if (readme.includes("Turn the AI copyright war into a market.")) pass("readme one-liner");
  else fail("readme one-liner", "README.md is missing the one-liner");

  if (
    readme.includes("```mermaid") &&
    readme.includes("docs/architecture.png") &&
    existsSync(join(root, "docs", "architecture.svg")) &&
    existsSync(join(root, "docs", "architecture.png"))
  ) pass("architecture diagram");
  else fail("architecture diagram", "need a mermaid block plus docs/architecture.svg and docs/architecture.png");

  const source = readFileSync(join(root, "contracts", "contracts", "Provenant.sol"), "utf8");
  if (/block\.(timestamp|chainid|number|coinbase|prevrandao|basefee)/.test(source)) {
    fail("provenant source opcodes", "source references a BLOCK opcode");
  } else pass("provenant source opcodes");

  const proven = artifact("Provenant.sol/Provenant.json");
  const probe = artifact("OpcodeProbe.sol/OpcodeProbe.json");
  const provenHits = scanBytecode(proven.deployedBytecode);
  const probeHits = scanBytecode(probe.deployedBytecode);
  if (provenHits.block.length === 0 && provenHits.create.length === 0) pass("provenant bytecode opcodes");
  else fail("provenant bytecode opcodes", JSON.stringify({ ...provenHits }));
  const probeNames = probeHits.block.map((hit) => hit.name);
  if (probeNames.includes("TIMESTAMP") && probeNames.includes("CHAINID")) pass("opcode scanner");
  else fail("opcode scanner", probeNames.join(",") || "probe contract did not scan");
  const bytes = (proven.deployedBytecode.length - 2) / 2;
  if (bytes > 0 && bytes < 8192) pass("bytecode size", `${bytes} bytes`);
  else fail("bytecode size", `${bytes} bytes`);

  const market = sampleMarket();
  const austen = proofFor(market, market.trained[0].fingerprint);
  if (austen && market.deposit % PLANCK_WEI === 0n && market.royaltyEach % PLANCK_WEI === 0n) pass("sample proof");
  else fail("sample proof", "sample market proof failed");
  if (proofFor(market, market.heldOut.fingerprint) === null) pass("held-out chapter");
  else fail("held-out chapter", "Frankenstein was inside the sample manifest");
  const packed = ethers.solidityPackedKeccak256(
    ["bytes32", "address", "uint256"],
    [market.trained[0].fingerprint, DEMO_AUTHOR, market.royaltyEach],
  );
  if (leaf(market.trained[0].fingerprint, DEMO_AUTHOR, market.royaltyEach) === packed.toLowerCase()) pass("leaf encoding");
  else fail("leaf encoding", "core leaf does not match ethers abi.encodePacked");

  for (const font of ["InstrumentSerif-Regular.ttf", "InstrumentSerif-Italic.ttf", "InterTight-Variable.ttf"]) {
    if (!existsSync(join(root, "web", "public", "fonts", font))) fail(`font ${font}`, "missing");
  }
  if (results.filter((item) => item.name.startsWith("font") && item.status === "fail").length === 0) {
    pass("local fonts");
  }
  const example = readFileSync(join(root, ".env.example"), "utf8");
  if (/PRIVATE_KEY=0x[0-9a-fA-F]{64}/.test(example) || /SURI=\/\//.test(example)) fail("no secrets in example", ".env.example contains a key");
  else pass("no secrets in example");

  if (local) {
    const evidencePath = join(root, "evidence", "local-e2e.json");
    if (!existsSync(evidencePath)) fail("local evidence", "evidence/local-e2e.json missing");
    else {
      const evidence = JSON.parse(readFileSync(evidencePath, "utf8")) as {
        rpc: string;
        contract: string;
        root: string;
        claimed: string;
        expectedClaimed: string;
        deployTx: string;
        registerTx: string;
        claims: { hash: string }[];
        heldOutReverted: boolean;
      };
      const url = rpcFlag?.slice(6) || evidence.rpc;
      try {
        const code = (await rpc(url, "eth_getCode", [evidence.contract, "latest"])) as string;
        if (code !== "0x" && code.length > 10) pass("local code", `${(code.length - 2) / 2} bytes`);
        else fail("local code", "empty code");
        const provider = new ethers.JsonRpcProvider(url);
        const contract = new ethers.Contract(
          evidence.contract,
          ["function dataset(uint256) view returns (bytes32,bytes32,address,uint256,uint256)"],
          provider,
        );
        const stored = await contract.dataset(1);
        if (String(stored[0]).toLowerCase() === evidence.root.toLowerCase()) pass("local root");
        else fail("local root", String(stored[0]));
        if (stored[4].toString() === evidence.expectedClaimed) pass("local claimed", stored[4].toString());
        else fail("local claimed", `${stored[4]} != ${evidence.expectedClaimed}`);
        const deployTx = await rpc(url, "eth_getTransactionByHash", [evidence.deployTx]);
        if (deployTx) pass("local deploy tx");
        else fail("local deploy tx", evidence.deployTx);
        const registerTx = await rpc(url, "eth_getTransactionByHash", [evidence.registerTx]);
        if (registerTx) pass("local register tx");
        else fail("local register tx", evidence.registerTx);
        let claimsOk = true;
        for (const claim of evidence.claims) {
          const tx = await rpc(url, "eth_getTransactionByHash", [claim.hash]);
          if (!tx) claimsOk = false;
        }
        if (claimsOk && evidence.claims.length === 2) pass("local claim txs", String(evidence.claims.length));
        else fail("local claim txs", `found ${evidence.claims.length}, ok=${claimsOk}`);
        if (evidence.heldOutReverted) pass("local held-out revert");
        else fail("local held-out revert", "not recorded");
      } catch (error) {
        fail("local node", error instanceof Error ? error.message : String(error));
      }
    }
  } else skip("local chain", "pass --local while the hardhat node is still running");

  if (offline) {
    skip("testnet chain id", "--offline");
  } else {
    try {
      const chainIdHex = (await rpc(process.env.PORTALDOT_EVM_RPC || EVM_RPC, "eth_chainId")) as string;
      const chainId = Number.parseInt(chainIdHex, 16);
      if (chainId === PORTALDOT_CHAIN_ID) pass("testnet chain id", String(chainId));
      else fail("testnet chain id", chainIdHex);
      const block = (await rpc(process.env.PORTALDOT_EVM_RPC || EVM_RPC, "eth_blockNumber")) as string;
      if (Number.parseInt(block, 16) > 0) pass("testnet block", block);
      else fail("testnet block", block);
    } catch (error) {
      fail("testnet rpc", error instanceof Error ? error.message : String(error));
    }
    const probePath = join(root, "evidence", "testnet-readonly.json");
    if (!existsSync(probePath)) skip("testnet pallets", "run npm run probe");
    else {
      const probeReport = JSON.parse(readFileSync(probePath, "utf8")) as {
        evmChainIdMatches?: boolean;
        pallets: Record<string, string | null>;
        encodings: Record<string, { ok: boolean; detail: string }>;
        minVestedTransfer: string | null;
        deployed: { contract: string | null };
      };
      if (probeReport.evmChainIdMatches) pass("probe chain id");
      else fail("probe chain id", "evidence/testnet-readonly.json disagrees");
      for (const name of ["Nfts", "Identity", "Vesting", "Utility", "Revive", "TransactionStorage"]) {
        if (probeReport.pallets[name]) pass(`pallet ${name}`, String(probeReport.pallets[name]));
        else fail(`pallet ${name}`, "missing");
      }
      const failed = Object.entries(probeReport.encodings).filter(([, value]) => !value.ok);
      if (failed.length === 0) pass("native call encoding", Object.keys(probeReport.encodings).join(", "));
      else fail("native call encoding", failed.map(([name, value]) => `${name}: ${value.detail}`).join(" | "));
      if (probeReport.minVestedTransfer === "1000000000000000") pass("min vested transfer", "10 tPOT");
      else fail("min vested transfer", String(probeReport.minVestedTransfer));
      if (!probeReport.deployed.contract) skip("testnet contract", "not deployed; tPOT required");
      else pass("testnet contract", probeReport.deployed.contract);
    }
    const livePath = join(root, "evidence", "testnet.json");
    const e2ePath = join(root, "evidence", "testnet-e2e.json");
    if (existsSync(livePath)) {
      const live = JSON.parse(readFileSync(livePath, "utf8")) as {
        address: string;
        hash: string;
        registerTx?: string;
        claims?: { hash: string; title: string }[];
        heldOutReverted?: boolean;
        liveDataset?: { claimed: string };
      };
      try {
        const url = process.env.PORTALDOT_EVM_RPC || EVM_RPC;
        const code = (await rpc(url, "eth_getCode", [live.address, "latest"])) as string;
        if (code !== "0x" && code.length > 10) pass("live code", `${(code.length - 2) / 2} bytes at ${live.address}`);
        else fail("live code", "empty");
        const deployTx = await rpc(url, "eth_getTransactionByHash", [live.hash]);
        if (deployTx) pass("live deploy tx");
        else fail("live deploy tx", live.hash);
        if (live.registerTx) {
          const reg = await rpc(url, "eth_getTransactionByHash", [live.registerTx]);
          if (reg) pass("live register tx");
          else fail("live register tx", live.registerTx);
        }
        if (live.claims?.length) {
          let ok = true;
          for (const claim of live.claims) {
            const tx = await rpc(url, "eth_getTransactionByHash", [claim.hash]);
            if (!tx) ok = false;
          }
          if (ok) pass("live claim txs", String(live.claims.length));
          else fail("live claim txs", "missing hash");
        }
        if (existsSync(e2ePath)) {
          const e2e = JSON.parse(readFileSync(e2ePath, "utf8")) as { heldOutReverted: boolean; expectedClaimed: string };
          const provider = new ethers.JsonRpcProvider(url);
          const contract = new ethers.Contract(
            live.address,
            ["function dataset(uint256) view returns (bytes32,bytes32,address,uint256,uint256)"],
            provider,
          );
          const stored = await contract.dataset(1);
          if (stored[4].toString() === e2e.expectedClaimed) pass("live claimed", stored[4].toString());
          else fail("live claimed", `${stored[4]} != ${e2e.expectedClaimed}`);
          if (e2e.heldOutReverted) pass("live held-out revert");
          else fail("live held-out revert", "not recorded");
        }
      } catch (error) {
        fail("live testnet", error instanceof Error ? error.message : String(error));
      }
    } else {
      skip("live testnet", "evidence/testnet.json missing");
    }
  }

  const ran = results.filter((item) => item.status !== "skip");
  const passed = ran.filter((item) => item.status === "pass").length;
  for (const item of results) {
    const label = item.status === "pass" ? "PASS" : item.status === "fail" ? "FAIL" : "SKIP";
    process.stdout.write(`${label}  ${item.name}${item.detail && item.detail !== "ok" ? ` — ${item.detail}` : ""}\n`);
  }
  process.stdout.write(`\n${passed}/${ran.length} checks passed\n`);
  if (results.some((item) => item.status === "skip")) {
    process.stdout.write(`${results.filter((item) => item.status === "skip").length} skipped\n`);
  }
  if (passed !== ran.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
