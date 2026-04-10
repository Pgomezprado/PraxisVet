import Link from "next/link";
import { PawPrint } from "lucide-react";

const footerLinks = {
  Producto: [
    { href: "#funcionalidades", label: "Funcionalidades" },
    { href: "#precios", label: "Precios" },
    { href: "#como-funciona", label: "Como funciona" },
  ],
  Empresa: [
    { href: "#", label: "Sobre nosotros" },
    { href: "#", label: "Contacto" },
    { href: "#", label: "Blog" },
  ],
  Legal: [
    { href: "#", label: "Privacidad" },
    { href: "#", label: "Terminos" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <PawPrint className="size-6 text-primary" />
              <span className="text-lg font-bold tracking-tight">
                Praxis<span className="text-primary">Vet</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              La plataforma integral para gestionar tu clinica veterinaria de
              forma moderna y eficiente.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {title}
              </h3>
              <ul className="space-y-2">
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

        <div className="mt-10 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PraxisVet. Todos los derechos
          reservados.
        </div>
      </div>
    </footer>
  );
}
