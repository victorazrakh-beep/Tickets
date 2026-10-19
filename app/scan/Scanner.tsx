"use client";
import { useEffect, useRef, useState } from "react";

type Result = { result: string; name?: string; tier?: string; admits?: number; checked_in_at?: string };

export function Scanner({ es, initial }: { es: boolean; initial: { used: number; total: number } }) {
  const [result, setResult] = useState<Result | null>(null);
  const [count, setCount] = useState(initial.used);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState(false);
  const busy = useRef(false);
  const last = useRef<{ token: string; at: number }>({ token: "", at: 0 });

  async function check(token: string) {
    // Ignore the same code read repeatedly by the camera within 3 seconds.
    if (busy.current || (token === last.current.token && Date.now() - last.current.at < 3000)) return;
    busy.current = true;
    last.current = { token, at: Date.now() };
    try {
      const r: Result = await fetch("/api/scan/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).then((x) => x.json());
      setResult(r);
      if (r.result === "ok") { setCount((c) => c + 1); navigator.vibrate?.(80); } else navigator.vibrate?.([60, 60, 60]);
    } catch {
      setResult({ result: "error" });
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let stopped = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      scanner = new Html5Qrcode("reader");
      scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (text) => check(text), () => {}).catch(() => setCamError(true));
    });
    return () => { stopped = true; scanner?.stop().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ok = result?.result === "ok";
  const msg: Record<string, string> = es
    ? { ok: "Adelante", already_used: "Entrada ya usada", not_found: "Entrada no encontrada", refunded: "Entrada reembolsada", void: "Entrada anulada", error: "Error de conexión", unauthorized: "Sesión expirada" }
    : { ok: "Good to go", already_used: "Ticket already used", not_found: "Ticket not found", refunded: "Ticket refunded", void: "Ticket void", error: "Connection error", unauthorized: "Session expired" };

  return (
    <div className="mt-4 grid gap-4">
      <div className="text-center text-sm text-sub tabular-nums">{es ? "Ingresados" : "Checked in"}: <b className="text-main">{count}</b> / {initial.total}</div>
      <div id="reader" className="overflow-hidden rounded-2xl border border-line bg-black aspect-square" />
      {camError && <p className="text-sm text-danger">{es ? "No pudimos abrir la cámara. Revisa los permisos o escribe el código." : "Couldn't open the camera. Check permissions or type the code."}</p>}

      {result && (
        <button onClick={() => setResult(null)} className={`rounded-2xl p-6 text-center ${ok ? "bg-ok text-white" : "bg-danger text-white"}`}>
          <div className="check-pop mx-auto h-16 w-16 rounded-full bg-white/20 grid place-items-center text-4xl">{ok ? "✓" : "✕"}</div>
          <div className="mt-3 text-2xl font-display font-extrabold">{msg[result.result] ?? result.result}</div>
          {result.name && <div className="mt-1">{result.name}</div>}
          {result.tier && <div className="text-sm opacity-90">{result.tier}{result.admits && result.admits > 1 ? ` · ${es ? "Admite" : "Admits"} ${result.admits}` : ""}</div>}
          {result.checked_in_at && <div className="text-xs opacity-80 mt-1">{new Date(result.checked_in_at).toLocaleTimeString()}</div>}
        </button>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) check(manual.trim()); setManual(""); }} className="flex gap-2">
        <input className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={es ? "Escribir código" : "Type code"} />
        <button className="btn-cta">{es ? "Validar" : "Check"}</button>
      </form>
    </div>
  );
}
