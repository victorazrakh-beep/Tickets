// Minimal iCalendar file for the "add to calendar" link and the email attachment.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export function ics(ev: { id: string; name: string; description: string; location: string; starts_at: string; ends_at: string | null; url: string }) {
  const start = new Date(ev.starts_at);
  const end = ev.ends_at ? new Date(ev.ends_at) : new Date(start.getTime() + 3 * 3600_000);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Monta//Tickets//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@monta`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(ev.name)}`, `DESCRIPTION:${esc(ev.description.slice(0, 500) + "\n\n" + ev.url)}`,
    `LOCATION:${esc(ev.location)}`, `URL:${ev.url}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
