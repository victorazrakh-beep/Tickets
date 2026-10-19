import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Door staff log in with event code + PIN; we keep a signed cookie for 18 hours.
const COOKIE = "xopa_scan";
const sign = (v: string) => createHmac("sha256", env.scannerSecret).update(v).digest("base64url");

// PINs are unique across the platform, so the PIN alone identifies the event.
export const hashPin = (pin: string) => createHmac("sha256", env.scannerSecret).update(`pin:${pin}`).digest("hex");

export async function setScannerSession(eventId: string, name: string) {
  const payload = Buffer.from(JSON.stringify({ eventId, name, exp: Date.now() + 18 * 3600_000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 18 * 3600 });
}

export async function getScannerSession(): Promise<{ eventId: string; name: string } | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  const expected = sign(payload ?? "");
  if (!sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  return data.exp > Date.now() ? { eventId: data.eventId, name: data.name } : null;
}

export async function clearScannerSession() {
  (await cookies()).delete(COOKIE);
}
