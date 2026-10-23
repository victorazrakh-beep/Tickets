import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Remembers that this browser entered a private event's password (signed cookie, 30 days).
const name = (eventId: string) => `monta_ev_${eventId.slice(0, 8)}`;
const sign = (eventId: string) => createHmac("sha256", env.scannerSecret).update(`event:${eventId}`).digest("base64url");

export async function grantEventAccess(eventId: string) {
  (await cookies()).set(name(eventId), sign(eventId), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
}

export async function hasEventAccess(eventId: string) {
  const v = (await cookies()).get(name(eventId))?.value ?? "";
  const expected = sign(eventId);
  return v.length === expected.length && timingSafeEqual(Buffer.from(v), Buffer.from(expected));
}

// Private events with at least one password require it; private events without passwords are link-only.
export const needsPassword = (ev: { is_private: boolean; access_passwords?: string[] | null }) =>
  ev.is_private && (ev.access_passwords?.length ?? 0) > 0;

export const passwordMatches = (ev: { access_passwords?: string[] | null }, input: string) =>
  (ev.access_passwords ?? []).some((p) => p.trim().toLowerCase() === input.trim().toLowerCase());
