import { fingerprintText, formatTpot, sampleMarket, shortHex } from "@provenant/core";

export function HowItWorks() {
  const market = sampleMarket();
  const austen = market.trained[0];
  const finger = fingerprintText(austen.text);
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="how-heading">
      <h2 id="how-heading" className="font-display text-4xl tracking-tight">Three moves to a payout</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
        Real hashes. Real tPOT. Pride and Prejudice as the test subject.
      </p>
      <ol className="mt-10 grid list-none gap-6 p-0 md:grid-cols-3">
        <li className="flex flex-col border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <p className="font-display text-3xl leading-none">01</p>
            <h3 className="mt-2 text-base font-medium">Register the work</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">Fingerprint it. Mint it. Lock it.</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            {finger.chunks.map((chunk) => (
              <div key={chunk.sha256} className="border border-line bg-paper p-3">
                <p className="text-sm leading-relaxed text-ink">{chunk.text}</p>
                <p className="mt-2 break-all font-mono text-xs text-muted">{shortHex(chunk.sha256, 10, 6)}</p>
              </div>
            ))}
            <p className="mt-auto break-all font-mono text-xs text-ink">Work {shortHex(austen.fingerprint, 10, 6)}</p>
          </div>
        </li>
        <li className="flex flex-col border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <p className="font-display text-3xl leading-none">02</p>
            <h3 className="mt-2 text-base font-medium">Publish the manifest</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">The lab commits a root and escrows tPOT.</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4 text-sm">
            <p className="text-muted">Model</p>
            <p className="font-medium">{market.model}</p>
            {market.trained.map((work) => (
              <div key={work.id} className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
                <span>{work.title}</span>
                <span className="shrink-0 font-mono text-xs">{formatTpot(work.royalty)} tPOT</span>
              </div>
            ))}
            <p className="mt-auto break-all border-t border-line pt-3 font-mono text-xs text-ink">Root {shortHex(market.root, 10, 6)}</p>
          </div>
        </li>
        <li className="flex flex-col border border-line bg-white">
          <div className="border-b border-line px-4 py-3">
            <p className="font-display text-3xl leading-none">03</p>
            <h3 className="mt-2 text-base font-medium">Prove and get paid</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">Paste your chapter. Get paid on the spot.</p>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="inline-flex w-fit bg-support px-2 py-1 text-xs font-medium text-white">Included</p>
            <p className="text-sm leading-relaxed text-ink">{finger.chunks[0].text}</p>
            <p className="text-sm text-muted">Royalty</p>
            <p className="font-display text-4xl tracking-tight">{formatTpot(market.royaltyEach)} tPOT</p>
            <p className="mt-auto text-xs text-muted">Not in the set? No payout. Frankenstein found out.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
