import type { Tier } from "@/lib/types";

// Mirrors create_order() in SQL so the buyer sees the same total before paying.
// The database is the source of truth for the amount actually charged.
export const DEFAULT_FEE = { pct: 9, flat: 1 };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function quote(
  lines: { tier: Pick<Tier, "price" | "deposit_mode" | "deposit_pct" | "variable_pricing">; quantity: number; amount?: number }[],
  fee: { pct: number; flat: number } = DEFAULT_FEE,
) {
  let subtotal = 0, feeTotal = 0, dueTickets = 0, count = 0;
  for (const { tier, quantity, amount } of lines) {
    if (quantity <= 0) continue;
    const unit = tier.variable_pricing ? Math.max(Number(tier.price), amount ?? 0) : Number(tier.price);
    const line = unit * quantity;
    subtotal += line;
    if (unit > 0) feeTotal += quantity * (r2((unit * fee.pct) / 100) + fee.flat);
    dueTickets += tier.deposit_mode === "deposit" && tier.deposit_pct ? r2((line * Number(tier.deposit_pct)) / 100) : line;
    count += quantity;
  }
  if (subtotal === 0) feeTotal = 0;
  return { subtotal: r2(subtotal), fee: r2(feeTotal), total: r2(subtotal + feeTotal), dueNow: r2(dueTickets + feeTotal), count };
}
