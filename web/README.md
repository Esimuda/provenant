# Web

Next.js app. Instrument Serif and Inter Tight are files in `public/fonts` (SIL Open Font License). The build does not call Google Fonts.

```bash
npm run dev     # from the repo root, after the core package is built
```

Routes: `/` landing, `/register`, `/publish`, `/check`, `/registry`.

Workshop mode keeps the registry in `localStorage`. Local Hardhat mode uses `/api/evm`, which signs with the public Hardhat keys only when `LOCAL_EVM_RPC` is loopback. Portaldot mode uses MetaMask. Native encoding is proxied to the relayer at `RELAYER_URL` when that process is up.

The sample market is Austen and Doyle inside the manifest, Shelley outside it.
