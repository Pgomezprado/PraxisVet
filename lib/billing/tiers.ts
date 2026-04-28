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
    trial: "30 días de prueba, sin tarjeta",
    features: [
      "1 veterinario",
      "Pacientes ilimitados",
      "Agenda y ficha clínica",
      "Boleta y factura en PDF",
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
    trial: "30 días de prueba, sin tarjeta",
    features: [
      "Hasta 5 miembros del equipo",
      "Pacientes ilimitados",
      "Peluquería integrada",
      "Boleta y factura en PDF (SII vía partner próximamente)",
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
