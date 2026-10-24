import Link from "next/link";
import { fingerprintText, formatTpot, sampleMarket, shortHex } from "@provenant/core";
import { HowItWorks } from "@/components/how-it-works";
import { ProvenanceTrail } from "@/components/provenance-trail";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const market = sampleMarket();
  const work = market.trained[0];
  const finger = fingerprintText(work.text);
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-8 pt-12 sm:px-6 lg:pt-16">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Royalties for training data</p>
          <h1 className="mt-4 font-display text-[2.6rem] leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Your words trained it. Get paid.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Labs commit what they trained on. Authors prove it. The chain pays. No lawyers, no guesswork.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">Register a work</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
        <ProvenanceTrail
          sentence={finger.chunks[0].text}
          attribution="Jane Austen, Pride and Prejudice, 1813. Public domain. Live specimen."
          steps={[
            { kicker: "Chunks", title: `${finger.chunks.length} exact paragraphs`, detail: finger.chunks.map((chunk) => shortHex(chunk.sha256, 8, 4)).join("  ") },
            { kicker: "Work NFT", title: "Fingerprint locked", detail: work.fingerprint },
            { kicker: "Manifest", title: market.model, detail: market.root },
            { kicker: "Model", title: "Declared training set", detail: "Merkle root plus a tPOT deposit on Provenant.sol" },
            { kicker: "Proof", title: "Leaf is in the root", detail: "keccak256(fingerprint, author, royalty)" },
            { kicker: "Payout", title: `${formatTpot(work.royalty)} tPOT to the author`, detail: "From the lab deposit. A relayer can stream the rest with vesting.", tone: "support" },
          ]}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="stakes-heading">
        <h2 id="stakes-heading" className="font-display text-4xl tracking-tight">The bill is already coming</h2>
        <dl className="mt-8 divide-y divide-line border-y border-line">
          <div className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:items-baseline">
            <dt className="font-display text-4xl tracking-tight">$1.5B</dt>
            <dd className="text-sm leading-relaxed text-muted">
              Anthropic’s 2025 settlement. ~482,000 books. Nobody kept receipts.{" "}
              <a className="text-ink underline decoration-line underline-offset-4" href="https://apnews.com/article/anthropic-authors-copyright-judge-artificial-intelligence-9643064e847a5e88ef6ee8b620b3a44c">AP News</a>
            </dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:items-baseline">
            <dt className="font-display text-4xl tracking-tight">$4.8B</dt>
            <dd className="text-sm leading-relaxed text-muted">
              Paid for training data in 2025.{" "}
              <a className="text-ink underline decoration-line underline-offset-4" href="https://marketintelo.com/report/dataset-licensing-for-ai-training-market">Marketintelo</a>
            </dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:items-baseline">
            <dt className="font-display text-4xl tracking-tight">$22B</dt>
            <dd className="text-sm leading-relaxed text-muted">
              By 2034. A licence beats a lawsuit.{" "}
              <a className="text-ink underline decoration-line underline-offset-4" href="https://dataintelo.com/report/dataset-licensing-for-ai-training-market">Dataintelo</a>
            </dd>
          </div>
        </dl>
      </section>

      <HowItWorks />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6" aria-labelledby="why-heading">
        <h2 id="why-heading" className="font-display text-4xl tracking-tight">One chain. Five pallets. Zero glue.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Registry, manifest and royalties in a single runtime.
        </p>
        <div className="mt-8 overflow-hidden border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Step</th>
                <th className="px-4 py-3 font-medium">Call</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">What it carries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-paper">
              {[
                ["Register the work", "nfts.mint + setAttribute + lockItemProperties in utility.batchAll", "Licence and royalty, locked"],
                ["Name the author", "identity.setIdentity", "Self-declared. No registrar on testnet"],
                ["Keep the manifest", "transactionStorage.store", "The training set itself, up to 8 MiB"],
                ["Prove and pay", "Provenant.claim on pallet-revive", "Merkle proof against the escrow"],
                ["Stream the rest", "vesting.vestedTransfer", "Relayer, because Solidity cannot call vesting"],
              ].map((row) => (
                <tr key={row[0]}>
                  <td className="px-4 py-3 font-medium">{row[0]}</td>
                  <td className="break-words px-4 py-3 font-mono text-xs">{row[1]}</td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
