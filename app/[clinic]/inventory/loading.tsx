import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-36" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
