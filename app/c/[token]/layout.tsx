import type { Metadata } from "next";
import "../../tutor/tutor-theme.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicHealthCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="tutor-warm"
      className="min-h-screen bg-background text-foreground"
    >
      {children}
    </div>
  );
}
