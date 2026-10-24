import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Docs · Provenant", description: "Provenant documentation: training-data royalties on Portaldot." };

const ADDRESS = "0xA90e6d28707f7839adEE38C6e711bE703cE96AC9";
const DEPLOY_TX = "0x432e3e44f9fff09870be44f42c90187866843cb8cfe3dba5953e05525577dd44";
const REPO = "https://github.com/Esimuda/provenant";

const nav = [
  ["overview", "Overview"],
  ["how-it-works", "How it works"],
  ["quickstart", "Quickstart"],
  ["contract", "Contract reference"],
  ["evidence", "Testnet evidence"],
  ["faq", "FAQ"],
];

function Code({ children }: { children: string }) {
  return <pre className="mt-4 overflow-x-auto rounded-[4px] bg-ink p-4 font-mono text-xs leading-relaxed text-paper">{children}</pre>;
}
function H2({ id, kicker, children }: { id: string; kicker: string; children: React.ReactNode }) {
  return (
    <header className="scroll-mt-24">
      <p className="text-xs uppercase tracking-[0.16em] text-accent">{kicker}</p>
      <h2 id={id} className="mt-2 scroll-mt-24 font-display text-4xl tracking-tight">{children}</h2>
    </header>
  );
}
function Row({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-muted">{k}</dt>
      <dd className={mono ? "break-all font-mono text-xs leading-6" : "text-sm"}>{v}</dd>
    </div>
  );
}

const steps = [
  ["Register the dataset", "transactionStorage.store", "The full manifest lives on-chain. Up to 8 MiB. No IPFS pinning to babysit."],
  ["Mint each work", "nfts.mint + setAttribute + lockItemProperties", "Every work becomes an NFT. Fingerprint and licence, locked forever."],
  ["Name the author", "identity.setIdentity", "Authorship tied to an on-chain identity. Self-declared on testnet."],
  ["Prove and claim", "Provenant.claim on pallet-revive", "A Merkle proof against the lab’s escrow. Valid leaf, instant payout."],
  ["Stream the rest", "vesting.vestedTransfer", "Big royalties drip out over time via a relayer."],
  ["Use any EVM wallet", "EVM → native account mapping", "Your 0x address maps to a native Portaldot account. One wallet, both worlds."],
];

const fns = [
  ["registerDataset(bytes32 root, bytes32 manifestHash) payable → uint256 id", "Lab commits a training-set Merkle root and escrows tPOT. Deposit must be a non-zero multiple of 10⁴ wei (1 planck). Emits DatasetRegistered."],
  ["claim(uint256 id, bytes32 fingerprint, uint256 royalty, bytes32[] proof)", "Author proves leaf keccak256(fingerprint, msg.sender, royalty) is in the root (sorted-pair Merkle, max 32 nodes). Pays royalty from the deposit once. Emits RoyaltyPaid."],
  ["close(uint256 id)", "Lab only. Deletes the dataset and refunds deposit − claimed. Emits DatasetClosed."],
  ["dataset(uint256 id) view → (root, manifestHash, lab, deposit, claimed)", "Read a dataset’s state."],
  ["claimedLeaf(uint256 id, bytes32 node) view → bool", "Has this leaf already been paid?"],
  ["nextId() view → uint256", "Id of the most recently registered dataset."],
];

const faq = [
  ["Is this real or a demo?", "Real. Deployed on Portaldot V3 testnet, settled in tPOT, verified end to end 29/29."],
  ["Does my text get uploaded?", "No. Fingerprints are computed in your browser. Only hashes go on-chain."],
  ["What stops a lab from lying?", "Their deposit and root are public. Anything left out of the root is visible as missing — and the Shelley test proves held-out works don’t pay."],
  ["Can I claim twice?", "No. Each leaf is marked paid. A second claim reverts with AlreadyClaimed."],
  ["Why Portaldot?", "Storage, NFTs, identity, vesting and EVM contracts in one runtime. Elsewhere that’s five vendors."],
  ["Why no block explorer links?", "The testnet has no public EVM explorer yet. Transaction hashes are the proof; they’re archived in the repo."],
];

export default function DocsPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[13rem_1fr]">
      <aside className="lg:sticky lg:top-6 lg:h-fit">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Docs</p>
        <nav aria-label="Docs" className="mt-3 flex flex-wrap gap-1 lg:flex-col">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-[4px] px-3 py-2 text-sm text-ink transition-colors duration-200 hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
              {label}
            </a>
          ))}
        </nav>
        <a href={REPO} className="mt-6 hidden text-sm text-muted underline underline-offset-4 hover:text-ink lg:block">Source on GitHub</a>
      </aside>

      <article className="min-w-0 max-w-3xl space-y-20">
        <section>
          <H2 id="overview" kicker="Overview">Royalties, enforced by code.</H2>
          <p className="mt-4 text-lg leading-relaxed text-muted">AI labs declare what they trained on and escrow the royalties. Authors prove inclusion and get paid. Instantly, on-chain, on Portaldot.</p>
          <div className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
            {[["For authors", "Register once. Get paid every time."], ["For labs", "Train clean. Prove it publicly."], ["For everyone", "A receipt for every dataset."]].map(([t, d]) => (
              <div key={t} className="bg-white p-5"><p className="font-medium">{t}</p><p className="mt-1 text-sm text-muted">{d}</p></div>
            ))}
          </div>
        </section>

        <section>
          <H2 id="how-it-works" kicker="Architecture">How it works</H2>
          <p className="mt-4 text-muted">Six Portaldot primitives. One flow.</p>
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {steps.map(([t, call, d], i) => (
              <li key={t} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr]">
                <span className="font-display text-3xl leading-none text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div><p className="font-medium">{t}</p><p className="mt-1 font-mono text-xs text-ink">{call}</p><p className="mt-2 text-sm text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <H2 id="quickstart" kicker="Quickstart">Live in two minutes.</H2>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
            <li>Add Portaldot V3 testnet to MetaMask (or any EVM wallet).</li>
            <li>Get tPOT from the Portaldot faucet.</li>
            <li><Link className="underline underline-offset-4" href="/register">Register a work</Link>, then <Link className="underline underline-offset-4" href="/check">check it</Link> against a published set.</li>
          </ol>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            <Row k="Network name" v="Portaldot V3 Testnet" mono={false} />
            <Row k="EVM RPC" v="https://test-evm-rpc-v3.portaldot.dev" />
            <Row k="Chain ID" v="420420777" />
            <Row k="Currency" v="tPOT" />
            <Row k="Substrate RPC" v="wss://test-node-v3.portaldot.dev" />
          </dl>
          <Code>{`await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [{
    chainId: "0x190f1ca9", // 420420777
    chainName: "Portaldot V3 Testnet",
    nativeCurrency: { name: "tPOT", symbol: "tPOT", decimals: 18 },
    rpcUrls: ["https://test-evm-rpc-v3.portaldot.dev"],
  }],
});`}</Code>
        </section>

        <section>
          <H2 id="contract" kicker="Reference">Provenant.sol</H2>
          <p className="mt-4 text-muted">Solidity 0.8.24 on pallet-revive. No BLOCK opcodes, no CREATE.</p>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            <Row k="Address" v={ADDRESS} />
            <Row k="Source" v={<a className="underline underline-offset-4" href={`${REPO}/blob/main/contracts/contracts/Provenant.sol`}>contracts/Provenant.sol</a>} />
          </dl>
          <div className="mt-8 space-y-4">
            {fns.map(([sig, d]) => (
              <div key={sig} className="border border-line bg-white p-4">
                <p className="break-words font-mono text-xs text-ink">{sig}</p>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">Errors: <span className="font-mono text-xs text-ink">EmptyRoot · BadDeposit · BadRoyalty · BadProof · UnknownDataset · AlreadyClaimed · NotLab</span></p>
        </section>

        <section>
          <H2 id="evidence" kicker="Proof">Testnet evidence</H2>
          <p className="mt-4 text-muted">Not a mock. Every step settled on Portaldot V3.</p>
          <div className="mt-6 inline-flex items-baseline gap-3 rounded-[4px] bg-support px-4 py-3 text-white">
            <span className="font-display text-4xl">29/29</span><span className="text-sm">verify checks passed</span>
          </div>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            <Row k="Contract" v={ADDRESS} />
            <Row k="Deploy tx" v={DEPLOY_TX} />
            <Row k="NFT collection" v="10" />
            <Row k="Dataset id" v="1" />
            <Row k="Royalties paid" v="Austen ✓ · Doyle ✓" mono={false} />
            <Row k="Held-out work" v="Shelley — claim reverted, as designed" mono={false} />
            <Row k="Vesting payout" v="10 tPOT streamed" mono={false} />
          </dl>
          <p className="mt-4 text-sm text-muted">Raw receipts: <a className="underline underline-offset-4" href={`${REPO}/tree/main/evidence`}>evidence/</a></p>
        </section>

        <section>
          <H2 id="faq" kicker="FAQ">Questions, answered.</H2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {faq.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">{q}<span className="float-right text-muted group-open:rotate-45 transition-transform">+</span></summary>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
