"use client";
import { useRouter } from "next/navigation";

export function LangToggle({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      className="h-9 px-3 rounded-full border border-line text-xs font-semibold text-sub hover:text-main"
      onClick={() => {
        document.cookie = `lang=${label.toLowerCase()};path=/;max-age=31536000;samesite=lax`;
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}

export function ThemeToggle() {
  return (
    <button
      aria-label="Theme"
      className="h-9 w-9 grid place-items-center rounded-full border border-line text-sub hover:text-main"
      onClick={() => {
        const light = document.documentElement.classList.toggle("light");
        try { localStorage.setItem("xopa-theme", light ? "light" : "dark"); } catch {}
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" /></svg>
    </button>
  );
}
