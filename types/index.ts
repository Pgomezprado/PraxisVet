export * from "./database";

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: ("admin" | "vet" | "receptionist")[];
}

export interface UserWithMembership {
  id: string;
  email: string;
  member: {
    id: string;
    role: "admin" | "vet" | "receptionist";
    first_name: string | null;
    last_name: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: "free" | "pro" | "enterprise";
  };
}
