/** Format a lot size showing the EXACT traded size — never rounds the real
 *  value away. Up to 4 dp, trailing zeros trimmed, but always at least 2 dp
 *  for readability. 0 / invalid → "0.00".
 *  e.g. 0.0001→"0.0001", 0.0064→"0.0064", 0.012→"0.012", 0.05→"0.05", 1→"1.00". */
export function fmtLots(n: number | undefined | null): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '0.00';
  const s = v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  const dot = s.indexOf('.');
  if (dot === -1) return `${s}.00`;
  return s.length - dot - 1 < 2 ? v.toFixed(2) : s;
}
