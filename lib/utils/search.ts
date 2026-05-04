export function escapePostgrestSearch(term: string): string {
  return term.replace(/[,()"'\\%:_*]/g, " ").trim();
}

export function normalizeSearchTerm(term: string): string {
  return term
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
