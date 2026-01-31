export function msToDateInputValue(ms?: number) {
  if (!ms) return '';
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function dateInputValueToMs(v: string) {
  // Treat as local date at 09:00 to avoid timezone midnight shifts in display.
  // (We only care about date-level due dates for now.)
  if (!v) return undefined;
  const [y, m, d] = v.split('-').map((x) => Number(x));
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, 9, 0, 0, 0).getTime();
}
