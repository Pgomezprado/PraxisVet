import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  variant?: "default" | "outline" | "secondary";
};

export function QuickActions({
  actions,
  size = "sm",
}: {
  actions: QuickAction[];
  size?: "sm" | "default";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Button
            size={size}
            variant={action.variant ?? "default"}
            className="gap-2"
          >
            <action.icon className="size-4" />
            {action.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}
