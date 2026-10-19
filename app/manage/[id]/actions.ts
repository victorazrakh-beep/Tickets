"use server";
import { revalidatePath } from "next/cache";
import { admin } from "@/lib/supabase/admin";
import { requireEventManager } from "@/lib/auth";
import { hashPin } from "@/lib/scanner-session";
import { fromPanamaInput } from "@/lib/format";

const done = (id: string) => revalidatePath(`/manage/${id}`);
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string, d = 0) => { const n = Number(fd.get(k)); return Number.isFinite(n) && fd.get(k) !== "" ? n : d; };
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

// ── Ticket tiers ──
export async function saveTier(eventId: string, fd: FormData) {
  await requireEventManager(eventId);
  const db = admin();
  const id = str(fd, "id");
  const row = {
    name: str(fd, "name").slice(0, 80) || "General",
    description: str(fd, "description").slice(0, 300) || null,
    tier_type: fd.get("tier_type") === "table" ? "table" : "ticket",
    price: Math.max(0, num(fd, "price")),
    quantity: Math.max(0, Math.floor(num(fd, "quantity", 1))),
    admits: Math.max(1, Math.floor(num(fd, "admits", 1))),
    min_per_order: Math.max(1, Math.floor(num(fd, "min_per_order", 1))),
    max_per_order: Math.max(1, Math.floor(num(fd, "max_per_order", 10))),
    sales_start: fromPanamaInput(str(fd, "sales_start")),
    sales_end: fromPanamaInput(str(fd, "sales_end")),
    hidden: bool(fd, "hidden"),
    unlock_code: str(fd, "unlock_code").toUpperCase() || null,
    show_remaining: bool(fd, "show_remaining"),
    sequential: bool(fd, "sequential"),
    variable_pricing: bool(fd, "variable_pricing"),
    deposit_mode: num(fd, "deposit_pct") > 0 ? "deposit" : "full",
    deposit_pct: num(fd, "deposit_pct") > 0 ? Math.min(99, num(fd, "deposit_pct")) : null,
  };
  if (id) {
    // Never allow quantity below what is already sold or held.
    const { data: cur } = await db.from("ticket_tiers").select("sold, reserved").eq("id", id).eq("event_id", eventId).single<{ sold: number; reserved: number }>();
    if (!cur) return;
    row.quantity = Math.max(row.quantity, cur.sold + cur.reserved);
    await db.from("ticket_tiers").update(row).eq("id", id).eq("event_id", eventId);
  } else {
    const { count } = await db.from("ticket_tiers").select("id", { count: "exact", head: true }).eq("event_id", eventId);
    await db.from("ticket_tiers").insert({ ...row, event_id: eventId, sort_order: count ?? 0 });
  }
  done(eventId);
}

export async function deleteTier(eventId: string, tierId: string) {
  await requireEventManager(eventId);
  const db = admin();
  const { data: t } = await db.from("ticket_tiers").select("sold, reserved").eq("id", tierId).eq("event_id", eventId).single<{ sold: number; reserved: number }>();
  if (!t) return;
  // Tiers with sales are closed instead of deleted so tickets stay valid.
  if (t.sold + t.reserved > 0) await db.from("ticket_tiers").update({ quantity: t.sold + t.reserved, hidden: true }).eq("id", tierId);
  else await db.from("ticket_tiers").delete().eq("id", tierId);
  done(eventId);
}

export async function moveTier(eventId: string, tierId: string, dir: -1 | 1) {
  await requireEventManager(eventId);
  const db = admin();
  const { data: tiers } = await db.from("ticket_tiers").select("id").eq("event_id", eventId).order("sort_order").returns<{ id: string }[]>();
  if (!tiers) return;
  const i = tiers.findIndex((t) => t.id === tierId), j = i + dir;
  if (i < 0 || j < 0 || j >= tiers.length) return;
  [tiers[i], tiers[j]] = [tiers[j], tiers[i]];
  await Promise.all(tiers.map((t, k) => db.from("ticket_tiers").update({ sort_order: k }).eq("id", t.id)));
  done(eventId);
}

// ── Promo codes & promoters ──
export async function addPromo(eventId: string, fd: FormData) {
  await requireEventManager(eventId);
  const code = str(fd, "code").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  const value = num(fd, "value");
  if (!code || value <= 0) return;
  await admin().from("promo_codes").insert({
    event_id: eventId, code, value,
    discount_type: fd.get("discount_type") === "fixed" ? "fixed" : "percent",
    max_uses: num(fd, "max_uses") > 0 ? Math.floor(num(fd, "max_uses")) : null,
  });
  done(eventId);
}

export async function togglePromo(eventId: string, id: string, active: boolean) {
  await requireEventManager(eventId);
  await admin().from("promo_codes").update({ active }).eq("id", id).eq("event_id", eventId);
  done(eventId);
}

export async function addPromoter(eventId: string, fd: FormData) {
  await requireEventManager(eventId);
  const name = str(fd, "name").slice(0, 60);
  const code = (str(fd, "code") || name).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (!name || !code) return;
  await admin().from("promoters").insert({ event_id: eventId, name, code });
  done(eventId);
}

export async function deletePromoter(eventId: string, id: string) {
  await requireEventManager(eventId);
  await admin().from("promoters").delete().eq("id", id).eq("event_id", eventId);
  done(eventId);
}

// ── Door staff ──
export async function addScanner(eventId: string, fd: FormData) {
  await requireEventManager(eventId);
  const name = str(fd, "name").slice(0, 60);
  const pin = str(fd, "pin");
  if (!name || !/^\d{5}$/.test(pin)) return;
  await admin().from("scanners").insert({ event_id: eventId, name, pin_hash: hashPin(eventId, pin) });
  done(eventId);
}

export async function deleteScanner(eventId: string, id: string) {
  await requireEventManager(eventId);
  await admin().from("scanners").delete().eq("id", id).eq("event_id", eventId);
  done(eventId);
}

// ── Orders, tickets, payouts, status ──
export async function voidTicket(eventId: string, ticketId: string) {
  await requireEventManager(eventId);
  const db = admin();
  const { data: tk } = await db.from("tickets").select("event_id, ticket_orders(payment_method)").eq("id", ticketId)
    .single<{ event_id: string; ticket_orders: { payment_method: string } }>();
  if (!tk || tk.event_id !== eventId) return;
  // Card refunds go through the payment provider once enabled; until then the ticket is voided.
  await db.rpc("void_ticket", { p_ticket_id: ticketId, p_status: tk.ticket_orders.payment_method === "card" ? "refunded" : "void" });
  done(eventId);
}

export async function requestPayout(eventId: string, amount: number) {
  await requireEventManager(eventId);
  if (amount <= 0) return;
  await admin().from("payouts").insert({ event_id: eventId, amount });
  done(eventId);
}

export async function setStatus(eventId: string, status: "closed" | "live" | "cancelled") {
  const { event, profile } = await requireEventManager(eventId);
  // Organizers can pause/resume sales on approved events; only admins publish new ones.
  const allowed = profile.role === "admin" || (event.status === "live" && status !== "live") || (event.status === "closed" && status === "live");
  if (!allowed) return;
  await admin().from("events").update({ status }).eq("id", eventId);
  done(eventId);
}
