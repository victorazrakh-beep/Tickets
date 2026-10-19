import { notFound, redirect } from "next/navigation";
import { admin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getDict } from "@/lib/i18n-server";
import { money } from "@/lib/format";
import { sendOrderConfirmation } from "@/lib/email";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

// Simulated payment gateway, only reachable when PAYMENTS_MOCK=true.
export default async function MockPay({ params }: { params: Promise<{ id: string }> }) {
  if (!env.payments.mock) notFound();
  const { id } = await params;
  const { data: order } = await admin().from("ticket_orders").select("*").eq("id", id).single<Order>();
  if (!order || order.payment_method !== "mock") notFound();
  if (order.status !== "pending") redirect(`/pedido/${id}`);
  const { t } = await getDict();

  async function approve() {
    "use server";
    const { error } = await admin().rpc("confirm_order", { p_order_id: id, p_provider: "mock", p_ref: `mock_${Date.now()}` });
    if (!error) await sendOrderConfirmation(id);
    redirect(`/pedido/${id}`);
  }
  async function decline() {
    "use server";
    await admin().rpc("fail_order", { p_order_id: id });
    redirect(`/pedido/${id}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-6">
        <span className="inline-block rounded-full bg-lime px-3 py-1 text-xs font-bold text-lime-ink">TEST</span>
        <h1 className="mt-3 font-display font-extrabold text-2xl">{t.mock_title}</h1>
        <p className="mt-2 text-sub text-sm">{t.mock_body}</p>
        <p className="mt-6 text-3xl font-display font-extrabold">{money(order.amount_due_now)}</p>
        <p className="text-sm text-sub">{order.email} · {order.code}</p>
        <form className="mt-6 grid gap-2">
          <button formAction={approve} className="btn-lime">{t.mock_approve}</button>
          <button formAction={decline} className="btn-ghost">{t.mock_decline}</button>
        </form>
      </div>
    </div>
  );
}
