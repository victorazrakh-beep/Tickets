"use server";
import { redirect } from "next/navigation";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { clearScannerSession, hashPin, setScannerSession } from "@/lib/scanner-session";

export async function scannerLogin(_: { error?: string } | undefined, fd: FormData) {
  const slug = String(fd.get("event") ?? "").trim().toLowerCase();
  const pin = String(fd.get("pin") ?? "").trim();
  const db = admin();
  const { data: ev } = await db.from("events").select("id").eq("slug", slug).maybeSingle<{ id: string }>();
  if (!ev || !/^\d{5}$/.test(pin)) return { error: "invalid" };
  const { data: staff } = await db.from("scanners").select("name").eq("event_id", ev.id).eq("pin_hash", hashPin(ev.id, pin)).maybeSingle<{ name: string }>();
  if (!staff) return { error: "invalid" };
  await setScannerSession(ev.id, staff.name);
  redirect("/scan");
}

// Organizers and admins can scan their own events without a PIN.
export async function scanAsOrganizer(eventId: string) {
  const p = await getProfile();
  if (!p) redirect("/login?next=/scan");
  const { data: ev } = await admin().from("events").select("organizer_id").eq("id", eventId).single<{ organizer_id: string }>();
  if (!ev || (ev.organizer_id !== p.id && p.role !== "admin")) redirect("/scan");
  await setScannerSession(eventId, p.name || p.email || "organizer");
  redirect("/scan");
}

export async function scannerLogout() {
  await clearScannerSession();
  redirect("/scan");
}
