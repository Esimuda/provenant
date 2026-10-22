"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Ethereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type WalletApi = {
  address: string | null;
  error: string | null;
  connect: () => Promise<void>;
  addPortaldot: () => Promise<void>;
};

const Ctx = createContext<WalletApi | null>(null);

function ethereum(): Ethereum | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Ethereum }).ethereum ?? null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = ethereum();
    if (!provider) return;
    provider.request({ method: "eth_accounts" }).then((accounts) => {
      const list = accounts as string[];
      if (list[0]) setAddress(list[0]);
    }).catch(() => undefined);
  }, []);

  const api: WalletApi = {
    address,
    error,
    connect: async () => {
      const provider = ethereum();
      if (!provider) {
        setError("MetaMask is not installed in this browser.");
        return;
      }
      setError(null);
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accounts[0] ?? null);
    },
    addPortaldot: async () => {
      const provider = ethereum();
      if (!provider) {
        setError("MetaMask is not installed in this browser.");
        return;
      }
      setError(null);
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x190f1ca9",
            chainName: "Portaldot V3 Testnet",
            nativeCurrency: { name: "tPOTv3", symbol: "tPOTv3", decimals: 18 },
            rpcUrls: ["https://test-evm-rpc-v3.portaldot.dev"],
          },
        ],
      });
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletApi {
  const value = useContext(Ctx);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}

export function WalletButton() {
  const { address, connect, error } = useWallet();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant={address ? "outline" : "ink"} size="sm" onClick={() => void connect()}>
        {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect"}
      </Button>
      {error ? <span className="max-w-48 text-right text-xs text-danger">{error}</span> : null}
    </div>
  );
}
