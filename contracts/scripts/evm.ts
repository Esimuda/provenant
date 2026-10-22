import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

/** Public Hardhat development key. Refused against any non-local RPC. */
export const LOCAL_KEYS = {
  author: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  lab: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
} as const;

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

export function artifact() {
  const path = join(root, "contracts", "artifacts", "contracts", "Provenant.sol", "Provenant.json");
  return JSON.parse(readFileSync(path, "utf8")) as {
    abi: ethers.InterfaceAbi;
    bytecode: string;
    deployedBytecode: string;
  };
}

export function evidenceDir(): string {
  const dir = join(root, "evidence");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function remember(entry: Record<string, unknown>): void {
  appendFileSync(join(evidenceDir(), "submitted-hashes.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

export function isLocal(url: string): boolean {
  return /127\.0\.0\.1|localhost/.test(url);
}

export function providerFor(url: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(url);
}

export function walletFor(url: string, which: "deployer" | "author" | "lab" = "deployer"): ethers.Wallet {
  const local = isLocal(url);
  const fromEnv = process.env.PRIVATE_KEY?.trim();
  const key = fromEnv
    ? fromEnv.startsWith("0x") ? fromEnv : `0x${fromEnv}`
    : local
      ? which === "lab"
        ? LOCAL_KEYS.lab
        : LOCAL_KEYS.author
      : "";
  if (!key) throw new Error("PRIVATE_KEY is not set. Put it in the environment, not in the repo.");
  if (!local && key.toLowerCase() === LOCAL_KEYS.author.toLowerCase()) {
    throw new Error("Refusing the public Hardhat key against a non-local RPC.");
  }
  return new ethers.Wallet(key, providerFor(url));
}

export async function deployProvenant(url: string): Promise<{ address: string; hash: string; bytes: number }> {
  const { abi, bytecode, deployedBytecode } = artifact();
  const wallet = walletFor(url, "deployer");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  const pending = contract.deploymentTransaction();
  if (!pending) throw new Error("deployment transaction missing");
  remember({ kind: "deploy", hash: pending.hash, from: wallet.address, rpc: url });
  const receipt = await pending.wait();
  const address = await contract.getAddress();
  return {
    address,
    hash: receipt?.hash || pending.hash,
    bytes: (deployedBytecode.length - 2) / 2,
  };
}
