import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { sendReviewResult } from "@/lib/email";
import { eventDate, money } from "@/lib/format";
import { STATUS } from "@/lib/status";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function review(eventId: string, approve: boolean, fd: FormData) {
  "use server";
  await requireAdmin();
  const note = String(fd.get("note") ?? "").trim() || null;
  await admin().from("events").update({ status: approve ? "live" : "rejected", review_note: approve ? null : note }).eq("id", eventId);
  await sendReviewResult(eventId, approve, note ?? undefined);
  revalidatePath("/admin");
}
async function setFeatured(eventId: string, featured: boolean) {
  "use server";
  await requireAdmin();
  await admin().from("events").update({ featured }).eq("id", eventId);
  revalidatePath("/admin");
}
async function setLive(eventId: string, status: "live" | "cancelled" | "closed") {
  "use server";
  await requireAdmin();
  await admin().from("events").update({ status }).eq("id", eventId);
  revalidatePath("/admin");
}
async function markPaid(payoutId: string, fd: FormData) {
  "use server";
  await requireAdmin();
  await admin().from("payouts").update({ status: "paid", paid_at: new Date().toISOString(), reference: String(fd.get("reference") ?? "").slice(0, 80) || null }).eq("id", payoutId);
  revalidatePath("/admin");
}

type Ev = EventRow & { profiles: { email: string | null; name: string | null } | null };

export default async function Admin() {
  await requireAdmin();
  const db = admin();
  const [{ data: pending }, { data: live }, { data: payouts }] = await Promise.all([
    db.from("events").select("*, profiles(email, name)").eq("status", "pending_review").order("created_at").returns<Ev[]>(),
    db.from("events").select("*, profiles(email, name)").in("status", ["live", "closed"]).order("starts_at").limit(100).returns<Ev[]>(),
    db.from("payouts").select("*, events(name)").eq("status", "requested").order("requested_at")
      .returns<{ id: string; amount: number; requested_at: string; events: { name: string } }[]>(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 grid gap-10">
      <h1 className="font-display font-extrabold text-3xl">Admin</h1>

      <section>
        <h2 className="font-display font-bold text-xl">Por revisar ({pending?.length ?? 0})</h2>
        <ul className="mt-4 grid gap-4">
          {(pending ?? []).map((ev) => (
            <li key={ev.id} className="card p-4 grid gap-3">
              <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 rounded-xl bg-surface overflow-hidden">{ev.cover_url && <img src={ev.cover_url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0">
                  <Link href={`/e/${ev.slug}`} className="font-semibold hover:underline">{ev.name}</Link>
                  <p className="text-sm text-sub">{eventDate(ev.starts_at, "es", { tbd: ev.date_tbd })} · {ev.location}</p>
                  <p className="text-sm text-sub">{ev.profiles?.name} · {ev.profiles?.email}</p>
                  <p className="mt-1 text-sm text-sub line-clamp-2">{ev.description}</p>
                </div>
              </div>
              <form className="flex flex-wrap gap-2">
                <button formAction={review.bind(null, ev.id, true)} className="btn-lime h-9">Aprobar y publicar</button>
                <input name="note" className="input h-9 flex-1 min-w-48" placeholder="Motivo si se rechaza" />
                <button formAction={review.bind(null, ev.id, false)} className="btn-ghost h-9">Pedir cambios</button>
              </form>
            </li>
          ))}
          {!pending?.length && <p className="text-sub">Nada pendiente.</p>}
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl">Pagos solicitados</h2>
        <ul className="mt-4 grid gap-2">
          {(payouts ?? []).map((p) => (
            <li key={p.id} className="card p-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="flex-1">{p.events.name} · <b>{money(p.amount)}</b> · {new Date(p.requested_at).toLocaleDateString("es-PA")}</span>
              <form action={markPaid.bind(null, p.id)} className="flex gap-2">
                <input name="reference" className="input h-9 w-44" placeholder="Ref. transferencia" />
                <button className="btn-cta h-9">Marcar pagado</button>
              </form>
            </li>
          ))}
          {!payouts?.length && <p className="text-sub">Sin solicitudes.</p>}
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl">Eventos publicados</h2>
        <ul className="mt-4 divide-y divide-line card">
          {(live ?? []).map((ev) => (
            <li key={ev.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
              <Link href={`/manage/${ev.id}`} className="flex-1 min-w-0 truncate hover:underline">{ev.name}</Link>
              <span className="text-sub">{STATUS[ev.status].es}</span>
              <form action={setFeatured.bind(null, ev.id, !ev.featured)}><button className={ev.featured ? "text-lime-text" : "text-sub"}>{ev.featured ? "★ Destacado" : "☆ Destacar"}</button></form>
              <form action={setLive.bind(null, ev.id, "cancelled")}><button className="text-danger">Suspender</button></form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
