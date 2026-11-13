/**
 * The order `sort()` gives with no compare function: UTF-16 code units, the same on every machine. Not
 * localeCompare, whose order depends on the locale.
 */
export function compareCodeUnits(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}
