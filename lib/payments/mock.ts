import { env } from "@/lib/env";
import type { PaymentProvider } from "./types";

// Simulated gateway for testing (PAYMENTS_MOCK=true). Never enable in production.
export const mockProvider: PaymentProvider = {
  id: "mock",
  enabled: () => env.payments.mock,
  async start(order) {
    return { kind: "redirect", url: `/pedido/${order.id}/prueba` };
  },
  async handleWebhook() {
    return { type: "ignored" };
  },
  async refund() {},
};
