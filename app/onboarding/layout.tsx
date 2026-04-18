import type { Metadata } from "next";
import { PawPrint } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-[560px]">
        <div className="mb-8 flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
          <PawPrint className="size-7 text-primary" />
          PraxisVet
        </div>
        {children}
      </div>
    </div>
  );
}
