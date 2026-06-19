import type { TradeRow } from '@/lib/api/portfolio';
import { fmtLots } from '@/lib/format';
import { safeFormat } from '@/lib/date';

/** Per-symbol price decimals — mirrors the web tradeStatementPdf. */
function priceDigits(symbol: string): number {
  const s = (symbol || '').toUpperCase();
  if (s.includes('JPY')) return 3;
  if (/XAU|XAG|OIL|USOIL|UKOIL|WTI|BRENT|BTC|ETH|LTC|XRP|SOL|DOGE|BNB|ADA/.test(s)) return 2;
  if (/NAS|US30|US500|SPX|GER|UK100|FRA|JP225|AUS|HK|EU50|DAX|FTSE|NIK/.test(s)) return 1;
  return 5;
}

function exitLabel(reason: string | null | undefined): string {
  const r = (reason || 'manual').toLowerCase();
  if (r === 'sl' || r === 'stop_loss') return 'Stop loss';
  if (r === 'tp' || r === 'take_profit') return 'Take profit';
  if (r === 'admin') return 'Admin';
  return 'Manual close';
}

function fmtMoneyRaw(n: number, isCent: boolean): string {
  const v = Number(n) || 0;
  if (isCent) {
    return `¢${(v * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);
}

function price(n: number, digits: number): string {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(digits) : '—';
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface StatementInput {
  accountLabel: string;
  periodLabel: string;
  generatedAt: string; // pre-formatted display string
  trades: TradeRow[];
  /** Cent account → money in ¢ (value ×100). */
  isCent?: boolean;
}

/** Build a printable HTML statement that mirrors the web trade-statement PDF:
 *  branded header, summary line, trade table, totals row, footer disclaimer.
 *  Consumed by expo-print's printToFileAsync({ html }). */
export function buildStatementHtml({ accountLabel, periodLabel, generatedAt, trades, isCent = false }: StatementInput): string {
  const money = (n: number) => fmtMoneyRaw(n, isCent);
  const totalPnl = trades.reduce((a, t) => a + (Number(t.pnl) || 0), 0);
  const totalComm = trades.reduce((a, t) => a + (Number(t.commission) || 0), 0);
  const totalSwap = trades.reduce((a, t) => a + (Number(t.swap) || 0), 0);
  const totalLots = trades.reduce((a, t) => a + (Number(t.lots) || 0), 0);

  const rows = trades.map((t, i) => {
    const d = priceDigits(t.symbol);
    const pos = (Number(t.pnl) || 0) >= 0;
    return `
      <tr class="${i % 2 ? 'alt' : ''}">
        <td>${esc(safeFormat(t.close_time, 'MMM d, yyyy HH:mm'))}</td>
        <td>${esc(safeFormat(t.opened_at, 'MMM d, yyyy HH:mm'))}</td>
        <td class="b">${esc(t.symbol)}</td>
        <td class="${t.side === 'buy' ? 'buy' : 'sell'}">${esc((t.side || '').toUpperCase())}</td>
        <td class="num">${fmtLots(t.lots)}</td>
        <td class="num">${price(t.open_price, d)}</td>
        <td class="num">${price(t.close_price, d)}</td>
        <td>${esc(exitLabel(t.close_reason))}</td>
        <td class="num ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${money(t.pnl)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 0; }
    .bar { background: #1E7A3C; color: #fff; padding: 16px 20px; }
    .bar .brand { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
    .bar .sub { font-size: 13px; opacity: 0.9; margin-top: 2px; }
    .meta { padding: 12px 20px; font-size: 11px; color: #555; border-bottom: 1px solid #e5e7ea; }
    .meta span { margin-right: 14px; }
    .summary { padding: 12px 20px; font-size: 12px; }
    .summary b { color: #111; }
    .pnlpos { color: #1E7A3C; font-weight: 700; }
    .pnlneg { color: #c0392b; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
    th { background: #1E7A3C; color: #fff; text-align: left; padding: 6px 6px; font-size: 9px; text-transform: uppercase; }
    td { padding: 5px 6px; border-bottom: 1px solid #eee; }
    tr.alt td { background: #f6f8f6; }
    .num { font-family: 'Courier New', monospace; text-align: right; }
    .b { font-weight: 700; }
    .buy { color: #1E7A3C; font-weight: 700; }
    .sell { color: #c0392b; font-weight: 700; }
    .pos { color: #1E7A3C; }
    .neg { color: #c0392b; }
    .totals { padding: 10px 20px; text-align: right; font-size: 13px; font-weight: 800; }
    .footer { padding: 16px 20px; font-size: 9px; color: #888; border-top: 1px solid #e5e7ea; margin-top: 8px; }
    .empty { padding: 30px 20px; text-align: center; color: #888; font-size: 12px; }
  </style></head>
  <body>
    <div class="bar">
      <div class="brand">SwisDex</div>
      <div class="sub">Trade history statement</div>
    </div>
    <div class="meta">
      <span>Generated: ${esc(generatedAt)}</span>
      <span>Account: ${esc(accountLabel)}</span>
      <span>Period: ${esc(periodLabel)}</span>
      <span>Closed trades: ${trades.length}</span>
    </div>
    <div class="summary">
      Total realized P&amp;L: <span class="${totalPnl >= 0 ? 'pnlpos' : 'pnlneg'}">${totalPnl >= 0 ? '+' : ''}${money(totalPnl)}</span>
      &nbsp;·&nbsp; Commission (sum): <b>${money(totalComm)}</b>
      &nbsp;·&nbsp; Swap (sum): <b>${money(totalSwap)}</b>
      &nbsp;·&nbsp; Volume: <b>${fmtLots(totalLots)} lots</b>
    </div>
    ${trades.length === 0 ? '<div class="empty">No closed trades in this period.</div>' : `
    <table>
      <thead>
        <tr>
          <th>Closed</th><th>Opened</th><th>Symbol</th><th>Side</th><th>Lots</th>
          <th>Open</th><th>Close</th><th>Exit</th><th>P&amp;L (USD)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">Totals &nbsp; P&amp;L: <span class="${totalPnl >= 0 ? 'pnlpos' : 'pnlneg'}">${totalPnl >= 0 ? '+' : ''}${money(totalPnl)}</span></div>`}
    <div class="footer">SwisDex — for information only. Not tax or legal advice.</div>
  </body></html>`;
}
