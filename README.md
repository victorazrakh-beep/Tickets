# Xopa

Ticketing for parties, concerts and events in Panama. Next.js (App Router) on Vercel + Supabase.
Product spec: [`MASTER_PROMPT.md`](MASTER_PROMPT.md).

## What's in v1

- Public: home, search with date filters, event pages (lineup, Spotify/YouTube, map, WhatsApp, JSON-LD), blog, legal, sitemap/robots, ES/EN, dark/light.
- Buying: tiers and tables, sales windows, hidden tiers with unlock codes, sequential release, deposits, pay-what-you-want,
  promo codes, promoter links (`?ref=CODE`), extra buyer fields (cédula, gender, DOB, RUC), 9% + $1 service fee,
  10-minute stock holds, free reservations, QR tickets by email with calendar invite, order lookup by email + code.
- Organizers: create/edit events with cover upload, review flow, tiers CRUD and ordering, codes, promoters with sales,
  door staff with 5-digit PINs, orders table, void tickets, pause/resume sales, payout requests.
- Door: `/scan` camera scanner, one check-in per ticket guaranteed by the database.
- Admin: review queue (approve / request changes, emails the organizer), featured events, suspend, mark payouts paid.

Payments: **test mode** (`PAYMENTS_MOCK=true`) simulates the gateway. Stripe and Yappy are wired behind
`lib/payments/` and switch on with env flags once accounts exist (see the TODO notes in each provider file).

Not in v1 (Phase 2): community feed, profiles/follows, DMs, RSVP, tier approval requests, parental consent, auto-translation.

## Setup

1. **Supabase**: create a project. In SQL Editor run `supabase/migrations/20261019000000_init.sql`, then `supabase/seed.sql`
   for 4 demo events. (Or link the repo with the Supabase GitHub integration so migrations apply automatically.)
   - Auth → URL Configuration: Site URL = your Vercel URL; add `https://<your-app>.vercel.app/auth/callback` to Redirect URLs.
   - Auth → Providers → Google (optional): add a Google OAuth client.
2. **Vercel**: import this repo, add the variables from `.env.example`, deploy.
3. **Admin access**: put your email in `ADMIN_EMAILS`, sign up, then open `/admin`.

## Develop

```bash
cp .env.example .env.local   # fill in Supabase keys
npm install
npm run dev
npm run test:db              # database logic tests (in-memory Postgres)
```
