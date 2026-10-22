# Contracts

`Provenant.sol` is the escrow. A lab calls `registerDataset(root, manifestHash)` with a tPOT deposit. An author calls `claim(id, fingerprint, royalty, proof)`. The leaf is `keccak256(abi.encodePacked(fingerprint, msg.sender, royalty))`. Pairs are sorted before hashing. `close` refunds the lab.

`OpcodeProbe.sol` uses `block.timestamp` and `block.chainid` on purpose. The test asserts those opcodes are present there and absent from Provenant. Do not deploy the probe. pallet-revive has been reported to revert on that family.

```bash
npm test -w @provenant/contracts
npm run deploy:evm          # needs PRIVATE_KEY, from the repo root
```

Compiler: 0.8.24, optimizer runs 1 (size, because the storage deposit is per byte), Shanghai, via IR, CBOR metadata stripped. Runtime code is 1,532 bytes.
