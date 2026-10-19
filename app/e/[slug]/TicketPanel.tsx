"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quote } from "@/lib/fees";
import { money, moneyShort } from "@/lib/format";
import { fill, type Dict, type Lang } from "@/lib/i18n";
import type { Tier } from "@/lib/types";
import { checkCode, checkout, type CodeResult } from "./actions";

type PublicTier = Omit<Tier, "unlock_code">;
type Methods = { card: boolean; yappy: boolean; mock: boolean };
type Requirements = { phone: boolean; cedula: boolean; gender: boolean; dob: boolean; ruc: boolean };

function tierState(tier: PublicTier, all: PublicTier[], now: number) {
  if (tier.sold + tier.reserved >= tier.quantity) return "sold_out";
  if (tier.sales_start && now < Date.parse(tier.sales_start)) return "not_yet";
  if (tier.sales_end && now > Date.parse(tier.sales_end)) return "closed";
  if (tier.sequential && all.some((o) => !o.hidden && o.sort_order < tier.sort_order && o.sold + o.reserved < o.quantity)) return "locked";
  if (tier.requires_approval) return "approval";
  return "on_sale";
}

export function TicketPanel(props: {
  eventId: string; tiers: PublicTier[]; fee: { pct: number; flat: number }; methods: Methods; requirements: Requirements;
  promoterCode?: string; prefill: { name: string; email: string; phone: string }; lang: Lang; t: Dict; onSale: boolean;
}) {
  const { t, lang } = props;
  const router = useRouter();
  const [tiers, setTiers] = useState(props.tiers);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [code, setCode] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [promo, setPromo] = useState<Extract<CodeResult, { type: "promo" }> | null>(null);
  const [unlock, setUnlock] = useState<string | undefined>();
  const [step, setStep] = useState<"pick" | "details">("pick");
  const [form, setForm] = useState({ ...props.prefill, cedula: "", gender: "", dob: "", ruc: "" });
  const [method, setMethod] = useState<"card" | "yappy" | "mock" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [inApp, setInApp] = useState(false);
  const now = Date.now();

  useEffect(() => setInApp(/Instagram|FBAN|FBAV|Snapchat|TikTok|musical_ly|Line\//i.test(navigator.userAgent)), []);

  const lines = tiers.map((tier) => ({ tier, quantity: qty[tier.id] ?? 0, amount: amounts[tier.id] }));
  const q = quote(lines, props.fee);
  const discount = useMemo(() => {
    if (!promo) return 0;
    const eligible = lines.filter((l) => !promo.tier_ids || promo.tier_ids.includes(l.tier.id))
      .reduce((s, l) => s + (l.tier.variable_pricing ? Math.max(Number(l.tier.price), l.amount ?? 0) : Number(l.tier.price)) * l.quantity, 0);
    return Math.min(eligible, promo.discount_type === "percent" ? Math.round(eligible * promo.value) / 100 : promo.value);
  }, [promo, lines]);
  const isFree = q.count > 0 && q.subtotal - discount === 0;
  const fee = isFree ? 0 : q.fee;
  const total = q.subtotal - discount + fee;
  const dueNow = Math.max(q.dueNow - q.fee - discount, 0) + fee;
  const anyMethod = props.methods.card || props.methods.yappy || props.methods.mock;

  const setQ = (tier: PublicTier, delta: number) => setQty((cur) => {
    const n = (cur[tier.id] ?? 0) + delta;
    const left = tier.quantity - tier.sold - tier.reserved;
    const next = n <= 0 ? 0 : Math.min(Math.max(n, tier.min_per_order), tier.max_per_order, left);
    return { ...cur, [tier.id]: next };
  });

  const applyCode = () => start(async () => {
    const r = await checkCode(props.eventId, code);
    if (r.type === "unlock") {
      setUnlock(code.trim());
      setTiers((cur) => [...cur.filter((x) => !r.tiers.some((y) => y.id === x.id)), ...r.tiers].sort((a, b) => a.sort_order - b.sort_order));
      setCodeMsg("✓");
    } else if (r.type === "promo") {
      setPromo(r);
      setCodeMsg(`✓ ${r.discount_type === "percent" ? `${r.value}%` : money(r.value)}`);
    } else {
      setCodeMsg(lang === "es" ? "Código no válido" : "Invalid code");
    }
  });

  const submit = () => start(async () => {
    setError(null);
    const r = await checkout({
      event_id: props.eventId, name: form.name, email: form.email,
      phone: form.phone || undefined, cedula: form.cedula || undefined, gender: (form.gender || undefined) as "f" | "m" | "o" | undefined,
      dob: form.dob || undefined, ruc: form.ruc || undefined,
      payment_method: isFree ? "free" : (method || "mock") as "card" | "yappy" | "mock",
      promo_code: promo?.code, promoter_code: props.promoterCode, unlock_code: unlock,
      items: lines.filter((l) => l.quantity > 0).map((l) => ({ tier_id: l.tier.id, quantity: l.quantity, amount: l.amount })),
    }, lang);
    if ("error" in r) setError(r.error);
    else router.push(r.url);
  });

  const field = (k: keyof typeof form, label: string, type = "text", required = false) => (
    <label className="block">
      <span className="label">{label}{required && " *"}</span>
      <input className="input" type={type} value={form[k]} required={required} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  );

  if (!props.onSale) {
    return <div className="card p-5 text-sub">{t.sales_closed}</div>;
  }

  return (
    <div className="card p-5">
      <h2 className="font-display font-extrabold text-xl">{step === "pick" ? t.tickets : t.checkout_title}</h2>

      {step === "pick" && (
        <>
          <ul className="mt-4 divide-y divide-line">
            {tiers.filter((x) => !x.hidden || unlock).map((tier) => {
              const state = tierState(tier, tiers, now);
              const n = qty[tier.id] ?? 0;
              const left = tier.quantity - tier.sold - tier.reserved;
              return (
                <li key={tier.id} className="py-4 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{tier.name}</div>
                    {tier.description && <div className="text-sm text-sub">{tier.description}</div>}
                    <div className="mt-1 text-sm">
                      <span className="font-semibold text-lime-text">{Number(tier.price) === 0 ? t.free : moneyShort(tier.price)}</span>
                      {tier.tier_type === "table" && <span className="text-sub"> · {fill(t.per_person_table, { n: tier.admits })}</span>}
                      {tier.deposit_mode === "deposit" && tier.deposit_pct && <span className="text-sub"> · {fill(t.deposit_only, { n: tier.deposit_pct })}</span>}
                      {tier.show_remaining && state === "on_sale" && <span className="text-sub"> · {fill(t.remaining, { n: left })}</span>}
                    </div>
                    {state === "sold_out" && <div className="text-sm text-danger mt-1">{t.sold_out}</div>}
                    {state === "not_yet" && <div className="text-sm text-sub mt-1">{t.not_on_sale_yet}</div>}
                    {state === "closed" && <div className="text-sm text-sub mt-1">{t.sales_closed}</div>}
                    {state === "locked" && <div className="text-sm text-sub mt-1">{t.next_release}</div>}
                    {state === "approval" && <div className="text-sm text-sub mt-1">{t.soon}</div>}
                    {tier.variable_pricing && n > 0 && (
                      <label className="block mt-2">
                        <span className="label">{fill(t.choose_amount, { n: money(tier.price) })}</span>
                        <input className="input max-w-32" type="number" min={Number(tier.price)} step="1" value={amounts[tier.id] ?? Number(tier.price)}
                          onChange={(e) => setAmounts({ ...amounts, [tier.id]: Number(e.target.value) })} />
                      </label>
                    )}
                  </div>
                  {state === "on_sale" && (
                    <div className="flex items-center gap-2 self-center">
                      <button aria-label="-" className="h-9 w-9 rounded-full border border-line text-lg disabled:opacity-30" disabled={n === 0} onClick={() => setQ(tier, -1)}>−</button>
                      <span className="w-6 text-center font-semibold tabular-nums">{n}</span>
                      <button aria-label="+" className="h-9 w-9 rounded-full border border-line text-lg disabled:opacity-30" disabled={n >= Math.min(tier.max_per_order, left)} onClick={() => setQ(tier, 1)}>+</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-sub">{t.have_code}</summary>
            <div className="mt-2 flex gap-2">
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t.code_placeholder} />
              <button className="btn-ghost" disabled={pending || !code} onClick={applyCode}>{t.apply}</button>
            </div>
            {codeMsg && <p className="mt-1 text-sub">{codeMsg}</p>}
          </details>
        </>
      )}

      {step === "details" && (
        <div className="mt-4 grid gap-3">
          {field("name", t.name, "text", true)}
          {field("email", t.email, "email", true)}
          {field("phone", t.phone, "tel", props.requirements.phone)}
          {props.requirements.cedula && field("cedula", t.cedula, "text", true)}
          {props.requirements.gender && (
            <label className="block"><span className="label">{t.gender} *</span>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="" />
                <option value="f">{t.gender_f}</option><option value="m">{t.gender_m}</option><option value="o">{t.gender_o}</option>
              </select>
            </label>
          )}
          {props.requirements.dob && field("dob", t.dob, "date", true)}
          {props.requirements.ruc && field("ruc", t.ruc, "text", true)}

          {!isFree && (
            <div className="mt-2">
              <span className="label">{t.pay_method}</span>
              {inApp && <p className="mb-2 rounded-xl bg-surface border border-line p-3 text-sm">{t.in_app_browser}</p>}
              {!anyMethod && <p className="rounded-xl bg-surface border border-line p-3 text-sm text-sub">{t.payments_unavailable}</p>}
              <div className="grid gap-2">
                {(["card", "yappy", "mock"] as const).map((m) => (
                  <label key={m} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${props.methods[m] ? "border-line cursor-pointer" : "border-line opacity-40"} ${method === m ? "border-lime-text" : ""}`}>
                    <input type="radio" name="method" disabled={!props.methods[m]} checked={method === m} onChange={() => setMethod(m)} />
                    <span className="flex-1">{m === "card" ? t.pay_card : m === "yappy" ? t.pay_yappy : t.pay_mock}</span>
                    {!props.methods[m] && <span className="text-xs text-muted">{t.soon}</span>}
                  </label>
                )).filter((_, i) => i < 2 || props.methods.mock)}
              </div>
            </div>
          )}
        </div>
      )}

      {q.count > 0 && (
        <dl className="mt-4 border-t border-line pt-4 text-sm grid grid-cols-2 gap-y-1.5">
          <dt className="text-sub">{t.subtotal}</dt><dd className="text-right tabular-nums">{money(q.subtotal)}</dd>
          {discount > 0 && <><dt className="text-sub">{t.discount}</dt><dd className="text-right tabular-nums">−{money(discount)}</dd></>}
          {fee > 0 && <><dt className="text-sub">{t.service_fee}</dt><dd className="text-right tabular-nums">{money(fee)}</dd></>}
          <dt className="font-semibold">{t.total}</dt><dd className="text-right font-semibold tabular-nums">{money(total)}</dd>
          {Math.abs(dueNow - total) > 0.001 && <><dt className="font-semibold text-lime-text">{t.due_now}</dt><dd className="text-right font-semibold tabular-nums text-lime-text">{money(dueNow)}</dd></>}
        </dl>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {step === "pick" ? (
        <button className="btn-lime w-full mt-4" disabled={q.count === 0} onClick={() => setStep("details")}>
          {q.count ? t.continue : t.select_tickets}
        </button>
      ) : (
        <>
          <button className="btn-lime w-full mt-4" disabled={pending || !form.name || !form.email || (!isFree && !method)} onClick={submit}>
            {pending ? "…" : isFree ? t.reserve : fill(t.pay_now, { n: money(dueNow) })}
          </button>
          <button className="mt-2 w-full text-sm text-sub hover:text-main" onClick={() => setStep("pick")}>← {t.tickets}</button>
          <p className="mt-3 text-xs text-muted text-center">{t.terms_accept}</p>
        </>
      )}
    </div>
  );
}
