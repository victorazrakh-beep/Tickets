"use client";
import { useState } from "react";

export function ShareButton({ label, done }: { label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="chip"
      onClick={async () => {
        const url = location.href.split("?")[0];
        if (navigator.share) {
          try { await navigator.share({ url, title: document.title }); } catch {}
          return;
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? done : label}
    </button>
  );
}
