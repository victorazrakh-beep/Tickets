"use server";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { getProvider, methodToProvider, enabledMethods } from "@/lib/payments";
import { sendOrderConfirmation } from "@/lib/email";
import { publicTier } from "@/lib/data";
import { grantEventAccess, hasEventAccess, needsPassword, passwordMatches } from "@/lib/event-access";
import type { EventRow, Order, Tier } from "@/lib/types";

// Private events: check the shared password and remember access in this browser.
export async function unlockEvent(eventId: string, password: string): Promise<{ ok: boolean }> {
  const { data: ev } = await admin().from("events").select("id, is_private, access_passwords").eq("id", eventId)
    .single<{ id: string; is_private: boolean; access_passwords: string[] }>();
  if (!ev || !passwordMatches(ev, password)) return { ok: false };
  await grantEventAccess(ev.id);
  return { ok: true };
}

export type CodeResult =
  | { type: "unlock"; tiers: Omit<Tier, "unlock_code">[] }
  | { type: "promo"; code: string; discount_type: "percent" | "fixed"; value: number; tier_ids: string[] | null }
  | { type: "invalid" };

// One code box handles both hidden-tier unlock codes and discount codes.
export async function checkCode(eventId: string, raw: string): Promise<CodeResult> {
  const code = raw.trim();
  if (!code) return { type: "invalid" };
  const db = admin();
  const { data: tiers } = await db.from("ticket_tiers").select("*").eq("event_id", eventId).eq("hidden", true)
    .ilike("unlock_code", code).returns<Tier[]>();
  if (tiers?.length) return { type: "unlock", tiers: tiers.map(publicTier) };
  const { data: promo } = await db.from("promo_codes").select("*").eq("event_id", eventId).eq("active", true)
    .ilike("code", code).maybeSingle<{ code: string; discount_type: "percent" | "fixed"; value: number; tier_ids: string[] | null; max_uses: number | null; used: number }>();
  if (promo && (promo.max_uses === null || promo.used < promo.max_uses)) {
    return { type: "promo", code: promo.code, discount_type: promo.discount_type, value: Number(promo.value), tier_ids: promo.tier_ids };
  }
  return { type: "invalid" };
}

const schema = z.object({
  event_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional(),
  cedula: z.string().trim().max(30).optional(),
  gender: z.enum(["f", "m", "o"]).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ruc: z.string().trim().max(40).optional(),
  payment_method: z.enum(["card", "yappy", "free", "mock"]),
  promo_code: z.string().trim().max(40).optional(),
  promoter_code: z.string().trim().max(40).optional(),
  unlock_code: z.string().trim().max(40).optional(),
  items: z.array(z.object({ tier_id: z.string().uuid(), quantity: z.number().int().min(0).max(50), amount: z.number().min(0).optional() })).min(1),
});

export type CheckoutInput = z.infer<typeof schema>;

const ERRORS: Record<string, { es: string; en: string }> = {
  SOLD_OUT: { es: "Ya no quedan suficientes entradas de ese tipo.", en: "Not enough tickets of that type left." },
  PROMO_INVALID: { es: "Ese código no es válido para este evento.", en: "That code isn't valid for this event." },
  TIER_NOT_ON_SALE: { es: "Ese tipo de entrada no está a la venta ahora.", en: "That ticket type isn't on sale right now." },
  QUANTITY_OUT_OF_RANGE: { es: "Revisa la cantidad de entradas.", en: "Check the number of tickets." },
  EVENT_NOT_ON_SALE: { es: "Este evento no está a la venta.", en: "This event isn't on sale." },
  EMPTY_ORDER: { es: "Selecciona al menos una entrada.", en: "Select at least one ticket." },
  TIER_REQUIRES_APPROVAL: { es: "Ese tipo de entrada requiere aprobación del organizador.", en: "That ticket type needs organizer approval." },
};

export async function checkout(input: CheckoutInput, lang: "es" | "en"): Promise<{ url: string } | { error: string }> {
  const fail = (key: string) => ({ error: (ERRORS[key] ?? { es: "Algo salió mal. Intenta de nuevo.", en: "Something went wrong. Please try again." })[lang] });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: lang === "es" ? "Revisa los campos marcados." : "Check the highlighted fields." };
  const p = parsed.data;

  const db = admin();
  const { data: ev } = await db.from("events").select("*").eq("id", p.event_id).single<EventRow>();
  if (!ev) return fail("EVENT_NOT_ON_SALE");
  if (needsPassword(ev) && !(await hasEventAccess(ev.id))) return fail("EVENT_NOT_ON_SALE");
  const missing = (ev.require_phone && !p.phone) || (ev.requires_cedula && !p.cedula) || (ev.require_gender && !p.gender)
    || (ev.require_dob && !p.dob) || (ev.collect_ruc && !p.ruc);
  if (missing) return { error: lang === "es" ? "Completa los datos requeridos por el evento." : "Fill in the details this event requires." };

  const enabled = enabledMethods();
  if (p.payment_method !== "free" && !enabled[p.payment_method]) {
    return { error: lang === "es" ? "Ese método de pago no está disponible." : "That payment method isn't available." };
  }

  const user = await getUser();
  const { data: order, error } = await db.rpc("create_order", { p: { ...p, buyer_id: user?.id ?? null } }).single<Order>();
  if (error || !order) {
    const key = Object.keys(ERRORS).find((k) => error?.message?.includes(k)) ?? "";
    if (!key) console.error("[checkout]", error);
    return fail(key);
  }

  if (p.payment_method === "free") {
    await db.rpc("confirm_order", { p_order_id: order.id, p_provider: "free", p_ref: null });
    await sendOrderConfirmation(order.id);
    return { url: `/pedido/${order.id}` };
  }

  try {
    const start = await getProvider(methodToProvider[p.payment_method]).start(order, { phone: p.phone });
    if (start.kind === "redirect") return { url: start.url };
    // Stripe / Yappy client flows are rendered on the order page once enabled.
    return { url: `/pedido/${order.id}/pagar` };
  } catch (e) {
    console.error("[checkout] provider", e);
    await db.rpc("fail_order", { p_order_id: order.id });
    return { error: lang === "es" ? "No pudimos iniciar el pago. Intenta otro método." : "We couldn't start the payment. Try another method." };
  }
}
