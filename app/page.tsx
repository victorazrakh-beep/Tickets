import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { listPublicEvents } from "@/lib/data";
import { getDict } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const HERO = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=2000&q=70";

export default async function Home() {
  const { lang, t } = await getDict();
  const [featured, upcoming] = await Promise.all([listPublicEvents({ featured: true, limit: 6 }), listPublicEvents({ limit: 12 })]);
  const words = lang === "es"
    ? ["Fiestas", "Conciertos", "Rooftops", "Festivales", "Deportes", "Comedia", "Gastronomía", "Teatro"]
    : ["Parties", "Concerts", "Rooftops", "Festivals", "Sports", "Comedy", "Food", "Theatre"];

  return (
    <>
      <section className="relative overflow-hidden">
        <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/55 to-bg" />
        <div className="relative mx-auto max-w-6xl px-4 pt-24 pb-28 md:pt-36 md:pb-40 text-white">
          <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl leading-[0.95]">
            {t.hero_title_1}<br /><span className="text-lime">{t.hero_title_2}</span>
          </h1>
          <p className="mt-5 max-w-md text-base md:text-lg text-white/80">{t.hero_sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/busqueda" className="btn-lime">{t.hero_cta_explore}</Link>
            <Link href="/crear" className="btn border border-white/40 text-white hover:bg-white/10">{t.hero_cta_create}</Link>
          </div>
        </div>
      </section>

      <div className="border-y border-line overflow-hidden py-3 text-sub">
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-display font-bold uppercase tracking-wide text-sm">
          {[...words, ...words].map((w, i) => (
            <span key={i} className="flex items-center gap-10">{w}<span className="text-lime-text">✕</span></span>
          ))}
        </div>
      </div>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 mt-14">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl">{t.home_featured}</h2>
          <div className="mt-6 grid gap-6 grid-cols-2 md:grid-cols-3">
            {featured.map((ev) => <EventCard key={ev.id} ev={ev} lang={lang} t={t} />)}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 mt-14">
        <div className="flex items-end justify-between">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl">{t.home_upcoming}</h2>
          <Link href="/busqueda" className="text-sm text-sub hover:text-main">{t.nav_explore} →</Link>
        </div>
        {upcoming.length ? (
          <div className="mt-6 grid gap-6 grid-cols-2 md:grid-cols-4">
            {upcoming.map((ev) => <EventCard key={ev.id} ev={ev} lang={lang} t={t} />)}
          </div>
        ) : (
          <p className="mt-6 text-sub">{t.home_empty}</p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 mt-20">
        <div className="card p-8 md:p-12 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl">{t.home_org_title}</h2>
            <p className="mt-2 text-sub max-w-lg">{t.home_org_body}</p>
          </div>
          <Link href="/crear" className="btn-lime shrink-0">{t.nav_create}</Link>
        </div>
      </section>
    </>
  );
}
