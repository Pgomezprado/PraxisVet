import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users } from "lucide-react";
import { timeAgo } from "@/lib/utils/format";

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
};

export function RecentActivityWidget({
  clients,
  clinicSlug,
}: {
  clients: Client[];
  clinicSlug: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-orange-600 dark:text-orange-400" />
          <CardTitle className="text-base font-semibold">
            Actividad reciente
          </CardTitle>
        </div>
        <CardDescription>Últimos clientes registrados</CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-orange-500/5 py-10 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-orange-500/10">
              <Users className="size-7 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-sm font-medium">Aún no hay clientes registrados</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Empieza creando la ficha de tu primer cliente.
            </p>
            <Link href={`/${clinicSlug}/clients/new`} className="mt-4">
              <Button size="sm" variant="outline" className="gap-2">
                <UserPlus className="size-3.5" />
                Registrar cliente
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  href={`/${clinicSlug}/clients/${client.id}`}
                  className="flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-muted/50"
                >
                  <p className="text-sm font-medium">
                    {client.first_name} {client.last_name}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(client.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
