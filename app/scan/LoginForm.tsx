"use client";
import { useActionState } from "react";
import { scannerLogin } from "./actions";

export function LoginForm({ es, badLink }: { es: boolean; badLink?: boolean }) {
  const [state, action, pending] = useActionState(scannerLogin, undefined);
  return (
    <form action={action} className="card p-5 grid gap-3">
      <p className="text-sm text-sub">{es ? "Personal de puerta: ingresa tu PIN de 5 dígitos." : "Door staff: enter your 5-digit PIN."}</p>
      <input className="input h-14 tracking-[0.6em] text-center text-2xl font-bold" name="pin" inputMode="numeric" pattern="\d{5}" maxLength={5}
        placeholder="•••••" autoComplete="one-time-code" required autoFocus />
      {state?.error && <p className="text-sm text-danger">{es ? "PIN incorrecto." : "Wrong PIN."}</p>}
      {badLink && !state?.error && <p className="text-sm text-danger">{es ? "Ese link de escáner ya no es válido. Pide uno nuevo al organizador." : "That scanner link is no longer valid. Ask the organizer for a new one."}</p>}
      <button className="btn-lime" disabled={pending}>{es ? "Abrir escáner" : "Open scanner"}</button>
    </form>
  );
}
