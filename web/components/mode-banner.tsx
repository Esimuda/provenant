"use client";

import { chainMode, contractAddress } from "@/lib/utils";

export function ModeBanner() {
  const mode = chainMode();
  const address = contractAddress();
  if (mode === "portaldot") {
    return (
      <p className="border-b border-line bg-white px-4 py-2 text-center text-sm text-ink">
        Portaldot V3 testnet · chain 420420777 · contract <span className="font-mono">{address}</span>
      </p>
    );
  }
  if (mode === "local") {
    return (
      <p className="border-b border-line bg-white px-4 py-2 text-center text-sm text-ink">
        Local Hardhat stand-in at 127.0.0.1:8545. Royalties move here. This node is not pallet-revive.
      </p>
    );
  }
  return (
    <p className="border-b border-line bg-white px-4 py-2 text-center text-sm text-muted">
      Workshop registry, stored in this browser. A contract address turns on chain settlement.
    </p>
  );
}
