"use client";
import { useActionState } from "react";
import { scannerLogin } from "./actions";

export function LoginForm({ es }: { es: boolean }) {
  const [state, action, pending] = useActionState(scannerLogin, undefined);
  return (
    <form action={action} className="card p-5 grid gap-3">
      <p className="text-sm text-sub">{es ? "Personal de puerta: usa el código del evento y tu PIN." : "Door staff: use the event code and your PIN."}</p>
      <input className="input" name="event" placeholder={es ? "Código del evento" : "Event code"} autoCapitalize="none" required />
      <input className="input tracking-[0.5em] text-center" name="pin" inputMode="numeric" pattern="\d{5}" maxLength={5} placeholder="•••••" required />
      {state?.error && <p className="text-sm text-danger">{es ? "Código o PIN incorrecto." : "Wrong code or PIN."}</p>}
      <button className="btn-lime" disabled={pending}>{es ? "Entrar" : "Start"}</button>
    </form>
  );
}
