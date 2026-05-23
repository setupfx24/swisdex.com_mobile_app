import type { TickData } from '@/types/market';

/** Port of swisdesk/frontend/trader/src/lib/ws/normalizePricePayload.ts —
 *  the gateway publishes ticks in several shapes (single object, array,
 *  { prices: [...] } envelope). Squash them all into TickData[]. */
export function extractTicksFromPayload(data: unknown): TickData[] {
  const out: TickData[] = [];
  if (data == null) return out;

  if (Array.isArray(data)) {
    for (const row of data) pushIfTick(row, out);
    return out;
  }

  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.prices)) for (const r of o.prices) pushIfTick(r, out);
    else if (Array.isArray(o.ticks)) for (const r of o.ticks) pushIfTick(r, out);
    else if (Array.isArray(o.data)) for (const r of o.data) pushIfTick(r, out);
    else pushIfTick(o, out);
  }
  return out;
}

function pushIfTick(row: unknown, out: TickData[]) {
  if (!row || typeof row !== 'object') return;
  const r = row as Record<string, unknown>;
  if (r.symbol == null || r.bid == null || r.ask == null) return;

  const bid = typeof r.bid === 'number' ? r.bid : parseFloat(String(r.bid));
  const ask = typeof r.ask === 'number' ? r.ask : parseFloat(String(r.ask));
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) return;

  const symbol = String(r.symbol).trim().toUpperCase();
  if (!symbol) return;

  const spreadRaw = r.spread;
  const spread =
    spreadRaw != null && spreadRaw !== '' ? Number(spreadRaw) : ask - bid;

  out.push({
    symbol,
    bid,
    ask,
    timestamp:
      (typeof r.timestamp === 'string' && r.timestamp) ||
      (typeof r.ts === 'string' && r.ts) ||
      new Date().toISOString(),
    spread: Number.isFinite(spread) ? spread : ask - bid,
  });
}
