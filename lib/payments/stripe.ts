import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";

// Launch provider, same as the reference site: Payment Element (card) + Express Checkout
// (Apple Pay / Google Pay). Switch on with PAYMENTS_STRIPE_ENABLED=true + STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
//
// To finish when the account exists:
//  1. npm i stripe @stripe/stripe-js @stripe/react-stripe-js
//  2. start(): stripe.paymentIntents.create({ amount: cents(order.amount_due_now), currency: "usd",
//       metadata: { order_id: order.id }, automatic_payment_methods: { enabled: true } },
//       { idempotencyKey: order.id }) → { kind: "client_secret", clientSecret }
//  3. handleWebhook(): stripe.webhooks.constructEvent(raw, sig, secret);
//       payment_intent.succeeded → paid, payment_intent.payment_failed → failed
//  4. refund(): stripe.refunds.create({ payment_intent: order.provider_ref, amount })
//  5. Register the Apple Pay domain in the Stripe dashboard (needs the real domain).
export const stripeProvider: PaymentProvider = {
  id: "stripe",
  enabled: () => env.payments.stripe,
  async start() {
    throw new Error("STRIPE_NOT_CONFIGURED");
  },
  async handleWebhook() {
    throw new Error("STRIPE_NOT_CONFIGURED");
  },
  async refund() {
    throw new Error("STRIPE_NOT_CONFIGURED");
  },
};
