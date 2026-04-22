"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, ArrowRight } from "lucide-react";

const navLinks = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#precios", label: "Precios" },
  { href: "#faq", label: "FAQ" },
  { href: "#como-funciona", label: "Cómo funciona" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div className="relative z-50 flex h-8 items-center justify-center bg-accent text-accent-foreground">
        <p className="text-xs font-medium sm:text-sm">
          Prueba PraxisVet 2 meses gratis, sin tarjeta
          <Link
            href="#precios"
            className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
          >
            Ver precios
            <ArrowRight className="size-3" />
          </Link>
        </p>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-all duration-300",
          scrolled && "bg-background/95 shadow-sm backdrop-blur-xl"
        )}
      >
        <nav
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8",
            scrolled ? "h-24" : "h-32"
          )}
        >
          <Link href="/" className="flex items-center" aria-label="PraxisVet">
            <img
              src="/brand/logo-praxisvet-transparent.svg"
              alt="PraxisVet"
              className="h-12 w-auto sm:h-16 md:h-24 lg:h-28"
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/auth/register"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              )}
            >
              Probar gratis
            </Link>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </nav>

        {mobileOpen && (
          <div className="border-t border-border/60 bg-background px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-border/60" />
              <Link
                href="/auth/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "justify-center"
                )}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/auth/register"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "justify-center"
                )}
              >
                Probar gratis
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
