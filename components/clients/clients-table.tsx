"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Mail, Phone, PawPrint } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import type { Client } from "@/types";

interface ClientWithPetCount extends Client {
  pet_count: number;
}

interface ClientsTableProps {
  clients: ClientWithPetCount[];
  clinicSlug: string;
}

export function ClientsTable({ clients, clinicSlug }: ClientsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = clients.filter((client) => {
    const term = search.toLowerCase();
    return (
      client.first_name.toLowerCase().includes(term) ||
      client.last_name.toLowerCase().includes(term) ||
      (client.email?.toLowerCase().includes(term) ?? false) ||
      (client.phone?.includes(term) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button render={<Link href={`/${clinicSlug}/clients/new`} />}>
          <Plus className="size-4" data-icon="inline-start" />
          Nuevo cliente
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-sm text-muted-foreground">
            {search
              ? "No se encontraron clientes con esa busqueda."
              : "Aun no hay clientes registrados."}
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
            {filtered.map((client) => (
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
      )}
    </div>
  );
}
