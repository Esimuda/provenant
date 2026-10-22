import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">404</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight">That page is not in the registry.</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">The route does not match a work, a manifest, or a proof.</p>
      <Button asChild className="mt-8">
        <Link href="/">Back to the start</Link>
      </Button>
    </div>
  );
}
