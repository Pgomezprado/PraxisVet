import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWhatsAppSettings } from "./actions";
import { WhatsAppSettingsForm } from "./_components/whatsapp-settings-form";

export default async function WhatsAppSettingsPage({
  params,
}: {
  params: Promise<{ clinic: string }>;
}) {
  const { clinic } = await params;
  const result = await getWhatsAppSettings(clinic);

  if (!result.success) {
    return (
      <div className="space-y-4">
        <Header clinic={clinic} />
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header clinic={clinic} />
      <WhatsAppSettingsForm clinic={clinic} initial={result.data} />
    </div>
  );
}

function Header({ clinic }: { clinic: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/${clinic}/settings`}>
        <Button variant="ghost" size="icon-sm">
          <ArrowLeft className="size-4" />
        </Button>
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <MessageCircle className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Activa los recordatorios automáticos por WhatsApp para tu clínica.
          </p>
        </div>
      </div>
    </div>
  );
}
