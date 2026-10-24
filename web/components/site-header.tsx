"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/register", label: "Register" },
  { href: "/publish", label: "Publish" },
  { href: "/check", label: "Check" },
  { href: "/registry", label: "Registry" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[4px] bg-ink font-display text-lg text-accent" aria-hidden>
            P
          </span>
          <span className="font-display text-2xl leading-none tracking-tight">Provenant</span>
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-[4px] px-3 py-1.5 text-sm transition-colors duration-200",
                  active ? "bg-ink text-paper" : "text-ink hover:bg-ink/5",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
