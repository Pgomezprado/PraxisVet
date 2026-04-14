export function escapePostgrestSearch(term: string): string {
  return term.replace(/[,()"'\\%]/g, " ").trim();
}
