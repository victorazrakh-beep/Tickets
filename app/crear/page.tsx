import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n-server";
import { getProfile } from "@/lib/auth";
import { EventForm } from "@/components/organizer/EventForm";
import { createEvent } from "@/components/organizer/actions";

export const metadata: Metadata = {
  title: "Crea tu evento y vende entradas",
  description: "Publica tu evento en Monta, cobra con tarjeta y Apple Pay, y controla la entrada desde tu teléfono.",
};

export default async function Create() {
  const [{ lang, t }, profile] = await Promise.all([getDict(), getProfile()]);
  const es = lang === "es";
  const steps = es
    ? [["Crea tu evento", "Fotos, fecha, lugar y tus tipos de entrada o mesas."], ["Lo revisamos", "Aprobamos cada evento para mantener la plataforma segura."], ["Vende y cobra", "Cobramos por ti y te transferimos lo vendido."], ["Controla la entrada", "Escanea los QR con tu teléfono o el de tu equipo."]]
    : [["Create your event", "Photos, date, venue and your ticket types or tables."], ["We review it", "We approve every event to keep the platform safe."], ["Sell and get paid", "We collect for you and transfer your sales."], ["Run the door", "Scan QR codes with your phone or your team's."]];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl md:text-5xl tracking-tight">{t.nav_create}</h1>
      {!profile ? (
        <>
          <p className="mt-3 text-sub max-w-xl">{t.home_org_body}</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {steps.map(([title, body], i) => (
              <li key={i} className="card p-5">
                <span className="text-lime-text font-display font-extrabold">0{i + 1}</span>
                <h3 className="mt-1 font-bold">{title}</h3>
                <p className="text-sm text-sub mt-1">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-sub">{es ? "Sin costo para ti: el comprador paga 9% + $1 por entrada." : "Free for you: buyers pay 9% + $1 per ticket."}</p>
          <div className="mt-6 flex gap-3">
            <Link href="/login?mode=signup&next=/crear" className="btn-lime">{t.signup}</Link>
            <Link href="/login?next=/crear" className="btn-ghost">{t.login}</Link>
          </div>
        </>
      ) : (
        <div className="mt-8"><EventForm action={createEvent} lang={lang} /></div>
      )}
    </div>
  );
}
