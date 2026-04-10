import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  baseUrl: string;
  searchParams?: Record<string, string | undefined>;
}

function buildUrl(
  baseUrl: string,
  page: number,
  searchParams?: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  baseUrl,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Mostrando {from}-{to} de {totalItems} resultados
      </p>
      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={buildUrl(baseUrl, currentPage - 1, searchParams)}
              />
            }
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
        )}

        <span className="text-sm text-muted-foreground px-2">
          Pagina {currentPage} de {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={buildUrl(baseUrl, currentPage + 1, searchParams)}
              />
            }
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
