/** Lowercase without Vietnamese accents, so "ca phe" matches "Cà phê". */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

/** Whether `text` contains `query`, ignoring case and accents. An empty query matches everything. */
export function matchesSearch(text: string, query: string): boolean {
  const q = normalizeForSearch(query.trim());
  return !q || normalizeForSearch(text).includes(q);
}
