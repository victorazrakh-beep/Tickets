import Link from "next/link";
import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { getDict } from "@/lib/i18n-server";
import { eventDate, money } from "@/lib/format";
import type { EventRow, Tier } from "@/lib/types";
import { STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "Mis eventos", robots: { index: false } };

export default async function MyEvents() {
  const profile = await requireProfile("/mis-eventos");
  const { lang, t } = await getDict();
  const { data: events } = await admin().from("events").select("*, ticket_tiers(price, sold)")
    .eq("organizer_id", profile.id).order("created_at", { ascending: false })
    .returns<(EventRow & { ticket_tiers: Pick<Tier, "price" | "sold">[] })[]>();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display font-extrabold text-3xl">{t.nav_my_events}</h1>
        <Link href="/crear" className="btn-lime">{t.nav_create}</Link>
      </div>
      {events?.length ? (
        <ul className="mt-6 grid gap-3">
          {events.map((ev) => {
            const sold = ev.ticket_tiers.reduce((s, x) => s + x.sold, 0);
            const gross = ev.ticket_tiers.reduce((s, x) => s + x.sold * Number(x.price), 0);
            return (
              <li key={ev.id}>
                <Link href={`/manage/${ev.id}`} className="card p-3 flex items-center gap-4 hover:border-line-strong">
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-surface overflow-hidden">{ev.cover_url && <img src={ev.cover_url} alt="" className="h-full w-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{ev.name}</div>
                    <div className="text-sm text-sub">{eventDate(ev.starts_at, lang, { tbd: ev.date_tbd })} · {sold} {t.tickets.toLowerCase()} · {money(gross)}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ev.status === "live" ? "bg-lime text-lime-ink" : ev.status === "rejected" ? "bg-danger text-white" : "bg-surface text-sub"}`}>
                    {STATUS[ev.status][lang]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sub">{lang === "es" ? "Aún no has creado eventos." : "You haven't created any events yet."}</p>
      )}
    </div>
  );
}
