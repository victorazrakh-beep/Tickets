"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-checks the order every few seconds while the payment is pending.
export function AutoRefresh({ ms = 3000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), ms);
    return () => clearInterval(id);
  }, [router, ms]);
  return null;
}
