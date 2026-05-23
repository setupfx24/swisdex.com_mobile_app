export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  /** Optional structured payload (deeplink target, e.g. position_id). */
  meta?: Record<string, unknown>;
}

export interface Banner {
  id: string;
  title: string;
  body: string;
  image_url?: string | null;
  link_url?: string | null;
  variant?: 'info' | 'warning' | 'promo' | 'success';
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category?: string;
  priority?: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
  last_message?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender: 'user' | 'agent';
  body: string;
  created_at: string;
}
