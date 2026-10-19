import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { getScannerSession } from "@/lib/scanner-session";

export async function POST(req: Request) {
  const session = await getScannerSession();
  if (!session) return NextResponse.json({ result: "unauthorized" }, { status: 401 });
  const { token } = await req.json().catch(() => ({ token: "" }));
  // QR codes contain the bare token; also accept a full /t/<token> URL.
  const clean = String(token ?? "").trim().split("/t/").pop()!.split(/[?#]/)[0];
  if (!clean) return NextResponse.json({ result: "not_found" });
  const { data, error } = await admin().rpc("check_in", { p_event_id: session.eventId, p_token: clean, p_by: session.name });
  if (error) return NextResponse.json({ result: "error" }, { status: 500 });
  return NextResponse.json(data);
}
