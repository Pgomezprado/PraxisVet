import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Superadmin · PraxisVet",
  robots: { index: false, follow: false },
};

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            <h1 className="text-lg font-semibold tracking-tight">
              Superadmin · PraxisVet
            </h1>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Volver al inicio
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
