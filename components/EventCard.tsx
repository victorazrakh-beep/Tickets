import Link from "next/link";
import { dateParts, eventTime, moneyShort } from "@/lib/format";
import { isSoldOut, priceFrom, type EventCard as Card } from "@/lib/data";
import type { Dict, Lang } from "@/lib/i18n";

export function EventCard({ ev, lang, t }: { ev: Card; lang: Lang; t: Dict }) {
  const price = priceFrom(ev.ticket_tiers);
  const soldOut = isSoldOut(ev.ticket_tiers);
  const { day, month } = dateParts(ev.date_tbd ? null : ev.starts_at, lang);
  return (
    <Link href={`/e/${ev.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface border border-line">
        {ev.cover_url && (
          <img src={ev.cover_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        <div className="absolute left-3 top-3 rounded-xl bg-bg/85 backdrop-blur px-2.5 py-1.5 text-center leading-none">
          <div className="text-lg font-display font-extrabold">{day}</div>
          <div className="text-[10px] uppercase tracking-wide text-sub">{month}</div>
        </div>
        {soldOut && <span className="absolute right-3 top-3 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-white">{t.sold_out}</span>}
      </div>
      <div className="mt-3">
        <h3 className="font-display font-bold leading-snug line-clamp-2 group-hover:underline underline-offset-4">{ev.name}</h3>
        <p className="mt-1 text-sm text-sub line-clamp-1">
          {eventTime(ev.starts_at, lang, { tbd: ev.time_tbd || ev.date_tbd })} · {ev.location}
        </p>
        {price !== null && (
          <p className="mt-1 text-sm font-semibold text-lime-text">{price === 0 ? t.free : `${t.from} ${moneyShort(price)}`}</p>
        )}
      </div>
    </Link>
  );
}
