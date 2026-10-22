import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const rpc = "http://127.0.0.1:8545";

async function ready() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      if (response.ok) return;
    } catch {
      // node still booting
    }
    await delay(500);
  }
  throw new Error("local hardhat node did not start");
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, LOCAL_EVM_RPC: rpc } });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} exited ${code}`))));
  });
}

const node = spawn("npx", ["hardhat", "node"], {
  cwd: "contracts",
  stdio: "inherit",
});

try {
  await ready();
  await run("npx", ["tsx", "contracts/scripts/e2e.ts"]);
  await run("npx", ["tsx", "verify/verify.ts", "--local", "--offline"]);
  process.stdout.write("local end-to-end finished\n");
} finally {
  node.kill("SIGTERM");
}
