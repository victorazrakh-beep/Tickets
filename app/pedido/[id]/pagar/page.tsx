import { redirect } from "next/navigation";

// Card (Stripe Payment Element / Express Checkout) and Yappy confirmation UIs mount here
// once those providers are enabled. Until then, send the buyer to the order status.
export default async function Pay({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/pedido/${(await params).id}`);
}
