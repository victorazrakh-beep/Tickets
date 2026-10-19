import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { getScannerSession } from "@/lib/scanner-session";
import { getDict } from "@/lib/i18n-server";
import { Scanner } from "./Scanner";
import { LoginForm } from "./LoginForm";
import { scanAsOrganizer, scannerLogout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Escáner", robots: { index: false } };

export default async function ScanPage() {
  const [session, profile, { lang }] = await Promise.all([getScannerSession(), getProfile(), getDict()]);
  const es = lang === "es";
  const db = admin();

  if (session) {
    const { data: ev } = await db.from("events").select("name").eq("id", session.eventId).single<{ name: string }>();
    const [{ count: used }, { data: sold }] = await Promise.all([
      db.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", session.eventId).eq("status", "used"),
      db.from("tickets").select("id").eq("event_id", session.eventId).in("status", ["valid", "used"]).returns<{ id: string }[]>(),
    ]);
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-xl">{ev?.name}</h1>
            <p className="text-xs text-sub">{session.name}</p>
          </div>
          <form action={scannerLogout}><button className="btn-ghost h-9">{es ? "Salir" : "Exit"}</button></form>
        </div>
        <Scanner es={es} initial={{ used: used ?? 0, total: sold?.length ?? 0 }} />
      </div>
    );
  }

  const { data: mine } = profile
    ? await db.from("events").select("id, name").in("status", ["live", "closed"])
        .match(profile.role === "admin" ? {} : { organizer_id: profile.id }).order("starts_at").limit(30).returns<{ id: string; name: string }[]>()
    : { data: [] };

  return (
    <div className="mx-auto max-w-sm px-4 py-12 grid gap-6">
      <h1 className="font-display font-extrabold text-3xl">{es ? "Escanear entradas" : "Scan tickets"}</h1>
      {!!mine?.length && (
        <div className="card p-5 grid gap-2">
          <p className="text-sm text-sub">{es ? "Tus eventos" : "Your events"}</p>
          {mine.map((e) => (
            <form key={e.id} action={scanAsOrganizer.bind(null, e.id)}><button className="btn-ghost w-full justify-start">{e.name}</button></form>
          ))}
        </div>
      )}
      <LoginForm es={es} />
    </div>
  );
}
