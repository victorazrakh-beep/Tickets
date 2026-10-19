import Link from "next/link";
import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { requireEventManager } from "@/lib/auth";
import { getDict } from "@/lib/i18n-server";
import { eventDate, money, toPanamaInput } from "@/lib/format";
import { STATUS } from "@/lib/status";
import { env } from "@/lib/env";
import type { Order, Tier } from "@/lib/types";
import * as A from "./actions";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gestionar evento", robots: { index: false } };

const TABS = ["resumen", "entradas", "codigos", "equipo", "pedidos"] as const;

export default async function Manage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string; err?: string }> }) {
  const [{ id }, { tab: rawTab, created, err }] = await Promise.all([params, searchParams]);
  const { event: ev } = await requireEventManager(id);
  const { lang } = await getDict();
  const es = lang === "es";
  const tab = (TABS as readonly string[]).includes(rawTab ?? "") ? rawTab! : "resumen";
  const db = admin();

  const [{ data: tiers }, { data: orders }, { data: promos }, { data: promoters }, { data: scanners }, { data: payouts }, { count: checkedIn }] = await Promise.all([
    db.from("ticket_tiers").select("*").eq("event_id", id).order("sort_order").returns<Tier[]>(),
    db.from("ticket_orders").select("*, order_items(quantity, ticket_tiers(name)), tickets(id, status, token)").eq("event_id", id).order("created_at", { ascending: false }).limit(500)
      .returns<(Order & { promoter_id: string | null; order_items: { quantity: number; ticket_tiers: { name: string } }[]; tickets: { id: string; status: string; token: string }[] })[]>(),
    db.from("promo_codes").select("*").eq("event_id", id).order("created_at").returns<{ id: string; code: string; discount_type: string; value: number; max_uses: number | null; used: number; active: boolean }[]>(),
    db.from("promoters").select("*").eq("event_id", id).order("created_at").returns<{ id: string; name: string; code: string }[]>(),
    db.from("scanners").select("id, name").eq("event_id", id).returns<{ id: string; name: string }[]>(),
    db.from("payouts").select("*").eq("event_id", id).order("requested_at").returns<{ id: string; amount: number; status: string; requested_at: string; reference: string | null }[]>(),
    db.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "used"),
  ]);

  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const ticketsSold = (tiers ?? []).reduce((s, t) => s + t.sold, 0);
  const gross = paid.reduce((s, o) => s + Number(o.subtotal) - Number(o.discount), 0);
  const fees = paid.reduce((s, o) => s + Number(o.fee), 0);
  const voidedValue = 0; // refunds are deducted per ticket once provider refunds are live
  const requested = (payouts ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const available = Math.max(0, gross - voidedValue - requested);
  const promoterSales = (pid: string) => paid.filter((o) => o.promoter_id === pid);
  const url = `${env.siteUrl}/e/${ev.slug}`;

  const label = {
    resumen: es ? "Resumen" : "Overview", entradas: es ? "Entradas" : "Tickets", codigos: es ? "Códigos" : "Codes",
    equipo: es ? "Equipo" : "Team", pedidos: es ? "Pedidos" : "Orders",
  } as Record<string, string>;
  const kpi = (k: string, v: string) => <div className="card p-4"><div className="text-xs text-sub">{k}</div><div className="mt-1 font-display font-extrabold text-2xl tabular-nums">{v}</div></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {created && (
        <div className="mb-4 rounded-xl border border-line bg-surface p-4 text-sm">
          {es ? "¡Evento enviado! Lo revisaremos pronto. Mientras tanto puedes configurar códigos y tu equipo." : "Event submitted! We'll review it soon. Meanwhile you can set up codes and your team."}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <Link href="/mis-eventos" className="text-sm text-sub">← {es ? "Mis eventos" : "My events"}</Link>
          <h1 className="mt-1 font-display font-extrabold text-3xl">{ev.name}</h1>
          <p className="text-sub text-sm">{eventDate(ev.starts_at, lang, { tbd: ev.date_tbd })} · {ev.location} · <b>{STATUS[ev.status][lang]}</b></p>
          {ev.status === "rejected" && ev.review_note && <p className="mt-2 text-sm text-danger">{ev.review_note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/e/${ev.slug}`} className="btn-ghost h-9">{es ? "Ver página" : "View page"}</Link>
          <Link href={`/manage/${id}/editar`} className="btn-ghost h-9">{es ? "Editar" : "Edit"}</Link>
          {ev.status === "live" && <form action={A.setStatus.bind(null, id, "closed")}><button className="btn-ghost h-9">{es ? "Pausar venta" : "Pause sales"}</button></form>}
          {ev.status === "closed" && <form action={A.setStatus.bind(null, id, "live")}><button className="btn-lime h-9">{es ? "Reanudar venta" : "Resume sales"}</button></form>}
        </div>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((tb) => (
          <Link key={tb} href={`/manage/${id}?tab=${tb}`} className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === tb ? "border-lime-text text-main font-semibold" : "border-transparent text-sub"}`}>{label[tb]}</Link>
        ))}
      </nav>

      {tab === "resumen" && (
        <div className="mt-6 grid gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpi(es ? "Entradas vendidas" : "Tickets sold", String(ticketsSold))}
            {kpi(es ? "Ventas (tuyas)" : "Sales (yours)", money(gross))}
            {kpi(es ? "Cargos pagados por compradores" : "Fees paid by buyers", money(fees))}
            {kpi(es ? "Ingresados" : "Checked in", String(checkedIn ?? 0))}
          </div>
          <div className="card p-5">
            <h2 className="font-display font-bold">{es ? "Por tipo de entrada" : "By ticket type"}</h2>
            <ul className="mt-3 grid gap-3">
              {(tiers ?? []).map((t) => (
                <li key={t.id}>
                  <div className="flex justify-between text-sm"><span>{t.name}</span><span className="tabular-nums text-sub">{t.sold}/{t.quantity}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-surface overflow-hidden"><div className="h-full bg-lime" style={{ width: `${t.quantity ? (t.sold / t.quantity) * 100 : 0}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5 grid gap-3">
            <h2 className="font-display font-bold">{es ? "Tu balance" : "Your balance"}</h2>
            <p className="text-sm text-sub">{es ? "Cobramos los pagos por ti. Después del evento solicita tu transferencia." : "We collect payments for you. After the event, request your transfer."}</p>
            <div className="text-3xl font-display font-extrabold tabular-nums">{money(available)}</div>
            {available > 0 && <form action={A.requestPayout.bind(null, id, available)}><button className="btn-cta">{es ? "Solicitar pago" : "Request payout"}</button></form>}
            {(payouts ?? []).map((p) => (
              <div key={p.id} className="flex justify-between text-sm border-t border-line pt-2">
                <span>{new Date(p.requested_at).toLocaleDateString()} · {money(p.amount)}</span>
                <span className={p.status === "paid" ? "text-ok" : "text-sub"}>{p.status === "paid" ? `${es ? "Pagado" : "Paid"} ${p.reference ?? ""}` : es ? "Solicitado" : "Requested"}</span>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="font-display font-bold">{es ? "Link para compartir" : "Share link"}</h2>
            <code className="mt-2 block break-all text-sm text-sub">{url}</code>
          </div>
        </div>
      )}

      {tab === "entradas" && (
        <div className="mt-6 grid gap-4">
          {(tiers ?? []).map((t, i) => (
            <details key={t.id} className="card p-4">
              <summary className="flex items-center gap-3 cursor-pointer list-none">
                <span className="flex-1 font-semibold">{t.name}{t.hidden && <span className="ml-2 text-xs text-sub">({es ? "oculta" : "hidden"})</span>}</span>
                <span className="text-sm text-sub tabular-nums">{money(t.price)} · {t.sold}/{t.quantity}</span>
                <form action={A.moveTier.bind(null, id, t.id, -1)}><button disabled={i === 0} className="px-2 text-sub disabled:opacity-20">↑</button></form>
                <form action={A.moveTier.bind(null, id, t.id, 1)}><button disabled={i === (tiers?.length ?? 0) - 1} className="px-2 text-sub disabled:opacity-20">↓</button></form>
              </summary>
              <TierForm eventId={id} tier={t} es={es} />
              <form action={A.deleteTier.bind(null, id, t.id)} className="mt-2"><button className="text-sm text-danger">{t.sold > 0 ? (es ? "Cerrar venta de este tipo" : "Close this type") : (es ? "Eliminar" : "Delete")}</button></form>
            </details>
          ))}
          <details className="card p-4" open={!tiers?.length}>
            <summary className="cursor-pointer font-semibold text-lime-text">+ {es ? "Nuevo tipo de entrada o mesa" : "New ticket type or table"}</summary>
            <TierForm eventId={id} es={es} />
          </details>
        </div>
      )}

      {tab === "codigos" && (
        <div className="mt-6 grid gap-6">
          <div className="card p-5">
            <h2 className="font-display font-bold">{es ? "Códigos de descuento" : "Discount codes"}</h2>
            <ul className="mt-3 divide-y divide-line">
              {(promos ?? []).map((p) => (
                <li key={p.id} className="py-2 flex items-center gap-3 text-sm">
                  <code className="font-bold">{p.code}</code>
                  <span className="text-sub">{p.discount_type === "percent" ? `${p.value}%` : money(p.value)} · {p.used}{p.max_uses ? `/${p.max_uses}` : ""} {es ? "usos" : "uses"}</span>
                  <form action={A.togglePromo.bind(null, id, p.id, !p.active)} className="ml-auto"><button className={p.active ? "text-sub" : "text-lime-text"}>{p.active ? (es ? "Desactivar" : "Disable") : (es ? "Activar" : "Enable")}</button></form>
                </li>
              ))}
            </ul>
            <form action={A.addPromo.bind(null, id)} className="mt-4 grid sm:grid-cols-[1fr_120px_100px_100px_auto] gap-2">
              <input className="input uppercase" name="code" placeholder={es ? "CÓDIGO" : "CODE"} required />
              <select className="input" name="discount_type"><option value="percent">%</option><option value="fixed">$</option></select>
              <input className="input" name="value" type="number" min="0.01" step="0.01" placeholder={es ? "Valor" : "Value"} required />
              <input className="input" name="max_uses" type="number" min="1" placeholder={es ? "Usos máx." : "Max uses"} />
              <button className="btn-cta">{es ? "Crear" : "Create"}</button>
            </form>
          </div>
          <div className="card p-5">
            <h2 className="font-display font-bold">{es ? "Promotores" : "Promoters"}</h2>
            <p className="text-sm text-sub">{es ? "Cada promotor recibe su link. Las ventas con ese link se le atribuyen." : "Each promoter gets a link. Sales through it are credited to them."}</p>
            <ul className="mt-3 divide-y divide-line">
              {(promoters ?? []).map((p) => {
                const s = promoterSales(p.id);
                return (
                  <li key={p.id} className="py-2 text-sm grid gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-sub">{s.reduce((n, o) => n + o.order_items.reduce((m, it) => m + it.quantity, 0), 0)} {es ? "entradas" : "tickets"} · {money(s.reduce((n, o) => n + Number(o.subtotal) - Number(o.discount), 0))}</span>
                      <form action={A.deletePromoter.bind(null, id, p.id)} className="ml-auto"><button className="text-sub">✕</button></form>
                    </div>
                    <code className="text-xs text-sub break-all">{url}?ref={p.code}</code>
                  </li>
                );
              })}
            </ul>
            <form action={A.addPromoter.bind(null, id)} className="mt-4 grid sm:grid-cols-[1fr_160px_auto] gap-2">
              <input className="input" name="name" placeholder={es ? "Nombre" : "Name"} required />
              <input className="input uppercase" name="code" placeholder={es ? "Código (opcional)" : "Code (optional)"} />
              <button className="btn-cta">{es ? "Agregar" : "Add"}</button>
            </form>
          </div>
        </div>
      )}

      {tab === "equipo" && (
        <div className="mt-6 grid gap-6">
          <div className="card p-5 grid gap-3">
            <h2 className="font-display font-bold">{es ? "Link del escáner" : "Scanner link"}</h2>
            <p className="text-sm text-sub">{es ? "Compártelo con tu equipo: abre el escáner de este evento sin PIN. Si se filtra, genera uno nuevo y el anterior deja de funcionar." : "Share it with your team: it opens this event's scanner without a PIN. If it leaks, generate a new one and the old one stops working."}</p>
            <code className="block break-all rounded-xl bg-surface border border-line p-3 text-xs">{`${env.siteUrl}/scan/acceso?e=${ev.id}&k=${ev.scan_token}`}</code>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={`${env.siteUrl}/scan/acceso?e=${ev.id}&k=${ev.scan_token}`} label={es ? "Copiar link" : "Copy link"} done={es ? "¡Copiado!" : "Copied!"} />
              <a className="btn-ghost h-9" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`${es ? "Escáner de" : "Scanner for"} ${ev.name}: ${env.siteUrl}/scan/acceso?e=${ev.id}&k=${ev.scan_token}`)}`}>WhatsApp</a>
              <form action={A.regenerateScanLink.bind(null, id)}><button className="btn-ghost h-9">{es ? "Generar link nuevo" : "New link"}</button></form>
              <Link href="/scan" className="btn-lime h-9">{es ? "Abrir escáner" : "Open scanner"}</Link>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-display font-bold">{es ? "PINs del personal" : "Staff PINs"}</h2>
            <p className="text-sm text-sub">{es ? "Cada persona entra a " : "Each person goes to "}<b>{env.siteUrl}/scan</b>{es ? " y escribe solo su PIN de 5 dígitos." : " and types only their 5-digit PIN."}</p>
            <ul className="mt-3 divide-y divide-line">
              {(scanners ?? []).map((s) => (
                <li key={s.id} className="py-2 flex text-sm"><span className="flex-1">{s.name}</span><form action={A.deleteScanner.bind(null, id, s.id)}><button className="text-sub">{es ? "Eliminar" : "Delete"}</button></form></li>
              ))}
              {!scanners?.length && <li className="py-2 text-sm text-sub">{es ? "Aún no hay PINs. Crea uno para tu equipo." : "No PINs yet. Create one for your staff."}</li>}
            </ul>
            <form action={A.addScanner.bind(null, id)} className="mt-4 grid sm:grid-cols-[1fr_140px_auto] gap-2">
              <input className="input" name="name" placeholder={es ? "Nombre" : "Name"} required />
              <input className="input tracking-widest" name="pin" inputMode="numeric" pattern="\d{5}" maxLength={5} placeholder="PIN (5)" required />
              <button className="btn-cta">{es ? "Crear PIN" : "Create PIN"}</button>
            </form>
            {err === "pin_taken" && <p className="mt-2 text-sm text-danger">{es ? "Ese PIN ya está en uso, elige otro." : "That PIN is already in use, pick another."}</p>}
            {err === "pin_format" && <p className="mt-2 text-sm text-danger">{es ? "El PIN debe tener 5 dígitos." : "The PIN must be 5 digits."}</p>}
            {err === "save" && <p className="mt-2 text-sm text-danger">{es ? "No pudimos crear el PIN." : "Could not create the PIN."}</p>}
          </div>
        </div>
      )}

      {tab === "pedidos" && (
        <div className="mt-6 card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-sub"><tr className="border-b border-line">
              <th className="p-3">{es ? "Pedido" : "Order"}</th><th className="p-3">{es ? "Comprador" : "Buyer"}</th><th className="p-3">{es ? "Entradas" : "Tickets"}</th>
              <th className="p-3">{es ? "Total" : "Total"}</th><th className="p-3">{es ? "Estado" : "Status"}</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-b border-line align-top">
                  <td className="p-3"><code>{o.code}</code><div className="text-xs text-muted">{new Date(o.created_at).toLocaleString(lang === "es" ? "es-PA" : "en-US", { timeZone: "America/Panama" })}</div></td>
                  <td className="p-3">{o.name}<div className="text-xs text-sub">{o.email}{o.phone && ` · ${o.phone}`}</div></td>
                  <td className="p-3">{o.order_items.map((it, k) => <div key={k}>{it.quantity}× {it.ticket_tiers.name}</div>)}</td>
                  <td className="p-3 tabular-nums">{money(o.total)}<div className="text-xs text-muted">{o.payment_method}</div></td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">
                    {o.tickets.filter((tk) => tk.status === "valid").map((tk) => (
                      <form key={tk.id} action={A.voidTicket.bind(null, id, tk.id)}>
                        <button className="text-xs text-danger whitespace-nowrap">{es ? "Anular entrada" : "Void ticket"} …{tk.token.slice(-4)}</button>
                      </form>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders?.length && <p className="p-5 text-sub">{es ? "Aún no hay pedidos." : "No orders yet."}</p>}
          <p className="p-3 text-xs text-muted">{es ? "Ventas en mesas/entradas son en USD. Los reembolsos con tarjeta se procesarán automáticamente cuando se active Stripe." : "All amounts in USD. Card refunds will process automatically once Stripe is enabled."}</p>
        </div>
      )}
    </div>
  );
}

function TierForm({ eventId, tier, es }: { eventId: string; tier?: Tier; es: boolean }) {
  const chk = (name: string, label: string, def?: boolean) => (
    <label className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={def} />{label}</label>
  );
  return (
    <form action={A.saveTier.bind(null, eventId)} className="mt-4 grid gap-3">
      {tier && <input type="hidden" name="id" value={tier.id} />}
      <div className="grid sm:grid-cols-[1fr_120px_120px] gap-2">
        <input className="input" name="name" defaultValue={tier?.name} placeholder={es ? "Nombre" : "Name"} required />
        <input className="input" name="price" type="number" min="0" step="0.01" defaultValue={tier?.price} placeholder={es ? "Precio" : "Price"} required />
        <input className="input" name="quantity" type="number" min="0" defaultValue={tier?.quantity} placeholder={es ? "Cantidad" : "Quantity"} required />
      </div>
      <input className="input" name="description" defaultValue={tier?.description ?? ""} placeholder={es ? "Qué incluye" : "What's included"} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label><span className="label">{es ? "Tipo" : "Type"}</span><select className="input" name="tier_type" defaultValue={tier?.tier_type}><option value="ticket">{es ? "Entrada" : "Ticket"}</option><option value="table">{es ? "Mesa" : "Table"}</option></select></label>
        <label><span className="label">{es ? "Personas" : "Admits"}</span><input className="input" name="admits" type="number" min="1" defaultValue={tier?.admits ?? 1} /></label>
        <label><span className="label">{es ? "Mín./pedido" : "Min/order"}</span><input className="input" name="min_per_order" type="number" min="1" defaultValue={tier?.min_per_order ?? 1} /></label>
        <label><span className="label">{es ? "Máx./pedido" : "Max/order"}</span><input className="input" name="max_per_order" type="number" min="1" defaultValue={tier?.max_per_order ?? 10} /></label>
        <label><span className="label">{es ? "Venta desde" : "Sales start"}</span><input className="input" name="sales_start" type="datetime-local" defaultValue={toPanamaInput(tier?.sales_start ?? null)} /></label>
        <label><span className="label">{es ? "Venta hasta" : "Sales end"}</span><input className="input" name="sales_end" type="datetime-local" defaultValue={toPanamaInput(tier?.sales_end ?? null)} /></label>
        <label><span className="label">{es ? "Abono % (opcional)" : "Deposit % (optional)"}</span><input className="input" name="deposit_pct" type="number" min="0" max="99" defaultValue={tier?.deposit_pct ?? ""} /></label>
        <label><span className="label">{es ? "Código para desbloquear" : "Unlock code"}</span><input className="input uppercase" name="unlock_code" defaultValue={tier?.unlock_code ?? ""} /></label>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {chk("hidden", es ? "Oculta (solo con código)" : "Hidden (code only)", tier?.hidden)}
        {chk("show_remaining", es ? "Mostrar cuántas quedan" : "Show how many are left", tier?.show_remaining)}
        {chk("sequential", es ? "Se abre al agotarse la anterior" : "Opens when previous sells out", tier?.sequential)}
        {chk("variable_pricing", es ? "El comprador elige el monto (precio = mínimo)" : "Pay what you want (price = minimum)", tier?.variable_pricing)}
      </div>
      <button className="btn-cta justify-self-start">{es ? "Guardar" : "Save"}</button>
    </form>
  );
}
