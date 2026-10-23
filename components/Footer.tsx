import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getDict } from "@/lib/i18n-server";

export async function Footer() {
  const { t } = await getDict();
  const col = "flex flex-col gap-2 text-sm text-sub";
  return (
    <footer className="border-t border-line mt-20">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 grid-cols-2 md:grid-cols-5">
        <div className="col-span-2">
          <Logo />
          <p className="mt-3 text-sm text-sub max-w-xs">{t.footer_tagline}</p>
        </div>
        <div className={col}>
          <span className="text-main font-semibold">{t.footer_events}</span>
          <Link href="/busqueda">{t.nav_explore}</Link>
          <Link href="/tickets">{t.nav_tickets}</Link>
          <Link href="/blog">{t.footer_blog}</Link>
        </div>
        <div className={col}>
          <span className="text-main font-semibold">{t.footer_organizers}</span>
          <Link href="/crear">{t.nav_create}</Link>
          <Link href="/mis-eventos">{t.nav_my_events}</Link>
          <Link href="/scan">{t.footer_scan}</Link>
        </div>
        <div className={col}>
          <span className="text-main font-semibold">{t.footer_legal}</span>
          <Link href="/legal/terminos">{t.footer_terms}</Link>
          <Link href="/legal/privacidad">{t.footer_privacy}</Link>
          <Link href="/legal/cookies">{t.footer_cookies}</Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted">© {new Date().getFullYear()} Monta</div>
    </footer>
  );
}
