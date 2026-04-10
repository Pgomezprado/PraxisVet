"use client";

import { createContext, useContext } from "react";
import type { Organization, OrganizationMember } from "@/types";

interface ClinicContextValue {
  organization: Organization;
  member: OrganizationMember;
  clinicSlug: string;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

export function ClinicProvider({
  organization,
  member,
  children,
}: {
  organization: Organization;
  member: OrganizationMember;
  children: React.ReactNode;
}) {
  return (
    <ClinicContext.Provider
      value={{ organization, member, clinicSlug: organization.slug }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return context;
}
