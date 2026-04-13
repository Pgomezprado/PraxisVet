import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Shield, Stethoscope, Users, Scissors, Pencil, Power, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getTeamMembers } from "./actions";
import { MemberStatusToggle } from "@/components/team/member-status-toggle";
import { roleLabels } from "@/lib/validations/team-members";
import type { MemberRole, OrganizationMember } from "@/types";

const roleIcons: Record<MemberRole, typeof Shield> = {
  admin: Shield,
  vet: Stethoscope,
  receptionist: Users,
  groomer: Scissors,
};

function getInitials(first: string | null, last: string | null): string {
  const f = first?.trim();
  const l = last?.trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  return "?";
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", clinic)
    .single();

  if (!org) {
    notFound();
  }

  const result = await getTeamMembers(org.id);
  const members = result.success ? result.data : [];

  const activeMembers = members.filter((m) => m.active);
  const inactiveMembers = members.filter((m) => !m.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${clinic}/settings`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Equipo</h1>
          <p className="text-sm text-muted-foreground">
            Administra los miembros de tu clínica y sus roles.
          </p>
        </div>
        <Link href={`/${clinic}/settings/team/new`}>
          <Button>
            <Plus className="size-4" />
            Nuevo miembro
          </Button>
        </Link>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Users className="size-7 text-primary" />
            </div>
            <p className="text-base font-medium">Tu equipo está vacío</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Agrega veterinarios, peluqueros y recepcionistas para poder
              asignarles citas y servicios.
            </p>
            <Link href={`/${clinic}/settings/team/new`} className="mt-5">
              <Button>
                <Plus className="size-4" />
                Agregar primer miembro
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <MemberList
            title="Miembros activos"
            members={activeMembers}
            clinic={clinic}
          />
          {inactiveMembers.length > 0 && (
            <MemberList
              title="Inactivos"
              members={inactiveMembers}
              clinic={clinic}
              muted
            />
          )}
        </div>
      )}
    </div>
  );
}

function MemberList({
  title,
  members,
  clinic,
  muted,
}: {
  title: string;
  members: OrganizationMember[];
  clinic: string;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription>
          {members.length} miembro{members.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {members.map((member) => {
            const Icon = roleIcons[member.role];
            const name =
              [member.first_name, member.last_name].filter(Boolean).join(" ") ||
              "Sin nombre";
            const canLogin = !!member.user_id;

            return (
              <li
                key={member.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  muted ? "opacity-60" : "hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <Avatar className="size-10 border border-border">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(member.first_name, member.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{name}</p>
                    {!canLogin && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="size-3" />
                        sin acceso
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="size-3" />
                      {roleLabels[member.role]}
                    </span>
                    {member.specialty && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {member.specialty}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/${clinic}/settings/team/${member.id}/edit`}>
                    <Button variant="ghost" size="icon-sm">
                      <Pencil className="size-3.5" />
                    </Button>
                  </Link>
                  <MemberStatusToggle
                    memberId={member.id}
                    clinicSlug={clinic}
                    active={member.active}
                    canToggle={!canLogin || member.role !== "admin"}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
