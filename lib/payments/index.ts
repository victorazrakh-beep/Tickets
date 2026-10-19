import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";
import { yappyProvider } from "./yappy";
import type { PaymentProvider, ProviderId } from "./types";

const providers: Record<ProviderId, PaymentProvider> = {
  mock: mockProvider,
  stripe: stripeProvider,
  yappy: yappyProvider,
};

export const getProvider = (id: ProviderId) => providers[id];

// Order payment_method values each provider handles.
export const methodToProvider = { card: "stripe", yappy: "yappy", mock: "mock" } as const;

export function enabledMethods() {
  return {
    card: stripeProvider.enabled(),
    yappy: yappyProvider.enabled(),
    mock: mockProvider.enabled(),
  };
}
