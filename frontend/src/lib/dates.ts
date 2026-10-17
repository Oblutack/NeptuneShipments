// A module-level helper, not an inline Date.now() call in a component -
// React's purity lint (react-hooks/purity) flags impure calls reachable
// from a component/hook body, even inside useMemo. Keeping this as a
// plain function outside any component body is the standard way to use
// "now" for a simple one-off display value like a day count.
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
