import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar contrase\u00f1a | PraxisVet",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
