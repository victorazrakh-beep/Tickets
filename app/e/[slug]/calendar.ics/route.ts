import { getEventBySlug } from "@/lib/data";
import { ics } from "@/lib/ics";
import { env } from "@/lib/env";
import { hasEventAccess, needsPassword } from "@/lib/event-access";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ev = await getEventBySlug((await params).slug);
  if (!ev || !ev.starts_at || ev.status !== "live") return new Response("Not found", { status: 404 });
  if (needsPassword(ev) && !(await hasEventAccess(ev.id))) return new Response("Not found", { status: 404 });
  const body = ics({ ...ev, starts_at: ev.starts_at, location: ev.address || ev.location, url: `${env.siteUrl}/e/${ev.slug}` });
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${ev.slug}.ics"` },
  });
}
