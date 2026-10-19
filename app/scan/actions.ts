"use server";
import { redirect } from "next/navigation";
import { admin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { clearScannerSession, hashPin, setScannerSession } from "@/lib/scanner-session";

// Door staff log in with just their 5-digit PIN.
export async function scannerLogin(_: { error?: string } | undefined, fd: FormData) {
  const pin = String(fd.get("pin") ?? "").trim();
  if (!/^\d{5}$/.test(pin)) return { error: "invalid" };
  const { data: staff } = await admin().from("scanners").select("name, event_id").eq("pin_hash", hashPin(pin))
    .maybeSingle<{ name: string; event_id: string }>();
  if (!staff) return { error: "invalid" };
  await setScannerSession(staff.event_id, staff.name);
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
