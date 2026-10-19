"use client";
import { useActionState, useState } from "react";
import type { EventRow } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import type { FormState } from "./actions";

type TierDraft = { name: string; description: string; tier_type: "ticket" | "table"; price: string; quantity: string; admits: string; max_per_order: string };
const newTier = (): TierDraft => ({ name: "", description: "", tier_type: "ticket", price: "", quantity: "", admits: "1", max_per_order: "10" });

const L = {
  es: {
    basics: "Lo básico", name: "Nombre del evento", cover: "Foto de portada", cover_hint: "Vertical u horizontal, máx. 8 MB",
    starts: "Empieza", ends: "Termina", tbd: "Fecha por anunciar", location: "Lugar", address: "Dirección", map: "Link de Google Maps (opcional)",
    capacity: "Capacidad total", description: "Descripción", details: "Detalles", lineup: "Line-up", artist: "Artista", time: "Hora",
    add: "+ Agregar", links: "Links", label: "Texto", music: "Canción o playlist (Spotify)", video: "Video (YouTube)",
    rules: "Reglamento", whatsapp: "WhatsApp de contacto", yappy: "Tu número Yappy (para recibir pagos)", age: "Edad mínima",
    buyers: "Datos que pides al comprador", phone: "Teléfono", cedula: "Cédula", gender: "Género", dob: "Fecha de nacimiento", ruc: "RUC para factura",
    options: "Opciones", refunds: "Permitir reembolsos", private: "Evento privado (solo con el link)",
    tiers: "Entradas y mesas", tier_name: "Nombre (ej. General, VIP)", perks: "Qué incluye (opcional)", price: "Precio $", qty: "Cantidad",
    table: "Es una mesa", admits: "Personas por mesa", max: "Máx. por pedido", remove: "Quitar",
    fee_note: "El comprador paga un cargo por servicio de 9% + $1 por entrada. Tú recibes el precio completo de la entrada.",
    agree: "Acepto los términos para organizadores", submit: "Enviar a revisión", save: "Guardar cambios", draft: "Guardar borrador",
    review_note: "Revisamos cada evento antes de publicarlo, normalmente en menos de 24 horas.",
  },
  en: {
    basics: "The basics", name: "Event name", cover: "Cover photo", cover_hint: "Portrait or landscape, max 8 MB",
    starts: "Starts", ends: "Ends", tbd: "Date to be announced", location: "Venue", address: "Address", map: "Google Maps link (optional)",
    capacity: "Total capacity", description: "Description", details: "Details", lineup: "Lineup", artist: "Artist", time: "Time",
    add: "+ Add", links: "Links", label: "Label", music: "Song or playlist (Spotify)", video: "Video (YouTube)",
    rules: "Rules", whatsapp: "Contact WhatsApp", yappy: "Your Yappy number (to get paid)", age: "Minimum age",
    buyers: "Details you ask buyers for", phone: "Phone", cedula: "ID number", gender: "Gender", dob: "Date of birth", ruc: "Tax ID for invoice",
    options: "Options", refunds: "Allow refunds", private: "Private event (link only)",
    tiers: "Tickets and tables", tier_name: "Name (e.g. General, VIP)", perks: "What's included (optional)", price: "Price $", qty: "Quantity",
    table: "It's a table", admits: "People per table", max: "Max per order", remove: "Remove",
    fee_note: "Buyers pay a 9% + $1 per ticket service fee. You receive the full ticket price.",
    agree: "I accept the organizer terms", submit: "Submit for review", save: "Save changes", draft: "Save draft",
    review_note: "We review every event before it goes live, usually within 24 hours.",
  },
};

export function EventForm({ action, event, lang, startsInput, endsInput }: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  event?: EventRow; lang: Lang; startsInput?: string; endsInput?: string;
}) {
  const l = L[lang];
  const [state, formAction, pending] = useActionState(action, undefined);
  const [tbd, setTbd] = useState(event?.date_tbd ?? false);
  const [lineup, setLineup] = useState(event?.lineup.length ? event.lineup.map((x) => ({ name: x.name, time: x.time ?? "" })) : []);
  const [links, setLinks] = useState(event?.links ?? []);
  const [tiers, setTiers] = useState<TierDraft[]>([newTier()]);
  const [preview, setPreview] = useState<string | null>(event?.cover_url ?? null);
  const editing = !!event;

  const section = "card p-5 grid gap-4";
  const check = (name: string, label: string, def?: boolean) => (
    <label className="flex items-center gap-3 text-sm"><input type="checkbox" name={name} defaultChecked={def} className="h-4 w-4 accent-[var(--lime)]" />{label}</label>
  );

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="lineup" value={JSON.stringify(lineup)} />
      <input type="hidden" name="links" value={JSON.stringify(links)} />
      <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />

      <section className={section}>
        <h2 className="font-display font-bold text-lg">{l.basics}</h2>
        <label><span className="label">{l.name} *</span><input className="input" name="name" required minLength={3} defaultValue={event?.name} /></label>
        <label>
          <span className="label">{l.cover}</span>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 shrink-0 rounded-xl border border-line bg-surface overflow-hidden">{preview && <img src={preview} alt="" className="h-full w-full object-cover" />}</div>
            <div className="text-sm">
              <input type="file" name="cover" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
              <p className="text-xs text-muted mt-1">{l.cover_hint}</p>
            </div>
          </div>
        </label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="date_tbd" checked={tbd} onChange={(e) => setTbd(e.target.checked)} className="h-4 w-4" />{l.tbd}</label>
        {!tbd && (
          <div className="grid grid-cols-2 gap-3">
            <label><span className="label">{l.starts} *</span><input className="input" type="datetime-local" name="starts_at" required defaultValue={startsInput} /></label>
            <label><span className="label">{l.ends}</span><input className="input" type="datetime-local" name="ends_at" defaultValue={endsInput} /></label>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <label><span className="label">{l.location} *</span><input className="input" name="location" required defaultValue={event?.location} /></label>
          <label><span className="label">{l.address}</span><input className="input" name="address" defaultValue={event?.address ?? ""} /></label>
        </div>
        <label><span className="label">{l.map}</span><input className="input" name="map_url" type="url" defaultValue={event?.map_url ?? ""} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="label">{l.capacity}</span><input className="input" name="capacity" type="number" min={1} defaultValue={event?.capacity ?? 100} /></label>
          <label><span className="label">{l.age}</span><input className="input" name="age_limit" type="number" min={0} max={99} defaultValue={event?.age_limit ?? ""} /></label>
        </div>
        <label><span className="label">{l.description}</span><textarea className="input" name="description" rows={6} defaultValue={event?.description} /></label>
      </section>

      <section className={section}>
        <h2 className="font-display font-bold text-lg">{l.details}</h2>
        <div>
          <span className="label">{l.lineup}</span>
          {lineup.map((a, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="input" placeholder={l.artist} value={a.name} onChange={(e) => setLineup(lineup.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input className="input w-28" type="time" value={a.time} onChange={(e) => setLineup(lineup.map((x, j) => j === i ? { ...x, time: e.target.value } : x))} />
              <button type="button" className="text-sub px-2" onClick={() => setLineup(lineup.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="text-sm text-lime-text" onClick={() => setLineup([...lineup, { name: "", time: "" }])}>{l.add}</button>
        </div>
        <div>
          <span className="label">{l.links}</span>
          {links.map((a, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className="input w-36" placeholder={l.label} value={a.label} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <input className="input" type="url" placeholder="https://" value={a.url} onChange={(e) => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              <button type="button" className="text-sub px-2" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="text-sm text-lime-text" onClick={() => setLinks([...links, { label: "", url: "" }])}>{l.add}</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label><span className="label">{l.music}</span><input className="input" name="music_url" type="url" defaultValue={event?.music_url ?? ""} /></label>
          <label><span className="label">{l.video}</span><input className="input" name="video_url" type="url" defaultValue={event?.video_url ?? ""} /></label>
          <label><span className="label">{l.whatsapp}</span><input className="input" name="whatsapp" type="tel" defaultValue={event?.whatsapp ?? ""} /></label>
          <label><span className="label">{l.yappy}</span><input className="input" name="yappy_phone" type="tel" defaultValue={event?.yappy_phone ?? ""} /></label>
        </div>
        <label><span className="label">{l.rules}</span><textarea className="input" name="reglamento" rows={3} defaultValue={event?.reglamento ?? ""} /></label>
      </section>

      <section className={section}>
        <h2 className="font-display font-bold text-lg">{l.buyers}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {check("require_phone", l.phone, event?.require_phone)}
          {check("requires_cedula", l.cedula, event?.requires_cedula)}
          {check("require_gender", l.gender, event?.require_gender)}
          {check("require_dob", l.dob, event?.require_dob)}
          {check("collect_ruc", l.ruc, event?.collect_ruc)}
        </div>
        <h2 className="font-display font-bold text-lg mt-2">{l.options}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {check("allow_refunds", l.refunds, event?.allow_refunds)}
          {check("is_private", l.private, event?.is_private)}
        </div>
      </section>

      {!editing && (
        <section className={section}>
          <h2 className="font-display font-bold text-lg">{l.tiers}</h2>
          {tiers.map((t, i) => {
            const set = (patch: Partial<TierDraft>) => setTiers(tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={i} className="rounded-xl border border-line p-4 grid gap-3">
                <div className="grid sm:grid-cols-[1fr_110px_110px] gap-3">
                  <input className="input" placeholder={l.tier_name} value={t.name} onChange={(e) => set({ name: e.target.value })} required />
                  <input className="input" type="number" min={0} step="0.01" placeholder={l.price} value={t.price} onChange={(e) => set({ price: e.target.value })} required />
                  <input className="input" type="number" min={1} placeholder={l.qty} value={t.quantity} onChange={(e) => set({ quantity: e.target.value })} required />
                </div>
                <input className="input" placeholder={l.perks} value={t.description} onChange={(e) => set({ description: e.target.value })} />
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={t.tier_type === "table"} onChange={(e) => set({ tier_type: e.target.checked ? "table" : "ticket", admits: e.target.checked ? "6" : "1" })} />{l.table}</label>
                  {t.tier_type === "table" && <label className="flex items-center gap-2">{l.admits}<input className="input w-20 h-9" type="number" min={1} value={t.admits} onChange={(e) => set({ admits: e.target.value })} /></label>}
                  <label className="flex items-center gap-2">{l.max}<input className="input w-20 h-9" type="number" min={1} value={t.max_per_order} onChange={(e) => set({ max_per_order: e.target.value })} /></label>
                  {tiers.length > 1 && <button type="button" className="ml-auto text-danger" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>{l.remove}</button>}
                </div>
              </div>
            );
          })}
          <button type="button" className="text-sm text-lime-text justify-self-start" onClick={() => setTiers([...tiers, newTier()])}>{l.add}</button>
          <p className="text-xs text-sub">{l.fee_note}</p>
        </section>
      )}

      {!editing && <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="agree" required />{l.agree}</label>}
      {state?.error && <p className="text-sm text-danger">⚠ {state.error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-lime" disabled={pending}>{pending ? "…" : editing ? l.save : l.submit}</button>
        {(!editing || event?.status === "draft") && <button className="btn-ghost" name="draft" value="1" disabled={pending}>{l.draft}</button>}
      </div>
      {!editing && <p className="text-xs text-muted">{l.review_note}</p>}
    </form>
  );
}
