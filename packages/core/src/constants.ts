/** 1 planck = 10^4 wei on pallet-revive. Native amounts must be multiples of this. */
export const PLANCK_WEI = 10_000n;

/** 1 tPOT = 10^14 planck = 10^18 wei. EVM tooling shows 18 decimals. */
export const TPOT_WEI = 10n ** 18n;

/** 1 tPOT in substrate planck (14 decimals). */
export const TPOT_PLANCK = 10n ** 14n;

/**
 * Vesting precompile / pallet minimum, from the V3 testnet notes.
 * The probe script re-reads `vesting.minVestedTransfer` at runtime.
 */
export const ASSUMED_MIN_VESTED_PLANCK = 10n * TPOT_PLANCK;

/** Portaldot V3 testnet. Hard-coded because BLOCK chainid reverts on revive. */
export const PORTALDOT_CHAIN_ID = 420420777;

export const EVM_RPC = "https://test-evm-rpc-v3.portaldot.dev";
export const SUBSTRATE_RPC = "wss://test-node-v3.portaldot.dev";
export const EXPLORER = "https://node-console.portaldot.dev";

export const LICENCE_CODE = "training-royalty-v1";
export const FINGERPRINT_ALGO = "sha256-chunk-chain-v1";
export const FINGERPRINT_DOMAIN = "provenant.work.v1";

/** Hardhat account 0. The sample author. */
export const DEMO_AUTHOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

/** Hardhat account 1. The sample lab. */
export const DEMO_LAB = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

/** Attribute limits from pallet-nfts on the V3 testnet. */
export const NFT_KEY_MAX = 64;
export const NFT_VALUE_MAX = 256;

/** transactionStorage.store cap documented on the testnet. */
export const MANIFEST_MAX_BYTES = 8 * 1024 * 1024;

export const BLOCK_OPCODES: Record<number, string> = {
  0x40: "BLOCKHASH",
  0x41: "COINBASE",
  0x42: "TIMESTAMP",
  0x43: "NUMBER",
  0x44: "PREVRANDAO",
  0x45: "GASLIMIT",
  0x46: "CHAINID",
  0x48: "BASEFEE",
  0x49: "BLOBHASH",
  0x4a: "BLOBBASEFEE",
};

export const CREATE_OPCODES: Record<number, string> = {
  0xf0: "CREATE",
  0xf5: "CREATE2",
};
