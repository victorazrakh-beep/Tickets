import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { env, isConfigured } from "@/lib/env";
import type { EventRow } from "@/lib/types";

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  organizer_name: string | null;
  role: "user" | "admin";
}

export async function getUser() {
  if (!isConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await admin().from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!data) return null;
  // ADMIN_EMAILS bootstraps the first admins without touching the database.
  if (data.email && env.adminEmails.includes(data.email.toLowerCase())) data.role = "admin";
  return data;
}

export async function requireProfile(next = "/") {
  const p = await getProfile();
  if (!p) redirect(`/login?next=${encodeURIComponent(next)}`);
  return p;
}

export async function requireAdmin() {
  const p = await requireProfile("/admin");
  if (p.role !== "admin") redirect("/");
  return p;
}

// Organizer (owner) or admin may manage an event.
export async function requireEventManager(eventId: string) {
  const p = await requireProfile(`/manage/${eventId}`);
  const { data: ev } = await admin().from("events").select("*").eq("id", eventId).single<EventRow>();
  if (!ev || (ev.organizer_id !== p.id && p.role !== "admin")) redirect("/mis-eventos");
  return { profile: p, event: ev };
}
