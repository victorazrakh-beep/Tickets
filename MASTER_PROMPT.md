# Master Prompt: Events Now (draft v0.2)

> Status: DRAFT. Items marked [PENDING SITE ANALYSIS] get filled in once eventos.divenue.com
> is reachable from the build environment. Items marked [NEED] are open questions.
> Reference product: eventos.divenue.com (Panama). We replicate its page structure, flows and
> feature set. Brand, logo, copy, photos and event data are original to Events Now.

## 1. Product summary

**Events Now** is a Spanish first ticketing marketplace for parties, concerts and events in Panama.

1. **Buyers** discover events, choose ticket tiers (General, VIP, tables, etc.), and pay with
   **Apple Pay** (cards as fallback) and soon **Yappy**. **No login required**: guest checkout
   with name, email and phone. Tickets arrive by email as QR codes and can be retrieved later
   with email + order code. Optional account to see all purchases.
2. **Organizers** (anyone running an event) sign up, create events, define tiers, and submit
   for review. An **Events Now admin must approve** every event before it goes public.
   Each organizer has their own dashboard to manage their events, sales, attendees and door check in.
3. **Events Now is the merchant of record**: all payments land in the Events Now account.
   After the event, Events Now pays the organizer their net amount (gross minus service fee
   minus refunds). The platform tracks every balance in a ledger.
4. **Blog** for SEO (guides on venues, ticket release dates, buying safely).

## 2. Tech stack (Cloudflare)

1. **Framework**: Next.js (App Router) + TypeScript deployed to Cloudflare Workers via OpenNext.
   Server rendered event pages for SEO.
2. **UI**: Tailwind CSS + shadcn/ui. Mobile first.
3. **Database**: Cloudflare D1 (SQLite) with Drizzle ORM and migrations.
4. **Inventory locking**: one Durable Object per ticket tier (or per event) holds stock and
   10 minute checkout holds, so tickets can never oversell.
5. **Storage**: Cloudflare R2 for event images and generated ticket PDFs; Cloudflare Images for resizing.
6. **Auth**: Better Auth on D1 (email magic link + Google) for organizers, admins and optional buyer accounts.
7. **Bot protection**: Cloudflare Turnstile on checkout and organizer signup.
8. **Email**: Resend (order confirmation, ticket QR, approval notices, payout notices).
9. **Background jobs**: Cloudflare Queues + Cron Triggers (expire holds, send reminders, payout reports).
10. **Payments**: behind a `PaymentProvider` interface:
    1. Apple Pay via **[NEED: processor]**. Stripe does not onboard Panamanian businesses.
       Candidates that serve Panama: Tilopay, PagueloFacil, BAC Credomatic/Cybersource.
       Apple Pay on the web also requires a verified domain file
       (`/.well-known/apple-developer-merchantid-domain-association`).
    2. Yappy (Banco General) "Botón de Pago Yappy" integration, added when the merchant account is ready.
    3. What Divenue uses: [PENDING SITE ANALYSIS].
11. **Analytics**: Cloudflare Web Analytics, plus [NEED: GA4 / Meta Pixel IDs].

## 3. Public pages

1. `/` Home: hero with search (text, date), category chips (Fiestas, Conciertos, Deportes,
   Cultura, Gastronomía...), featured carousel, "Este fin de semana", "Próximos eventos" grid,
   organizer CTA ("Publica tu evento"), FAQ, footer.
2. `/eventos` Listing with filters (category, date, price, zone) and pagination.
3. `/eventos/[slug]` Event detail: cover, title, date/time, venue + map, organizer, description,
   age limit, **ticket tiers** (name, price, perks, remaining stock, sold out state, sale window),
   quantity selector per tier, total with service fee, "Comprar", share, related events.
   JSON-LD `Event` schema and Open Graph image.
4. **Seated or zoned events**: optional venue map where the buyer picks a zone (General, VIP,
   Platinum, Mesa para 6...) or exact seat. Phase 1 = zones with price and capacity;
   Phase 2 = clickable seat map.
5. `/checkout/[holdId]` Guest form (name, email, phone, optional cédula), promo code, order
   summary with fee breakdown, Apple Pay button, countdown timer for the hold.
6. `/orden/[code]` Confirmation with QR tickets, add to Apple Wallet [Phase 2], download PDF.
7. `/mis-entradas` Find tickets by email + order code, or log in to see all.
8. `/organizadores` Landing selling the organizer product: how it works, fees, approval, payouts.
9. `/blog`, `/blog/[slug]`.
10. `/terminos`, `/privacidad`, `/reembolsos`, `/contacto`, `/ayuda` (FAQ).
11. Exact page list, sections and wording style: [PENDING SITE ANALYSIS].

## 4. Organizer dashboard (`/panel`)

1. Signup and profile: legal name, RUC or cédula, phone, bank account for payouts (ACH Panama).
2. Events: create, edit, preview, **submit for approval**; statuses
   `draft → pending_review → approved/published → rejected (with reason) → ended → cancelled`.
3. Ticket tiers: name, description/perks, price, quantity, sale start/end, max per order,
   hidden tiers (unlock with code), early bird.
4. Promo codes: percent or fixed, usage limit, tier restriction.
5. Sales: KPIs (gross, net, tickets sold, by tier, by day), orders table, CSV export.
6. Attendees: list, search, resend tickets, issue comp tickets.
7. Door check in: `/panel/scan/[eventId]` phone camera QR scanner, green/red result,
   duplicate scan warning, works with poor signal (cache attendee list, sync later).
8. Team: invite members with roles (owner, manager, scanner).
9. Balance: what has been collected, fees, refunds, and payout status for each event.

## 5. Platform admin (`/admin`)

1. Review queue: approve or reject events (with reason, emailed to organizer).
2. Organizers: verify, suspend.
3. Feature events on home; manage categories and zones.
4. Orders: search, refund, resend.
5. **Payouts**: per event settlement report (gross, service fees, processor cost, refunds, net
   due), mark as paid with transfer reference, organizer gets an email.
6. Fee settings, blog posts, site settings.

## 6. Data model (core tables)

`users`, `organizers`, `organizer_members`, `venues`, `venue_zones`, `categories`, `events`,
`event_reviews`, `ticket_types`, `holds`, `orders`, `order_items`, `tickets`
(unique signed token, status valid/used/refunded/void), `checkins`, `promo_codes`,
`payments` (provider, provider_ref, status, raw webhook), `refunds`, `ledger_entries`,
`payouts`, `blog_posts`, `settings`.

## 7. Business rules

1. Currency: USD (Balboa parity). Prices shown with ITBMS rules [NEED: confirm with accountant].
2. **Service fee**: Divenue's fee minus a few cents. Divenue fee: [PENDING SITE ANALYSIS].
   Stored as configurable `percent + fixed per ticket`, paid by the buyer and shown before paying.
3. Holds expire after 10 minutes; expired holds return stock.
4. Refunds: [NEED: policy, e.g. only if event cancelled; fee refundable or not].
5. Payout timing: [NEED: e.g. 3 business days after event].
6. Max tickets per order: default 10.

## 8. Design

Name: Events Now. Logo, colors, fonts: [NEED, or we create a simple placeholder identity].
Mobile first (traffic comes from Instagram and WhatsApp), big event imagery, fast pages
(LCP under 2.5s), Spanish UI with English toggle [NEED: confirm].
Layout patterns mirrored from the reference: [PENDING SITE ANALYSIS].

## 9. Seed data: 4 sample events (fictional)

1. **Noche Tropical Rooftop**: party, Casco Viejo, Fri 9pm.
   Tiers: General $15, VIP open bar $45, Mesa VIP (6 personas) $300.
2. **Acústico Bajo las Estrellas**: concert, Amador, Sat 7pm.
   Zones: General $25, Preferencial $40, VIP front row $70.
3. **Festival Gastronómico del Pacífico**: food fest, Costa del Este, Sun 12pm.
   Tiers: Entrada $10, Pase Degustación $30, Niños gratis.
4. **Clásico de Fútbol Sala**: sports, Ciudad Deportiva, Sat 4pm.
   Zones: Gradería $8, Preferencial $15, Palco $35.
Each with an original cover image (generated or stock with license), description, venue and map pin.

## 10. Build order

1. Repo, Cloudflare project, D1 schema, seed data.
2. Public pages: home, listing, detail with tiers.
3. Holds (Durable Object) + guest checkout + Apple Pay + email QR tickets.
4. Organizer signup, dashboard, event submission.
5. Admin review queue, payouts ledger.
6. Door scanner.
7. Yappy, blog, SEO, analytics.
8. QA: oversell load test, webhook retries, Apple Pay on real iPhone, mobile pass.
