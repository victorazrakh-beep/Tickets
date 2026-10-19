export type EventStatus = "draft" | "pending_review" | "live" | "closed" | "cancelled" | "rejected";

export interface Tier {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  tier_type: "ticket" | "table";
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  reserved: number;
  admits: number;
  min_per_order: number;
  max_per_order: number;
  sales_start: string | null;
  sales_end: string | null;
  sort_order: number;
  hidden: boolean;
  unlock_code?: string | null;
  show_remaining: boolean;
  sequential: boolean;
  deposit_mode: "full" | "deposit";
  deposit_pct: number | null;
  variable_pricing: boolean;
  requires_approval: boolean;
}

export interface EventRow {
  id: string;
  slug: string;
  organizer_id: string | null;
  organizer_display_name: string | null;
  name: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  date_tbd: boolean;
  time_tbd: boolean;
  location: string;
  address: string | null;
  map_url: string | null;
  cover_url: string | null;
  gallery_urls: string[];
  capacity: number;
  status: EventStatus;
  review_note: string | null;
  lineup: { name: string; time?: string }[];
  links: { label: string; url: string }[];
  music_url: string | null;
  video_url: string | null;
  reglamento: string | null;
  whatsapp: string | null;
  yappy_phone: string | null;
  age_limit: number | null;
  requires_cedula: boolean;
  require_phone: boolean;
  require_gender: boolean;
  require_dob: boolean;
  collect_ruc: boolean;
  allow_refunds: boolean;
  featured: boolean;
  is_private: boolean;
  access_passwords?: string[];
  fee_pct: number | null;
  fee_flat: number | null;
  scan_token?: string | null;
  created_at: string;
}

export interface EventWithTiers extends EventRow {
  ticket_tiers: Tier[];
  organizer?: { name: string | null; organizer_name: string | null; avatar_url: string | null; organizer_verified: boolean } | null;
}

export interface Order {
  id: string;
  code: string;
  event_id: string;
  buyer_id: string | null;
  email: string;
  name: string;
  phone: string | null;
  payment_method: "card" | "yappy" | "free" | "venue" | "mock";
  status: "pending" | "paid" | "failed" | "expired" | "refunded" | "cancelled";
  subtotal: number;
  discount: number;
  fee: number;
  total: number;
  amount_due_now: number;
  provider_ref: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  token: string;
  short_code: string;
  order_id: string;
  event_id: string;
  tier_id: string;
  attendee_name: string | null;
  admits: number;
  status: "valid" | "used" | "refunded" | "void";
  checked_in_at: string | null;
}
