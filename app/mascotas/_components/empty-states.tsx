import Link from "next/link";
import { LogIn, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function NotLoggedInEmpty({ section }: { section: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">Inicia sesión para ver {section}</CardTitle>
            <CardDescription>
              Tu información está protegida. Entra con tu correo para
              encontrar todo lo de tu mascota.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button render={<Link href="/auth/login" />}>
          Entrar a mi cuenta
        </Button>
      </CardContent>
    </Card>
  );
}

export function NoPetEmpty() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PawPrint className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">Aún no tienes mascotas conectadas</CardTitle>
            <CardDescription>
              Cuando tu veterinaria te invite, vas a ver acá la información de tu
              regalón. Pronto podrás agregar a tu mascota tú mismo, aunque tu
              clínica aún no esté en PraxisVet.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="outline" disabled>
          Agregar mi mascota (próximamente)
        </Button>
      </CardContent>
    </Card>
  );
}
