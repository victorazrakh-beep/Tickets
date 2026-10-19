import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { getDict } from "@/lib/i18n-server";
import { fill } from "@/lib/i18n";
import { money } from "@/lib/format";
import type { EventRow, Order, Ticket } from "@/lib/types";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = admin();
  const { data: order } = await db.from("ticket_orders").select("*").eq("id", id).single<Order>();
  if (!order) notFound();
  const [{ data: ev }, { data: tickets }, { t }] = await Promise.all([
    db.from("events").select("name, slug").eq("id", order.event_id).single<Pick<EventRow, "name" | "slug">>(),
    db.from("tickets").select("id, token, status, ticket_tiers(name)").eq("order_id", id).returns<(Pick<Ticket, "id" | "token" | "status"> & { ticket_tiers: { name: string } })[]>(),
    getDict(),
  ]);

  const status = order.status;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {status === "pending" && <AutoRefresh />}
      <div className="card p-6 text-center">
        <div className={`mx-auto h-16 w-16 rounded-full grid place-items-center text-3xl ${status === "paid" ? "bg-lime text-lime-ink check-pop" : "bg-surface"}`}>
          {status === "paid" ? "✓" : status === "pending" ? "…" : "✕"}
        </div>
        <h1 className="mt-4 font-display font-extrabold text-2xl">
          {status === "paid" ? t.order_paid : status === "pending" ? t.order_pending : status === "expired" ? t.order_expired : t.order_failed}
        </h1>
        <p className="mt-1 text-sub">{ev?.name}</p>
        <p className="mt-4 text-sm text-sub">{t.order_code}: <b className="text-main tracking-wider">{order.code}</b></p>
        {status === "paid" && <p className="mt-1 text-sm text-sub">{fill(t.order_sent_to, { email: order.email })}</p>}
        <p className="mt-1 text-sm text-sub">{t.total}: {money(order.total)}</p>
      </div>

      {status === "paid" && tickets && (
        <ul className="mt-6 grid gap-3">
          {tickets.map((tk, i) => (
            <li key={tk.id}>
              <Link href={`/t/${tk.token}`} className="card p-4 flex items-center justify-between hover:border-line-strong">
                <span>{fill(t.ticket_of, { i: i + 1, n: tickets.length })} · {tk.ticket_tiers.name}</span>
                <span className="text-sub">QR →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(status === "failed" || status === "expired") && ev && (
        <Link href={`/e/${ev.slug}`} className="btn-lime w-full mt-6">{t.try_again}</Link>
      )}
    </div>
  );
}
