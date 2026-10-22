import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { EVM_RPC } from "@provenant/core";
import { deployProvenant, evidenceDir, isLocal } from "./evm.js";

const rpc = process.env.DEPLOY_RPC || process.env.PORTALDOT_EVM_RPC || EVM_RPC;

async function main(): Promise<void> {
  if (!isLocal(rpc) && !process.env.PRIVATE_KEY) {
    throw new Error("Set PRIVATE_KEY and fund the mapped native account before deploying to Portaldot.");
  }
  const deployed = await deployProvenant(rpc);
  const record = {
    deployedAt: new Date().toISOString(),
    rpc,
    chainId: isLocal(rpc) ? 31337 : 420420777,
    local: isLocal(rpc),
    ...deployed,
    estimatedDepositTpot: {
      at_0_06_per_byte: Number((deployed.bytes * 0.06).toFixed(2)),
      at_0_095_per_byte: Number((deployed.bytes * 0.095).toFixed(2)),
    },
    note: "Save this file immediately. pallet-revive's eth RPC prunes old receipts.",
  };
  const name = isLocal(rpc) ? "local-deploy.json" : "testnet.json";
  writeFileSync(join(evidenceDir(), name), `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
