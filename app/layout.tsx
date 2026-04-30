import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://praxisvet.cl";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PraxisVet — Software de gestión veterinaria en Chile",
    template: "%s | PraxisVet",
  },
  description:
    "Software para clínicas veterinarias en Chile: agenda, ficha clínica electrónica, peluquería, facturación SII (boleta y factura electrónica) e inventario en una sola plataforma.",
  applicationName: "PraxisVet",
  keywords: [
    "software veterinario Chile",
    "sistema gestión clínica veterinaria",
    "ficha clínica electrónica veterinaria",
    "facturación SII veterinaria",
    "boleta electrónica veterinaria",
    "agenda veterinaria",
    "software peluquería canina Chile",
    "gestión clínica veterinaria",
    "historial clínico veterinario",
    "inventario veterinario",
  ],
  authors: [{ name: "PRAXIS SpA", url: SITE_URL }],
  creator: "PRAXIS SpA",
  publisher: "PRAXIS SpA",
  category: "business software",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: SITE_URL,
    siteName: "PraxisVet",
    title: "PraxisVet — Software de gestión veterinaria en Chile",
    description:
      "Agenda, ficha clínica, peluquería, facturación SII e inventario en una sola plataforma. Hecho en Chile, para clínicas chilenas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PraxisVet — Software de gestión veterinaria en Chile",
    description:
      "Agenda, ficha clínica, peluquería, facturación SII e inventario en una sola plataforma. Hecho en Chile, para clínicas chilenas.",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "facebook-domain-verification": "pln3n1bsly2sq1vdjbtjj8sc4jlb7h",
    },
  },
  icons: {
    icon: [
      { url: "/brand/logo-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/brand/apple-icon.svg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "PraxisVet",
      legalName: "PRAXIS SpA",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/logo-praxisvet.svg`,
      areaServed: { "@type": "Country", name: "Chile" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        availableLanguage: ["Spanish"],
        areaServed: "CL",
      },
      taxID: "78.383.804-4",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}#software`,
      name: "PraxisVet",
      description:
        "Software para clínicas veterinarias en Chile: agenda, ficha clínica, peluquería, facturación SII e inventario.",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Veterinary Practice Management",
      operatingSystem: "Web",
      inLanguage: "es-CL",
      publisher: { "@id": `${SITE_URL}#organization` },
      offers: [
        {
          "@type": "Offer",
          name: "Básico",
          price: "29000",
          priceCurrency: "CLP",
          category: "subscription",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "79000",
          priceCurrency: "CLP",
          category: "subscription",
        },
        {
          "@type": "Offer",
          name: "Enterprise",
          price: "149000",
          priceCurrency: "CLP",
          category: "subscription",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CL"
      className={`dark ${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
        />
        <Analytics />
      </body>
    </html>
  );
}
