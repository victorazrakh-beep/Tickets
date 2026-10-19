import type { Metadata } from "next";
import { getDict } from "@/lib/i18n-server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const { next, mode } = await searchParams;
  const { t } = await getDict();
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <LoginForm next={safeNext} initialMode={mode === "signup" ? "signup" : "login"} t={t} />
    </div>
  );
}
