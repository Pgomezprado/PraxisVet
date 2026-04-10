"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Receipt,
  Package,
  Settings,
  PawPrint,
} from "lucide-react";
import { useClinic } from "@/lib/context/clinic-context";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import type { MemberRole } from "@/types";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: MemberRole[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "vet", "receptionist"],
  },
  {
    title: "Citas",
    href: "/appointments",
    icon: CalendarDays,
    roles: ["admin", "vet", "receptionist"],
  },
  {
    title: "Clientes",
    href: "/clients",
    icon: Users,
    roles: ["admin", "vet", "receptionist"],
  },
  {
    title: "Facturacion",
    href: "/billing",
    icon: Receipt,
    roles: ["admin", "receptionist"],
  },
  {
    title: "Inventario",
    href: "/inventory",
    icon: Package,
    roles: ["admin"],
  },
  {
    title: "Configuracion",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { organization, member, clinicSlug } = useClinic();

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(member.role)
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border/40 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <PawPrint className="size-4" />
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-semibold">
              {organization.name}
            </p>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {organization.plan}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const fullHref = `/${clinicSlug}${item.href}`;
                const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={fullHref} />}
                    >
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 px-4 py-3">
        <p className="truncate text-xs text-muted-foreground">
          {member.first_name} {member.last_name}
        </p>
        <p className="text-[10px] capitalize text-muted-foreground">
          {member.role}
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
