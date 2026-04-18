import type { Plan } from "@/types";

export type PricingTier = {
  id: Plan;
  name: string;
  tagline: string;
  price: string;
  priceHint: string;
  highlight: boolean;
  trial: string | null;
  features: string[];
};

/**
 * Fuente única de los tiers de pricing. La landing y /billing/upgrade
 * consumen esta lista para evitar divergencia.
 */
export const pricingTiers: readonly PricingTier[] = [
  {
    id: "basico",
    name: "Básico",
    tagline: "Para el veterinario que recién se independiza.",
    price: "$29.000",
    priceHint: "CLP / mes",
    highlight: false,
    trial: "2 meses de prueba, sin tarjeta",
    features: [
      "1 veterinario",
      "Hasta 50 pacientes",
      "Agenda y ficha clínica",
      "Boleta SII básica",
      "Soporte por correo",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para la mayoría de las clínicas.",
    price: "$79.000",
    priceHint: "CLP / mes",
    highlight: true,
    trial: "2 meses de prueba, sin tarjeta",
    features: [
      "Hasta 5 miembros del equipo",
      "Pacientes ilimitados",
      "Peluquería integrada",
      "Facturación SII",
      "Inventario + alertas",
      "Recordatorios automáticos",
      "Exporta a PDF",
      "Soporte por WhatsApp",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Para clínicas con varias sucursales.",
    price: "$149.000",
    priceHint: "CLP / mes",
    highlight: false,
    trial: null,
    features: [
      "Equipo ilimitado",
      "Multi-clínica",
      "API e integraciones",
      "Onboarding guiado",
      "SLA + soporte prioritario",
    ],
  },
] as const;
