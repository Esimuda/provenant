import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
        <p>Provenant · Portaldot Hacker House 2026 · MIT</p>
        <p className="flex gap-4">
          <Link href="/docs" className="hover:text-ink">Docs</Link>
          <a href="https://github.com/Esimuda/provenant" className="hover:text-ink">GitHub</a>
          <a href="https://github.com/ItsCogumellum/portaldot-v3-testnet-guide" className="hover:text-ink">Testnet guide</a>
        </p>
      </div>
    </footer>
  );
}
