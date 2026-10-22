import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

const rawKey = process.env.PRIVATE_KEY?.trim();
const accounts = rawKey ? [rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 1 },
      evmVersion: "shanghai",
      viaIR: true,
      metadata: {
        bytecodeHash: "none",
        appendCBOR: false,
      },
    },
  },
  networks: {
    portaldot: {
      url: process.env.PORTALDOT_EVM_RPC || "https://test-evm-rpc-v3.portaldot.dev",
      chainId: 420420777,
      accounts,
    },
    local: {
      url: process.env.LOCAL_EVM_RPC || "http://127.0.0.1:8545",
      chainId: 31337,
      accounts,
    },
  },
};

export default config;
