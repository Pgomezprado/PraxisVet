"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleMemberActive } from "@/app/[clinic]/settings/team/actions";

interface MemberStatusToggleProps {
  memberId: string;
  clinicSlug: string;
  active: boolean;
  canToggle: boolean;
}

export function MemberStatusToggle({
  memberId,
  clinicSlug,
  active,
  canToggle,
}: MemberStatusToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!canToggle) {
    return null;
  }

  async function handleToggle() {
    setLoading(true);
    await toggleMemberActive(memberId, clinicSlug, !active);
    setLoading(false);
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleToggle}
      disabled={loading}
      title={active ? "Desactivar" : "Reactivar"}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : active ? (
        <Power className="size-3.5" />
      ) : (
        <PowerOff className="size-3.5" />
      )}
    </Button>
  );
}
