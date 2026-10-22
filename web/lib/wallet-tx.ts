import { createPublicClient, createWalletClient, custom, decodeEventLog, defineChain, http, type Hex } from "viem";
import { provenantAbi } from "./abi";
import { contractAddress, evmRpc } from "./utils";

function chain() {
  const id = evmRpc()?.includes("portaldot.dev") ? 420420777 : 31337;
  return defineChain({
    id,
    name: id === 420420777 ? "Portaldot V3 Testnet" : "Local Hardhat",
    nativeCurrency: { name: "tPOT", symbol: id === 420420777 ? "tPOTv3" : "ETH", decimals: 18 },
    rpcUrls: { default: { http: [evmRpc() || "http://127.0.0.1:8545"] } },
  });
}

function injected() {
  const provider = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!provider) throw new Error("MetaMask is not installed.");
  return provider;
}

export async function walletRegister(root: Hex, manifest: Hex, value: bigint): Promise<{ hash: Hex; datasetId?: string }> {
  const address = contractAddress();
  if (!address) throw new Error("Set NEXT_PUBLIC_PROVENANT_ADDRESS before sending a transaction.");
  const rpc = evmRpc();
  if (!rpc) throw new Error("Set NEXT_PUBLIC_EVM_RPC.");
  const active = chain();
  const wallet = createWalletClient({ chain: active, transport: custom(injected()) });
  const [account] = await wallet.getAddresses();
  if (!account) throw new Error("Connect a wallet first.");
  const hash = await wallet.writeContract({
    account,
    address,
    abi: provenantAbi,
    functionName: "registerDataset",
    args: [root, manifest],
    value,
    chain: active,
  });
  const receipt = await createPublicClient({ chain: active, transport: http(rpc) }).waitForTransactionReceipt({ hash });
  let datasetId: string | undefined;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: provenantAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "DatasetRegistered") datasetId = String((decoded.args as { id: bigint }).id);
    } catch {
      // unrelated log
    }
  }
  return { hash, datasetId };
}

export async function walletClaim(datasetId: bigint, fingerprint: Hex, royalty: bigint, proof: Hex[]): Promise<Hex> {
  const address = contractAddress();
  if (!address) throw new Error("Set NEXT_PUBLIC_PROVENANT_ADDRESS before sending a transaction.");
  const rpc = evmRpc();
  if (!rpc) throw new Error("Set NEXT_PUBLIC_EVM_RPC.");
  const active = chain();
  const wallet = createWalletClient({ chain: active, transport: custom(injected()) });
  const [account] = await wallet.getAddresses();
  if (!account) throw new Error("Connect a wallet first.");
  const hash = await wallet.writeContract({
    account,
    address,
    abi: provenantAbi,
    functionName: "claim",
    args: [datasetId, fingerprint, royalty, proof],
    chain: active,
  });
  await createPublicClient({ chain: active, transport: http(rpc) }).waitForTransactionReceipt({ hash });
  return hash;
}
