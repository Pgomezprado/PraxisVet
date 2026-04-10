import Link from "next/link";
import { Plus, Mail, Phone, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import type { Client } from "@/types";

interface ClientWithPetCount extends Client {
  pet_count: number;
}

interface ClientsTableProps {
  clients: ClientWithPetCount[];
  clinicSlug: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  search?: string;
}

export function ClientsTable({
  clients,
  clinicSlug,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  search,
}: ClientsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SearchInput placeholder="Buscar por nombre, email o tel\u00e9fono..." />
        <Button render={<Link href={`/${clinicSlug}/clients/new`} />}>
          <Plus className="size-4" data-icon="inline-start" />
          Nuevo cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-sm text-muted-foreground">
            {search
              ? "No se encontraron clientes con esa b\u00fasqueda."
              : "A\u00fan no hay clientes registrados."}
          </p>
          {!search && (
            <Button
              variant="outline"
              className="mt-4"
              render={<Link href={`/${clinicSlug}/clients/new`} />}
            >
              <Plus className="size-4" data-icon="inline-start" />
              Registrar primer cliente
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Mascotas</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      href={`/${clinicSlug}/clients/${client.id}`}
                      className="font-medium hover:underline"
                    >
                      {client.last_name}, {client.first_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {client.email && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="size-3" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="size-3" />
                          {client.phone}
                        </span>
                      )}
                      {!client.email && !client.phone && (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <PawPrint className="size-3" />
                      {client.pet_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(client.created_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            baseUrl={`/${clinicSlug}/clients`}
            searchParams={{ search }}
          />
        </>
      )}
    </div>
  );
}
