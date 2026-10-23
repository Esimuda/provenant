# Evidence

`testnet-readonly.json` is a read-only probe of Portaldot V3 testnet. It records chain id 420420777, spec `portaldot-v3` v3002, pallet presence, NFT deposit constants, the 10 tPOT vesting minimum, empty identity registrars, and encoded (not submitted) calls for mint, identity, manifest storage, and vesting. No secret and no extrinsic.

`local-e2e.json` appears after `npm run e2e:local`. It is a Hardhat stand-in, not a Portaldot deployment. The hashes are only retrievable while that node is still running. Re-run the script to reproduce the `N/N` local checks.

`testnet.json` is where the real deploy address and transaction hash go, the moment `npm run deploy:evm` returns. Do not wait. The EVM RPC prunes receipts.

`submitted-hashes.jsonl` and `relayer-events.jsonl` are append-only logs created at runtime and gitignored.

`testnet-e2e.json` is the live register + Austen/Doyle claim + Shelley held-out transcript on Portaldot V3. Keep it next to `testnet.json`.
