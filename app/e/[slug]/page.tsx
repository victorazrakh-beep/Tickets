import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventBySlug, getFee, publicTier } from "@/lib/data";
import { getDict } from "@/lib/i18n-server";
import { fill } from "@/lib/i18n";
import { getProfile } from "@/lib/auth";
import { enabledMethods } from "@/lib/payments";
import { eventDate, eventTime } from "@/lib/format";
import { env } from "@/lib/env";
import { TicketPanel } from "./TicketPanel";
import { ShareButton } from "./ShareButton";
import { PasswordGate } from "./PasswordGate";
import { hasEventAccess, needsPassword } from "@/lib/event-access";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ ref?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const ev = await getEventBySlug((await params).slug);
  if (!ev) return {};
  if (ev.is_private) return { title: "Evento privado", robots: { index: false, follow: false } };
  const description = ev.description.slice(0, 160);
  return {
    title: ev.name,
    description,
    alternates: { canonical: `/e/${ev.slug}` },
    openGraph: { title: ev.name, description, images: ev.cover_url ? [ev.cover_url] : [] },
    robots: ev.is_private || ev.status !== "live" ? { index: false } : undefined,
  };
}

function embed(url: string | null) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const sp = url.match(/open\.spotify\.com\/(track|album|playlist|artist)\/(\w+)/);
  if (sp) return `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`;
  return null;
}

export default async function EventPage({ params, searchParams }: Params) {
  const [{ slug }, { ref }] = await Promise.all([params, searchParams]);
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();
  const [{ lang, t }, profile] = await Promise.all([getDict(), getProfile()]);
  const canManage = !!profile && (profile.id === ev.organizer_id || profile.role === "admin");
  if (!["live", "closed"].includes(ev.status) && !canManage) notFound();
  if (needsPassword(ev) && !canManage && !(await hasEventAccess(ev.id))) {
    return <PasswordGate eventId={ev.id} name={ev.name} es={lang === "es"} />;
  }

  const fee = await getFee(ev);
  const organizer = ev.organizer?.organizer_name || ev.organizer?.name || ev.organizer_display_name || "Xopa";
  const music = embed(ev.music_url), video = embed(ev.video_url);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Event", name: ev.name, description: ev.description,
    startDate: ev.starts_at, endDate: ev.ends_at, image: ev.cover_url ? [ev.cover_url] : undefined,
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: ev.location, address: ev.address || ev.location },
    organizer: { "@type": "Organization", name: organizer },
    offers: ev.ticket_tiers.filter((x) => !x.hidden).map((x) => ({
      "@type": "Offer", name: x.name, price: Number(x.price), priceCurrency: "USD", url: `${env.siteUrl}/e/${ev.slug}`,
      availability: x.sold >= x.quantity ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {ev.is_private && canManage && (
        <div className="mb-4 rounded-xl border border-line bg-surface p-3 text-sm">
          🔒 {lang === "es" ? "Evento privado: no aparece en búsquedas" : "Private event: hidden from search"}
          {(ev.access_passwords?.length ?? 0) > 0 && (lang === "es" ? " y pide contraseña." : " and asks for a password.")}
        </div>
      )}
      {ev.status !== "live" && (
        <div className="mb-4 rounded-xl border border-line bg-surface p-3 text-sm">
          {lang === "es" ? "Vista previa · estado: " : "Preview · status: "}<b>{ev.status}</b>
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface aspect-[16/10]">
            {ev.cover_url && <img src={ev.cover_url} alt="" className="h-full w-full object-cover" />}
          </div>
          {ev.gallery_urls.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {ev.gallery_urls.map((u) => <img key={u} src={u} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover border border-line" />)}
            </div>
          )}

          <h1 className="mt-6 font-display font-extrabold text-3xl md:text-5xl tracking-tight">{ev.name}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sub">
            <span>{eventDate(ev.starts_at, lang, { tbd: ev.date_tbd })} · {eventTime(ev.starts_at, lang, { tbd: ev.time_tbd || ev.date_tbd })}</span>
            <span>{ev.location}</span>
            {ev.age_limit && <span>{fill(t.age_limit, { n: ev.age_limit })}</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <ShareButton label={t.share} done={t.copied} />
            {ev.starts_at && !ev.date_tbd && <a className="chip" href={`/e/${ev.slug}/calendar.ics`}>{t.add_calendar}</a>}
            {ev.whatsapp && <a className="chip" target="_blank" rel="noopener" href={`https://wa.me/${ev.whatsapp.replace(/\D/g, "")}`}>{t.contact_whatsapp}</a>}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line p-4">
            <div className="h-11 w-11 rounded-full bg-surface border border-line grid place-items-center font-bold overflow-hidden">
              {ev.organizer?.avatar_url ? <img src={ev.organizer.avatar_url} alt="" className="h-full w-full object-cover" /> : organizer.slice(0, 1)}
            </div>
            <div>
              <div className="text-xs text-sub">{t.organizer}</div>
              <div className="font-semibold">{organizer}{ev.organizer?.organizer_verified && <span className="ml-1 text-lime-text">✓</span>}</div>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="font-display font-bold text-xl">{t.about}</h2>
            <p className="mt-3 whitespace-pre-line text-sub leading-relaxed">{ev.description}</p>
          </section>

          {ev.lineup.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display font-bold text-xl">{t.lineup}</h2>
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
                {ev.lineup.map((a, i) => (
                  <li key={i} className="flex justify-between px-4 py-3"><span className="font-semibold">{a.name}</span><span className="text-sub tabular-nums">{a.time}</span></li>
                ))}
              </ul>
            </section>
          )}

          {(music || video) && (
            <section className="mt-8 grid gap-4">
              {music && <iframe title="music" src={music} className="w-full h-[152px] rounded-2xl border-0" allow="encrypted-media" loading="lazy" />}
              {video && <iframe title="video" src={video} className="w-full aspect-video rounded-2xl border-0" allowFullScreen loading="lazy" />}
            </section>
          )}

          <section className="mt-8">
            <h2 className="font-display font-bold text-xl">{t.location}</h2>
            <p className="mt-2 text-sub">{ev.location}{ev.address && ` · ${ev.address}`}</p>
            {ev.map_url && <a className="mt-3 chip" target="_blank" rel="noopener" href={ev.map_url}>{t.open_map} ↗</a>}
          </section>

          {ev.links.length > 0 && (
            <section className="mt-8 flex flex-wrap gap-2">
              {ev.links.map((l) => <a key={l.url} className="chip" target="_blank" rel="noopener" href={l.url}>{l.label} ↗</a>)}
            </section>
          )}

          {ev.reglamento && (
            <section className="mt-8">
              <h2 className="font-display font-bold text-xl">{t.rules}</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-sub">{ev.reglamento}</p>
            </section>
          )}
        </div>

        <aside className="md:sticky md:top-24 self-start">
          <TicketPanel
            eventId={ev.id}
            tiers={ev.ticket_tiers.map(publicTier)}
            fee={fee}
            methods={enabledMethods()}
            requirements={{ phone: ev.require_phone, cedula: ev.requires_cedula, gender: ev.require_gender, dob: ev.require_dob, ruc: ev.collect_ruc }}
            promoterCode={ref}
            prefill={{ name: profile?.name ?? "", email: profile?.email ?? "", phone: profile?.phone ?? "" }}
            onSale={ev.status === "live"}
            lang={lang}
            t={t}
          />
        </aside>
      </div>
    </div>
  );
}
