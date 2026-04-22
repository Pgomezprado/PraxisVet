"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Receipt,
  Package,
  BarChart3,
  Settings,
} from "lucide-react";
import { useClinic } from "@/lib/context/clinic-context";
import { roleLabels } from "@/lib/validations/team-members";
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
  badgeKey?: "appointments";
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "vet", "receptionist", "groomer"],
  },
  {
    title: "Citas",
    href: "/appointments",
    icon: CalendarDays,
    roles: ["admin", "vet", "receptionist", "groomer"],
    badgeKey: "appointments",
  },
  {
    title: "Clientes",
    href: "/clients",
    icon: Users,
    roles: ["admin", "vet", "receptionist", "groomer"],
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
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    title: "Configuración",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function AppSidebar({
  appointmentsBadge = 0,
}: {
  appointmentsBadge?: number;
}) {
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
          <img
            src="/brand/logo-icon.svg"
            alt="PraxisVet"
            className="size-10 shrink-0"
          />
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
                      <span className="flex-1">{item.title}</span>
                      {item.badgeKey === "appointments" &&
                        appointmentsBadge > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 min-w-5 justify-center px-1.5 text-[10px] font-semibold"
                          >
                            {appointmentsBadge}
                          </Badge>
                        )}
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
            <p className="truncate text-xs text-sidebar-foreground/60">
              {roleLabels[member.role]}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
