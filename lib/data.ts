import "server-only";
import { admin } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/env";
import type { EventRow, EventWithTiers, Tier } from "@/lib/types";

const LIST_COLS = "id, slug, name, starts_at, date_tbd, time_tbd, location, cover_url, featured, status, ticket_tiers(price, hidden, quantity, sold)";

export type EventCard = Pick<EventRow, "id" | "slug" | "name" | "starts_at" | "date_tbd" | "time_tbd" | "location" | "cover_url" | "featured" | "status"> & {
  ticket_tiers: Pick<Tier, "price" | "hidden" | "quantity" | "sold">[];
};

export async function listPublicEvents(opts: { q?: string; from?: Date; to?: Date; featured?: boolean; limit?: number } = {}) {
  if (!isConfigured()) return [];
  let query = admin().from("events").select(LIST_COLS).eq("status", "live").eq("is_private", false)
    .or(`starts_at.gte.${new Date(Date.now() - 6 * 3600_000).toISOString()},date_tbd.eq.true`)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (opts.featured) query = query.eq("featured", true);
  if (opts.from) query = query.gte("starts_at", opts.from.toISOString());
  if (opts.to) query = query.lt("starts_at", opts.to.toISOString());
  if (opts.q) {
    const q = opts.q.replace(/[%,()]/g, " ").trim();
    query = query.or(`name.ilike.%${q}%,location.ilike.%${q}%`);
  }
  const { data, error } = await query.limit(opts.limit ?? 60).returns<EventCard[]>();
  if (error) console.error(error);
  return data ?? [];
}

export function priceFrom(tiers: EventCard["ticket_tiers"]) {
  const visible = tiers.filter((t) => !t.hidden);
  if (!visible.length) return null;
  return Math.min(...visible.map((t) => Number(t.price)));
}

export const isSoldOut = (tiers: EventCard["ticket_tiers"]) =>
  tiers.filter((t) => !t.hidden).every((t) => t.sold >= t.quantity);

export async function getEventBySlug(slug: string) {
  if (!isConfigured()) return null;
  const { data } = await admin().from("events")
    .select("*, ticket_tiers(*), organizer:profiles(name, organizer_name, avatar_url, organizer_verified)")
    .eq("slug", slug).single<EventWithTiers>();
  if (!data) return null;
  data.ticket_tiers.sort((a, b) => a.sort_order - b.sort_order);
  return data;
}

// Remove secrets before sending data to the browser.
export const publicTier = ({ unlock_code: _unlock, ...t }: Tier) => t;

export async function getFee(ev: Pick<EventRow, "fee_pct" | "fee_flat">) {
  const { data } = await admin().from("settings").select("fee_pct, fee_flat").single<{ fee_pct: number; fee_flat: number }>();
  return { pct: Number(ev.fee_pct ?? data?.fee_pct ?? 9), flat: Number(ev.fee_flat ?? data?.fee_flat ?? 1) };
}

export function slugify(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "evento";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
