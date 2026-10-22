# Relayer

Listens to `RoyaltyPaid` on `PROVENANT_ADDRESS` and appends `evidence/relayer-events.jsonl` before it does anything else. On Portaldot, if `SURI` is set, it maps the author with `reviveApi.accountId` and submits `vesting.vestedTransfer` for `VESTING_LOCKED` planck (default 10 tPOT, the pallet minimum) over `VESTING_BLOCKS` (default 10,000).

It also serves `POST /prepare/mint|identity|manifest` on `127.0.0.1:8787` so the web app can show an encoded call without a signer. Do not expose this port when `SURI` is set. Set `RELAYER_TOKEN` if anything other than the Next server can reach it.

```bash
npm run relayer
```

Solidity cannot call the vesting pallet. This process is the admitted glue.
