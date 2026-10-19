import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { setScannerSession } from "@/lib/scanner-session";

// Shareable scanner link: /scan/acceso?e=<eventId>&k=<scan_token>. Opens the scanner without a PIN.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const e = url.searchParams.get("e") ?? "", k = url.searchParams.get("k") ?? "";
  if (/^[0-9a-f-]{36}$/.test(e) && k.length >= 12) {
    const { data: ev } = await admin().from("events").select("id").eq("id", e).eq("scan_token", k).maybeSingle<{ id: string }>();
    if (ev) {
      await setScannerSession(ev.id, "Link");
      return NextResponse.redirect(new URL("/scan", url.origin));
    }
  }
  return NextResponse.redirect(new URL("/scan?link=invalido", url.origin));
}
