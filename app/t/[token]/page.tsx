import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { getDict } from "@/lib/i18n-server";
import { fill } from "@/lib/i18n";
import { eventDate, eventTime } from "@/lib/format";
import { qrSvg } from "@/lib/qr";
import type { EventRow, Ticket } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrada", robots: { index: false } };

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: tk } = await admin().from("tickets")
    .select("*, ticket_tiers(name), events(name, slug, starts_at, date_tbd, time_tbd, location, cover_url)")
    .eq("token", token).single<Ticket & { ticket_tiers: { name: string }; events: Pick<EventRow, "name" | "slug" | "starts_at" | "date_tbd" | "time_tbd" | "location" | "cover_url"> }>();
  if (!tk) notFound();
  const { lang, t } = await getDict();
  const svg = await qrSvg(tk.token);
  const ev = tk.events;
  const statusLabel = { valid: t.ticket_valid, used: t.ticket_used, refunded: t.ticket_refunded, void: t.ticket_void }[tk.status];

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <div className="overflow-hidden rounded-3xl bg-card border border-line">
        {ev.cover_url && <img src={ev.cover_url} alt="" className="h-36 w-full object-cover" />}
        <div className="p-5">
          <h1 className="font-display font-extrabold text-xl leading-tight">{ev.name}</h1>
          <p className="text-sm text-sub mt-1">
            {eventDate(ev.starts_at, lang, { tbd: ev.date_tbd })} · {eventTime(ev.starts_at, lang, { tbd: ev.time_tbd || ev.date_tbd })} · {ev.location}
          </p>
        </div>
        <div className="relative border-t border-dashed border-line-strong mx-5" />
        <div className="p-5 text-center">
          <div className={`mx-auto w-60 rounded-2xl bg-white p-3 ${tk.status !== "valid" ? "opacity-30" : ""}`} dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-3 font-semibold">{tk.ticket_tiers.name}{tk.admits > 1 && ` · ${fill(t.admits, { n: tk.admits })}`}</p>
          {tk.attendee_name && <p className="text-sm text-sub">{tk.attendee_name}</p>}
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${tk.status === "valid" ? "bg-lime text-lime-ink" : "bg-surface text-sub"}`}>{statusLabel}</span>
          {tk.status === "valid" && <p className="mt-3 text-xs text-muted">{t.show_at_door}</p>}
        </div>
      </div>
    </div>
  );
}
