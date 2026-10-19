"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockEvent } from "./actions";

export function PasswordGate({ eventId, name, es }: { eventId: string; name: string; es: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [wrong, setWrong] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <form
        className="card p-6 grid gap-4 text-center"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await unlockEvent(eventId, pw);
            if (r.ok) router.refresh();
            else setWrong(true);
          });
        }}
      >
        <div className="mx-auto h-14 w-14 rounded-full bg-surface border border-line grid place-items-center text-2xl">🔒</div>
        <h1 className="font-display font-extrabold text-2xl">{name}</h1>
        <p className="text-sm text-sub">{es ? "Este evento es privado. Ingresa la contraseña que te compartió el organizador." : "This event is private. Enter the password the organizer shared with you."}</p>
        <input className="input text-center" type="text" autoComplete="off" autoCapitalize="none" value={pw}
          onChange={(e) => { setPw(e.target.value); setWrong(false); }} placeholder={es ? "Contraseña" : "Password"} required autoFocus />
        {wrong && <p className="text-sm text-danger">{es ? "Contraseña incorrecta. Intenta de nuevo." : "Wrong password. Please try again."}</p>}
        <button className="btn-lime" disabled={pending || !pw}>{pending ? "…" : es ? "Entrar al evento" : "Enter event"}</button>
      </form>
    </div>
  );
}
