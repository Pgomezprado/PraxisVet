"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/superadmin", label: "Resumen", icon: BarChart3 },
  { href: "/superadmin/clinicas", label: "Clínicas", icon: Building2 },
  { href: "/superadmin/embudo", label: "Embudo", icon: TrendingUp },
  { href: "/superadmin/hub", label: "Hub del Tutor", icon: Users },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/superadmin") {
    return pathname === "/superadmin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SuperadminTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border/60 bg-card/20">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
