"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  Scissors,
  Users,
  ShoppingBag,
  Plane,
  ShieldCheck,
  PawPrint,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type Section = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status: "live" | "coming-soon";
};

const sections: Section[] = [
  {
    title: "Salud",
    href: "/mascotas/salud",
    icon: Heart,
    description: "Veterinaria y vacunas",
    status: "live",
  },
  {
    title: "Belleza",
    href: "/mascotas/belleza",
    icon: Scissors,
    description: "Peluquerías y spa",
    status: "live",
  },
  {
    title: "Comunidad",
    href: "/mascotas/comunidad",
    icon: Users,
    description: "Conoce otros regalones",
    status: "coming-soon",
  },
  {
    title: "Mall",
    href: "/mascotas/mall",
    icon: ShoppingBag,
    description: "Tiendas y alimento",
    status: "coming-soon",
  },
  {
    title: "Viajes",
    href: "/mascotas/viajes",
    icon: Plane,
    description: "Hoteles y sitters",
    status: "coming-soon",
  },
  {
    title: "Protección",
    href: "/mascotas/proteccion",
    icon: ShieldCheck,
    description: "Seguros para mascotas",
    status: "coming-soon",
  },
];

export function MascotasSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/mascotas"
          className="flex items-center gap-2 px-2 py-3 transition-opacity hover:opacity-80"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">PraxisVet</span>
            <span className="text-xs text-muted-foreground">
              Para tu mascota
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Secciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive =
                  pathname === section.href ||
                  pathname?.startsWith(`${section.href}/`);

                if (section.status === "coming-soon") {
                  return (
                    <SidebarMenuItem key={section.href}>
                      <SidebarMenuButton
                        size="lg"
                        disabled
                        tooltip={`${section.title} · pronto`}
                        className="h-auto cursor-default items-center gap-3 py-2.5 opacity-60"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex flex-col leading-tight">
                          <span className="text-sm font-medium">
                            {section.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {section.description}
                          </span>
                        </span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>Pronto</SidebarMenuBadge>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={section.title}
                      size="lg"
                      className="h-auto items-center gap-3 py-2.5 text-sidebar-foreground/80 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-primary"
                      render={<Link href={section.href} />}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex flex-col leading-tight">
                        <span className="text-sm font-medium">
                          {section.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {section.description}
                        </span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Tu manada · PraxisVet
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
