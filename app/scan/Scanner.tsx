"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Result = { result: string; name?: string; tier?: string; admits?: number; checked_in_at?: string; token?: string };

// Tickets this phone already checked in, so a repeat shows instantly even with bad signal.
const storeKey = (eventId: string) => `xopa_scanned_${eventId}`;
const readScanned = (eventId: string) => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(storeKey(eventId)) || "[]")); } catch { return new Set<string>(); }
};
const remember = (eventId: string, token: string) => {
  try { const s = readScanned(eventId); s.add(token); localStorage.setItem(storeKey(eventId), JSON.stringify([...s])); } catch {}
};

// QR codes hold the bare token; also accept a full /t/<token> URL or a typed short code.
const clean = (raw: string) => {
  const v = raw.trim();
  return v.includes("/t/") ? v.split("/t/").pop()!.split(/[?#]/)[0] : v;
};

export function Scanner({ es, eventId, initial }: { es: boolean; eventId: string; initial: { used: number; total: number } }) {
  const video = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [count, setCount] = useState(initial.used);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState(false);
  const busy = useRef(false);
  const last = useRef("");

  const check = useCallback(async (raw: string) => {
    const token = clean(raw);
    if (!token || busy.current || token === last.current) return;
    busy.current = true;
    last.current = token;
    let r: Result;
    try {
      const res = await fetch("/api/scan/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      r = await res.json();
    } catch {
      r = readScanned(eventId).has(token) ? { result: "already_used" } : { result: "error" };
    }
    if (r.result === "ok") {
      setCount((c) => c + 1);
      remember(eventId, r.token ?? token);
      navigator.vibrate?.(80);
    } else {
      navigator.vibrate?.([60, 60, 60]);
    }
    setResult(r);
    // Show the result for 3.5 s, then accept the next code (including the same one again).
    setTimeout(() => { setResult(null); last.current = ""; busy.current = false; }, 3500);
  }, [eventId]);

  useEffect(() => {
    let scanner: import("qr-scanner").default | null = null;
    let cancelled = false;
    import("qr-scanner").then(({ default: QrScanner }) => {
      if (cancelled || !video.current) return;
      scanner = new QrScanner(video.current, (r) => check(r.data), {
        preferredCamera: "environment",
        maxScansPerSecond: 15,
        highlightScanRegion: true,
        returnDetailedScanResult: true,
        // Scan the whole frame (downscaled) so small or off-center codes still read.
        calculateScanRegion: (v) => ({ x: 0, y: 0, width: v.videoWidth, height: v.videoHeight, downScaledWidth: 640, downScaledHeight: 640 }),
      });
      scanner.start().catch(() => setCamError(true));
    });
    return () => { cancelled = true; scanner?.destroy(); };
  }, [check]);

  const ok = result?.result === "ok";
  const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString(es ? "es-PA" : "en-US", { hour: "numeric", minute: "2-digit" }) : "");
  const msg: Record<string, string> = es
    ? { ok: "Adelante", already_used: "Entrada ya usada", not_found: "Entrada no encontrada", refunded: "Entrada reembolsada", void: "Entrada anulada", error: "Sin conexión, intenta de nuevo", unauthorized: "Sesión expirada" }
    : { ok: "Good to go", already_used: "Ticket already used", not_found: "Ticket not found", refunded: "Ticket refunded", void: "Ticket void", error: "No connection, try again", unauthorized: "Session expired" };

  return (
    <div className="mt-4 grid gap-4">
      <div className="text-center text-sm text-sub tabular-nums">{es ? "Ingresados" : "Checked in"}: <b className="text-main">{count}</b> / {initial.total}</div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black aspect-square">
        <video ref={video} className="h-full w-full object-cover" muted playsInline />
        {result && (
          <button onClick={() => { setResult(null); last.current = ""; busy.current = false; }}
            className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white ${ok ? "bg-ok" : "bg-danger"}`}>
            <div className="check-pop h-20 w-20 rounded-full bg-white/20 grid place-items-center text-5xl">{ok ? "✓" : "✕"}</div>
            <div className="mt-4 text-3xl font-display font-extrabold">{msg[result.result] ?? result.result}</div>
            {result.name && <div className="mt-2 text-lg">{result.name}</div>}
            {result.tier && <div className="text-sm text-white/80">{result.tier}{result.admits && result.admits > 1 ? ` · ${es ? "Admite" : "Admits"} ${result.admits}` : ""}</div>}
            {result.result === "already_used" && result.checked_in_at && (
              <div className="mt-1 text-sm text-white/80">{es ? "Escaneada a las " : "Scanned at "}{time(result.checked_in_at)}</div>
            )}
          </button>
        )}
      </div>
      {camError && <p className="text-sm text-danger">{es ? "No pudimos abrir la cámara. Revisa los permisos o escribe el código." : "Couldn't open the camera. Check permissions or type the code."}</p>}

      <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) check(manual.trim()); setManual(""); }} className="flex gap-2">
        <input className="input uppercase tracking-widest" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={es ? "Código de la entrada" : "Ticket code"} autoCapitalize="characters" />
        <button className="btn-cta">{es ? "Validar" : "Check"}</button>
      </form>
    </div>
  );
}
