import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Portal del tutor · PraxisVet",
};

export default function TutorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
