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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
    title: "Facturación",
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
    title: "Configuración",
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

  const initials = (() => {
    const first = member.first_name?.trim();
    const last = member.last_name?.trim();
    if (first && last) return (first[0] + last[0]).toUpperCase();
    if (first) return first.slice(0, 2).toUpperCase();
    return "?";
  })();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <PawPrint className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {organization.name}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 text-[10px] uppercase tracking-wide"
            >
              Plan {organization.plan}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {filteredItems.map((item) => {
                const fullHref = `/${clinicSlug}${item.href}`;
                const isActive =
                  pathname === fullHref || pathname.startsWith(`${fullHref}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      size="lg"
                      className="group relative h-11 gap-3 px-3 text-[15px] font-medium text-sidebar-foreground/75 transition-colors [&_svg]:size-5! hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-primary"
                      render={<Link href={fullHref} />}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute top-2 bottom-2 left-0 w-0.5 rounded-r-full bg-sidebar-primary"
                        />
                      )}
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {member.first_name} {member.last_name}
            </p>
            <p className="truncate text-xs capitalize text-sidebar-foreground/60">
              {member.role}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
