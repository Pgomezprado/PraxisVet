export function escapePostgrestSearch(term: string): string {
  return term.replace(/[,()"'\\%:_*]/g, " ").trim();
}
