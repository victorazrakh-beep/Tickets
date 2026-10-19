import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";

// Yappy (Banco General) "Botón de Pago". Built but off until the commercial account exists.
// Switch on with PAYMENTS_YAPPY_ENABLED=true + YAPPY_MERCHANT_ID, YAPPY_SECRET_KEY, YAPPY_DOMAIN.
//
// To finish when credentials exist:
//  1. start(): validate merchant (POST /payments/validate/merchant) → token, then create the
//     order (POST /onboarding/create-order) with orderId, domain, paymentDate, aliasYappy (buyer
//     phone, 8 digits starting with 6 or 7), ipnUrl=/api/webhooks/yappy, total.
//     Return { kind: "yappy", orderId, token } so the client shows the Yappy confirmation step.
//  2. handleWebhook(): Yappy calls the IPN URL with orderId, status (E = paid, R/C/X = failed)
//     and a hash; verify the hash with the secret key before trusting it.
//  3. refund(): Yappy refunds are manual from the merchant portal; mark the ticket refunded here.
export const yappyProvider: PaymentProvider = {
  id: "yappy",
  enabled: () => env.payments.yappy,
  async start() {
    throw new Error("YAPPY_NOT_CONFIGURED");
  },
  async handleWebhook() {
    throw new Error("YAPPY_NOT_CONFIGURED");
  },
  async refund() {
    throw new Error("YAPPY_NOT_CONFIGURED");
  },
};
