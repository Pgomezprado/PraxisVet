import Link from "next/link";

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
          className="mb-8 flex items-center justify-center"
          aria-label="Volver al inicio"
        >
          <img
            src="/brand/logo-praxisvet-transparent.svg"
            alt="PraxisVet"
            className="h-16 w-auto max-w-full sm:h-24"
          />
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
