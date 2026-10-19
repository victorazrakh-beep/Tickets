import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/payments";
import { sendOrderConfirmation } from "@/lib/email";

// Payment confirmation from yappy. The webhook, not the browser, decides that an order is paid.
export async function POST(req: Request) {
  const provider = getProvider("yappy");
  if (!provider.enabled()) return NextResponse.json({ error: "yappy not enabled" }, { status: 501 });
  try {
    const event = await provider.handleWebhook(req);
    if (event.type === "paid") {
      const { error } = await admin().rpc("confirm_order", { p_order_id: event.orderId, p_provider: "yappy", p_ref: event.ref });
      if (error) throw error;
      await sendOrderConfirmation(event.orderId);
    } else if (event.type === "failed") {
      await admin().rpc("fail_order", { p_order_id: event.orderId });
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[webhook yappy]", e);
    return NextResponse.json({ error: "webhook failed" }, { status: 400 });
  }
}
