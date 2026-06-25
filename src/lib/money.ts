// Cent-account money display — mirrors the web trader's lib/wallet/centDisplay.ts.
// Backend stores ALL amounts in USD; a "Cent" account (account_group.is_cent_account)
// is shown to the trader in cents: value × 100 with a ¢ symbol. Standard accounts
// stay in USD ($). Prices and lot sizes are NOT affected — only money figures.

export const CENT_SYMBOL = '¢';
export const CENT_PER_USD = 100;

interface CentAware {
  is_cent_account?: boolean | null;
  account_group?: { is_cent_account?: boolean | null; name?: string | null } | null;
}

/** True when the account (or its group) is a cent account. Detects via the
 *  backend `is_cent_account` flag, OR falls back to the group name containing
 *  "cent" — some cent groups are named "CENT" in the DB without the flag set,
 *  so name-matching keeps the ¢ display working regardless of backend state. */
export function isCentAccount(acc?: CentAware | null): boolean {
  if (!acc) return false;
  if (acc.is_cent_account || acc.account_group?.is_cent_account) return true;
  const name = acc.account_group?.name;
  return typeof name === 'string' && /cent/i.test(name);
}

interface FmtOpts {
  decimals?: number;
  /** 'always' → leading + on positives (P&L view). */
  signDisplay?: 'auto' | 'always';
}

/** Format a USD amount for display. Cent account → ¢ with value ×100;
 *  standard → $ USD. Mirrors web fmtAccountMoney(usd, isCent). */
export function fmtAccountMoney(usd: number | null | undefined, isCent: boolean, opts: FmtOpts = {}): string {
  const decimals = opts.decimals ?? 2;
  const n = Number(usd);
  if (!Number.isFinite(n)) return isCent ? `${CENT_SYMBOL}0.00` : '$0.00';
  if (isCent) {
    const cents = n * CENT_PER_USD;
    const sign = opts.signDisplay === 'always' && cents > 0 ? '+' : '';
    return `${sign}${CENT_SYMBOL}${cents.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: opts.signDisplay,
  });
}

/** Short unit label for a column/suffix: '¢' (cent) or 'USD'. */
export function accountUnit(isCent: boolean): string {
  return isCent ? CENT_SYMBOL : 'USD';
}
