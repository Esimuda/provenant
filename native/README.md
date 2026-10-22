# Native scripts

`@polkadot/api` against `wss://test-node-v3.portaldot.dev` unless `PORTALDOT_SUBSTRATE_RPC` is set. `SURI` is read from the environment only when you pass `--submit`.

```bash
npm run probe
npm run native -- pallets
npm run native -- map --evm 0x…
npm run native -- mint --title "…" --author-name "…" --owner 5… --text-file chapter.txt
npm run native -- identity --display "Ada Lovelace"
npm run native -- manifest --file manifest.json --mode store
npm run native -- vest --dest 5… --locked 1000000000000000 --blocks 10000
```

Without `--submit`, each command encodes against live metadata and prints the call hex and a `paymentInfo` fee. The hash is appended to `evidence/submitted-hashes.jsonl` as soon as a real submission is signed.

`mint` builds `utility.batchAll` of `nfts.create` (unless `--collection` is set), `nfts.mint`, one `setAttribute` per locked field in the CollectionOwner namespace, and `lockItemProperties`. Attribute keys stay within 64 bytes and values within 256.

Identity is self-declared. The testnet has no registrar.
