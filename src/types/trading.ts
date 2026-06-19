// Mirrors swisdesk/backend/packages/common/src/schemas/trading.py
// (PlaceOrderRequest, OrderResponse, PositionResponse, etc.).

export type Side = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected' | 'expired';
export type PositionStatus = 'open' | 'closed';

export interface PlaceOrderPayload {
  account_id: string;
  symbol: string;
  side: Side;
  order_type: OrderType;
  lots: number;
  /** Limit / stop / stop_limit trigger price. Omitted for market. */
  price?: number;
  stop_loss?: number;
  take_profit?: number;
  /** Stop-limit only: the limit price the order converts to once the
   *  stop trigger fires. */
  stop_limit_price?: number;
  /** EA tag — backend stores as integer alongside the order. NOT used
   *  for idempotency by the backend (no order dedup mechanism). We
   *  generate one per submit for traceability anyway. */
  magic_number?: number;
  comment?: string;
}

export interface OrderResponse {
  id: string;
  account_id: string;
  symbol: string;
  order_type: OrderType;
  side: Side;
  status: OrderStatus;
  lots: number;
  price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  filled_price?: number | null;
  commission: number;
  swap: number;
  comment?: string | null;
  created_at: string;
  /** Set when a market order immediately opened a position — used to attach
   *  trade insurance via POST /insurance/activate. */
  position_id?: string | null;
}

export interface Position {
  id: string;
  account_id: string;
  symbol: string;
  side: Side;
  status: PositionStatus;
  lots: number;
  open_price: number;
  current_price?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  swap: number;
  commission: number;
  profit: number;
  trade_type?: string;
  created_at: string;
}

export interface ModifyPositionPayload {
  stop_loss?: number | null;
  take_profit?: number | null;
}

export interface ClosePositionPayload {
  /** Partial close in lots; omit to close the whole position. */
  lots?: number;
}

export interface BulkClosePayload {
  account_id: string;
  filter: 'all' | 'profit' | 'loss' | 'symbol';
  symbols?: string[];
}

/** Generate a deterministic-feeling 31-bit positive int for use as
 *  PlaceOrderPayload.magic_number. Backend has NO order idempotency
 *  mechanism — this is purely a client-side traceability tag. */
export function generateMagicNumber(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) & 0x7fffffff;
}
