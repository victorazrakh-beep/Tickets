import Link from "next/link";
import type { Metadata } from "next";
import { requireEventManager } from "@/lib/auth";
import { getDict } from "@/lib/i18n-server";
import { toPanamaInput } from "@/lib/format";
import { EventForm } from "@/components/organizer/EventForm";
import { updateEvent } from "@/components/organizer/actions";

export const metadata: Metadata = { title: "Editar evento", robots: { index: false } };

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEventManager(id);
  const { lang } = await getDict();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/manage/${id}`} className="text-sm text-sub">← {event.name}</Link>
      <h1 className="mt-1 mb-6 font-display font-extrabold text-3xl">{lang === "es" ? "Editar evento" : "Edit event"}</h1>
      <EventForm action={updateEvent.bind(null, id)} event={event} lang={lang} startsInput={toPanamaInput(event.starts_at)} endsInput={toPanamaInput(event.ends_at)} />
    </div>
  );
}
