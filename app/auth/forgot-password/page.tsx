import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar contrasena | PraxisVet",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
