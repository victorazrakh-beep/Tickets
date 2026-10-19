import type { Order } from "@/lib/types";

export type ProviderId = "mock" | "stripe" | "yappy";

// What checkout does next after an order is created.
export type PaymentStart =
  | { kind: "redirect"; url: string }               // send the buyer to a hosted/simulated page
  | { kind: "client_secret"; clientSecret: string } // Stripe Payment Element / Express Checkout
  | { kind: "yappy"; orderId: string; token: string };

export type PaymentEvent =
  | { type: "paid"; orderId: string; ref: string }
  | { type: "failed"; orderId: string }
  | { type: "ignored" };

export interface PaymentProvider {
  id: ProviderId;
  enabled(): boolean;
  start(order: Order, opts: { phone?: string }): Promise<PaymentStart>;
  handleWebhook(req: Request): Promise<PaymentEvent>;
  refund(order: Order, amount: number): Promise<void>;
}
