import type { Lang } from "@/lib/i18n";

const TZ = "America/Panama";

export const money = (n: number | string) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const moneyShort = (n: number | string) =>
  Number(n) % 1 === 0 ? "$" + Number(n).toLocaleString("en-US") : money(n);

const locale = (lang: Lang) => (lang === "es" ? "es-PA" : "en-US");

export function eventDate(iso: string | null, lang: Lang, opts: { tbd?: boolean } = {}) {
  if (!iso || opts.tbd) return lang === "es" ? "Fecha por anunciar" : "Date to be announced";
  return new Date(iso).toLocaleDateString(locale(lang), { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
}

export function eventTime(iso: string | null, lang: Lang, opts: { tbd?: boolean } = {}) {
  if (!iso || opts.tbd) return lang === "es" ? "Hora por anunciar" : "Time TBA";
  return new Date(iso).toLocaleTimeString(locale(lang), { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

export function dateParts(iso: string | null, lang: Lang) {
  if (!iso) return { day: "–", month: "" };
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString(locale(lang), { timeZone: TZ, day: "numeric" }),
    month: d.toLocaleDateString(locale(lang), { timeZone: TZ, month: "short" }).replace(".", ""),
  };
}

// <input type="datetime-local"> value in Panama time (UTC-5, no DST) and back.
export const toPanamaInput = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - 5 * 3600_000).toISOString().slice(0, 16) : "";
export const fromPanamaInput = (v: string) => (v ? new Date(v + ":00-05:00").toISOString() : null);
