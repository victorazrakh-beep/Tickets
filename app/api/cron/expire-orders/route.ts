import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

// Vercel Cron: releases stock held by unpaid orders. Holds also expire lazily on every new order.
export async function GET(req: Request) {
  if (env.cronSecret && req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await admin().rpc("expire_stale_orders");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ expired: data });
}
