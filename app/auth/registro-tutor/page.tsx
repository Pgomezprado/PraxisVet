import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta de tutor | PraxisVet",
};

export default function RegistroTutorPage() {
  return <RegisterForm mode="tutor" />;
}
