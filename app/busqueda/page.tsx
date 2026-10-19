import Link from "next/link";
import type { Metadata } from "next";
import { EventCard } from "@/components/EventCard";
import { listPublicEvents } from "@/lib/data";
import { getDict } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Eventos en Panamá", description: "Fiestas, conciertos y eventos en Panamá. Filtra por fecha y compra tus entradas." };

// Date ranges in Panama time (UTC-5).
function range(when?: string): { from?: Date; to?: Date } {
  const now = new Date(Date.now() - 5 * 3600_000);
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const at = (d: Date, days: number) => new Date(d.getTime() + days * 86400_000 + 5 * 3600_000);
  if (when === "hoy") return { from: at(day, 0), to: at(day, 1) };
  if (when === "finde") {
    const dow = day.getUTCDay(); // 0 = Sunday … 6 = Saturday
    const inWeekend = dow === 0 || dow >= 5;
    const toMonday = dow === 0 ? 1 : 8 - dow;
    return { from: at(day, inWeekend ? 0 : 5 - dow), to: at(day, toMonday) };
  }
  if (when === "mes") return { from: at(day, 0), to: at(day, 31) };
  return {};
}

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string; when?: string }> }) {
  const { q, when } = await searchParams;
  const { lang, t } = await getDict();
  const events = await listPublicEvents({ q, ...range(when) });
  const filters = [["", t.search_all], ["hoy", t.search_today], ["finde", t.search_weekend], ["mes", t.search_month]] as const;
  const href = (w: string) => `/busqueda?${new URLSearchParams({ ...(q ? { q } : {}), ...(w ? { when: w } : {}) })}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl md:text-4xl">{t.search_title}</h1>
      <form className="mt-6 flex gap-2" action="/busqueda">
        <input name="q" defaultValue={q} placeholder={t.search_placeholder} className="input max-w-md" />
        {when && <input type="hidden" name="when" value={when} />}
        <button className="btn-cta">{t.find}</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map(([w, label]) => (
          <Link key={w} href={href(w)} className={(when ?? "") === w ? "chip-on" : "chip"}>{label}</Link>
        ))}
      </div>
      {events.length ? (
        <div className="mt-8 grid gap-6 grid-cols-2 md:grid-cols-4">
          {events.map((ev) => <EventCard key={ev.id} ev={ev} lang={lang} t={t} />)}
        </div>
      ) : (
        <p className="mt-10 text-sub">{t.search_none}</p>
      )}
    </div>
  );
}
