import Link from "next/link";
import { Globe, Mail, Lock } from "lucide-react";

const footerLinks = {
  Producto: [
    { href: "/#funcionalidades", label: "Funcionalidades" },
    { href: "/#precios", label: "Precios" },
    { href: "/#faq", label: "Preguntas frecuentes" },
    { href: "/#como-funciona", label: "Cómo funciona" },
  ],
  Empresa: [
    { href: "mailto:contacto@praxisvet.cl", label: "Contacto" },
    { href: "mailto:ventas@praxisvet.cl", label: "Ventas" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-5">
            <Link href="/" className="flex items-center" aria-label="PraxisVet">
              <img
                src="/brand/logo-praxisvet-transparent.svg"
                alt="PraxisVet"
                className="h-16 w-auto max-w-full sm:h-20"
              />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              La plataforma integral para clínicas veterinarias en Chile:
              gestión médica, peluquería y facturación SII en un solo lugar.
            </p>

            <div className="flex items-center gap-3">
              <a
                href="https://praxisvet.cl"
                className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Sitio web"
              >
                <Globe className="size-4" />
              </a>
              <a
                href="mailto:contacto@praxisvet.cl"
                className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Email"
              >
                <Mail className="size-4" />
              </a>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2">
              <Lock className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                Datos protegidos con encriptación
              </span>
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                {title}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PraxisVet. Todos los derechos
          reservados.
        </div>
      </div>
    </footer>
  );
}
