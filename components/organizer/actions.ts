"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { requireEventManager, requireProfile } from "@/lib/auth";
import { slugify } from "@/lib/data";
import { fromPanamaInput } from "@/lib/format";

export type FormState = { error?: string } | undefined;

const tierSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional().nullable(),
  tier_type: z.enum(["ticket", "table"]),
  price: z.coerce.number().min(0).max(100000),
  quantity: z.coerce.number().int().min(1).max(100000),
  admits: z.coerce.number().int().min(1).max(100),
  max_per_order: z.coerce.number().int().min(1).max(100),
});

const eventSchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  date_tbd: z.boolean(),
  location: z.string().trim().min(2).max(160),
  address: z.string().trim().max(200).optional(),
  map_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(200000),
  music_url: z.string().trim().url().max(300).optional().or(z.literal("")),
  video_url: z.string().trim().url().max(300).optional().or(z.literal("")),
  reglamento: z.string().trim().max(5000).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  yappy_phone: z.string().trim().max(20).optional(),
  age_limit: z.coerce.number().int().min(0).max(99).optional(),
  lineup: z.array(z.object({ name: z.string().trim().min(1).max(80), time: z.string().max(10).optional() })).max(40),
  links: z.array(z.object({ label: z.string().trim().min(1).max(60), url: z.string().trim().url().max(300) })).max(10),
  requires_cedula: z.boolean(), require_phone: z.boolean(), require_gender: z.boolean(), require_dob: z.boolean(),
  collect_ruc: z.boolean(), allow_refunds: z.boolean(), is_private: z.boolean(),
});

function readEvent(fd: FormData) {
  const s = (k: string) => (fd.get(k) as string | null)?.trim() || undefined;
  const b = (k: string) => fd.get(k) === "on";
  const json = (k: string) => { try { return JSON.parse(String(fd.get(k) ?? "[]")); } catch { return []; } };
  return eventSchema.safeParse({
    name: s("name"), description: s("description") ?? "", starts_at: s("starts_at"), ends_at: s("ends_at"), date_tbd: b("date_tbd"),
    location: s("location"), address: s("address"), map_url: s("map_url") ?? "", capacity: s("capacity") ?? "100",
    music_url: s("music_url") ?? "", video_url: s("video_url") ?? "", reglamento: s("reglamento"), whatsapp: s("whatsapp"),
    yappy_phone: s("yappy_phone"), age_limit: s("age_limit"),
    lineup: json("lineup").filter((x: { name?: string }) => x.name?.trim()),
    links: json("links").filter((x: { url?: string }) => x.url?.trim()),
    requires_cedula: b("requires_cedula"), require_phone: b("require_phone"), require_gender: b("require_gender"),
    require_dob: b("require_dob"), collect_ruc: b("collect_ruc"), allow_refunds: b("allow_refunds"), is_private: b("is_private"),
  });
}

async function uploadCover(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) throw new Error("COVER_INVALID");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `events/${randomUUID()}.${ext}`;
  const db = admin();
  const { error } = await db.storage.from("event-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return db.storage.from("event-media").getPublicUrl(path).data.publicUrl;
}

function toRow(v: z.infer<typeof eventSchema>) {
  const { starts_at, ends_at, map_url, music_url, video_url, ...rest } = v;
  return {
    ...rest,
    starts_at: v.date_tbd ? null : fromPanamaInput(starts_at ?? ""),
    ends_at: v.date_tbd ? null : fromPanamaInput(ends_at ?? ""),
    map_url: map_url || (v.address || v.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address || v.location)}` : null),
    music_url: music_url || null,
    video_url: video_url || null,
    age_limit: v.age_limit || null,
  };
}

export async function createEvent(_: FormState, fd: FormData): Promise<FormState> {
  const profile = await requireProfile("/crear");
  const parsed = readEvent(fd);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  if (!parsed.data.date_tbd && !parsed.data.starts_at) return { error: "starts_at" };
  if (fd.get("agree") !== "on") return { error: "agree" };

  let tiers: z.infer<typeof tierSchema>[];
  try {
    tiers = z.array(tierSchema).min(1).max(20).parse(JSON.parse(String(fd.get("tiers") ?? "[]")));
  } catch {
    return { error: "tiers" };
  }

  let cover_url: string | undefined;
  try { cover_url = await uploadCover(fd.get("cover")); } catch { return { error: "cover" }; }

  const db = admin();
  const { data: ev, error } = await db.from("events").insert({
    ...toRow(parsed.data), cover_url: cover_url ?? null, slug: slugify(parsed.data.name),
    organizer_id: profile.id, status: fd.get("draft") ? "draft" : "pending_review",
  }).select("id").single<{ id: string }>();
  if (error || !ev) { console.error(error); return { error: "save" }; }

  const { error: tErr } = await db.from("ticket_tiers").insert(tiers.map((t, i) => ({
    ...t, event_id: ev.id, sort_order: i, min_per_order: 1, max_per_order: Math.min(t.max_per_order, t.quantity),
  })));
  if (tErr) { console.error(tErr); return { error: "tiers" }; }
  redirect(`/manage/${ev.id}?created=1`);
}

export async function updateEvent(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { event } = await requireEventManager(eventId);
  const parsed = readEvent(fd);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.path.join(".")).join(", ") };
  let cover_url: string | undefined;
  try { cover_url = await uploadCover(fd.get("cover")); } catch { return { error: "cover" }; }
  const status = event.status === "rejected" || (event.status === "draft" && !fd.get("draft")) ? "pending_review" : event.status;
  const { error } = await admin().from("events").update({
    ...toRow(parsed.data), ...(cover_url ? { cover_url } : {}), status, updated_at: new Date().toISOString(),
  }).eq("id", eventId);
  if (error) { console.error(error); return { error: "save" }; }
  revalidatePath(`/manage/${eventId}`);
  redirect(`/manage/${eventId}?saved=1`);
}
