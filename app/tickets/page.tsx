import Link from "next/link";
import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n-server";
import { eventDate } from "@/lib/format";
import type { EventRow, Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis entradas", robots: { index: false } };

type Row = Pick<Ticket, "id" | "token" | "status"> & {
  ticket_tiers: { name: string };
  events: Pick<EventRow, "name" | "starts_at" | "date_tbd" | "cover_url">;
};
const COLS = "id, token, status, ticket_tiers(name), events(name, starts_at, date_tbd, cover_url)";

export default async function MyTickets({ searchParams }: { searchParams: Promise<{ email?: string; code?: string }> }) {
  const { email, code } = await searchParams;
  const [{ lang, t }, profile] = await Promise.all([getDict(), getProfile()]);
  const db = admin();
  let rows: Row[] = [];
  let lookedUp = false;

  if (email && code) {
    lookedUp = true;
    const { data: order } = await db.from("ticket_orders").select("id").eq("email", email.trim().toLowerCase())
      .eq("code", code.trim().toUpperCase()).eq("status", "paid").maybeSingle<{ id: string }>();
    if (order) rows = (await db.from("tickets").select(COLS).eq("order_id", order.id).returns<Row[]>()).data ?? [];
  } else if (profile) {
    // Logged-in buyers see orders placed with their account or their email.
    const [byAccount, byEmail] = await Promise.all([
      db.from("ticket_orders").select("id").eq("status", "paid").eq("buyer_id", profile.id).returns<{ id: string }[]>(),
      db.from("ticket_orders").select("id").eq("status", "paid").eq("email", (profile.email ?? "").toLowerCase()).returns<{ id: string }[]>(),
    ]);
    const ids = [...new Set([...(byAccount.data ?? []), ...(byEmail.data ?? [])].map((o) => o.id))];
    if (ids.length) rows = (await db.from("tickets").select(COLS).in("order_id", ids).order("created_at", { ascending: false }).returns<Row[]>()).data ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl">{t.my_tickets}</h1>

      {rows.length > 0 ? (
        <ul className="mt-6 grid gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/t/${r.token}`} className="card flex items-center gap-4 p-3 hover:border-line-strong">
                {r.events.cover_url && <img src={r.events.cover_url} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.events.name}</div>
                  <div className="text-sm text-sub">{eventDate(r.events.starts_at, lang, { tbd: r.events.date_tbd })} · {r.ticket_tiers.name}</div>
                </div>
                <span className="text-xs text-sub">{r.status === "valid" ? "QR →" : r.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sub">{lookedUp ? t.not_found : t.my_tickets_empty}</p>
      )}

      <form className="card mt-8 p-5 grid gap-3" action="/tickets">
        <h2 className="font-display font-bold text-lg">{t.find_tickets}</h2>
        <p className="text-sm text-sub -mt-2">{t.find_tickets_body}</p>
        <input className="input" type="email" name="email" placeholder={t.email} defaultValue={email} required />
        <input className="input uppercase" name="code" placeholder={t.order_code} defaultValue={code} required />
        <button className="btn-cta">{t.find}</button>
        {!profile && <Link href="/login?next=/tickets" className="text-sm text-sub text-center">{t.login_to_see_all}</Link>}
      </form>
    </div>
  );
}
