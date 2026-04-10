import Link from "next/link";
import { PawPrint } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-[440px]">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold text-foreground"
        >
          <PawPrint className="size-7 text-primary" />
          PraxisVet
        </Link>
        {children}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground hover:underline">
            &larr; Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
