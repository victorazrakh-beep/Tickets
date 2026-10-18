# Master Prompt: Event Ticketing Platform (draft v0.1)

> Status: DRAFT. Placeholders in [BRACKETS] need answers before building.
> Reference product: eventos.divenue.com (Panama). We replicate the structure,
> flows and feature set, NOT its brand, logo, copy, photos or event data.

## 1. Product summary

Build **[BRAND NAME]**, a Spanish first ticketing marketplace for parties, concerts and
events in **[COUNTRY / CITIES]**. Two audiences:

1. **Buyers**: discover events, pick ticket types, pay online, receive QR tickets by email
   and in their account.
2. **Organizers**: self serve publish events, define ticket tiers and capacity, sell,
   see sales in a dashboard, and check people in at the door by scanning QR codes.

A content blog ("where events happen, when tickets go on sale, how to buy safely") drives SEO.
[OPTIONAL PHASE 2: venue directory and vendor marketplace, as on the parent site.]

## 2. Tech stack

1. Next.js (App Router) + TypeScript, server rendered event pages for SEO.
2. Tailwind CSS + shadcn/ui.
3. Supabase: Postgres, Auth (email magic link + Google), Storage for event images, Row Level Security.
4. Payments: **[PROVIDER]** (Stripe is not available to Panamanian merchants; candidates:
   Tilopay, PagueloFacil, Yappy, BAC/Cybersource). Abstract behind a `PaymentProvider` interface.
5. Email: Resend (order confirmation with PDF/QR tickets).
6. QR: signed ticket tokens (HMAC), rendered as QR; scanner page uses the phone camera.
7. Hosting: Vercel. Analytics: [GA4 / Meta Pixel / PostHog].

## 3. Information architecture (public)

1. `/` Home: hero with search (text, city, date), category chips (Fiestas, Conciertos,
   Deportes, Cultura, ...), "This weekend", "Featured", "Upcoming" grids, organizer CTA
   ("Publica tu evento"), FAQ, footer.
2. `/eventos` Listing with filters (category, date range, price, city) and pagination.
3. `/eventos/[slug]` Event detail: cover image, title, date/time, venue + map, organizer,
   description, ticket tiers with price, remaining stock, quantity selector, "Comprar",
   share buttons, related events. JSON-LD `Event` schema.
4. `/checkout/[orderId]` Buyer info, order summary with fees, payment, timer holding stock (10 min).
5. `/orden/[id]/confirmacion` Success page with tickets.
6. `/mis-entradas` Buyer account: upcoming and past tickets, QR, resend email.
7. `/organizadores` Landing page selling the organizer product (fees, how it works).
8. `/blog`, `/blog/[slug]` MDX or CMS posts.
9. Legal: `/terminos`, `/privacidad`, `/reembolsos`. `/contacto`.

## 4. Organizer dashboard (`/panel`)

1. Onboarding: organizer profile, payout details, tax ID [RUC].
2. Events CRUD: draft, publish, unpublish; cover upload; venue; schedule; age limit.
3. Ticket tiers: name, price, quantity, sale window, max per order, early bird.
4. Promo codes (percent / fixed, usage limit).
5. Sales: KPIs (revenue, tickets sold, by tier, by day), orders table, CSV export.
6. Attendees list and manual comp tickets.
7. Check in: `/panel/scan/[eventId]` camera scanner, offline tolerant, duplicate scan warning.
8. Team members with roles (owner, manager, scanner).

## 5. Admin (`/admin`)

Approve organizers and events, feature events on home, manage categories, refunds, fee settings, blog.

## 6. Data model (core tables)

`profiles`, `organizers`, `organizer_members`, `venues`, `categories`, `events`,
`ticket_types`, `orders`, `order_items`, `tickets` (unique token, status: valid / used / refunded),
`checkins`, `promo_codes`, `payouts`, `blog_posts`. Stock reservation done in a Postgres
function with row locks so tiers never oversell.

## 7. Business rules

1. Service fee: [X% + $Y], shown [added to buyer / absorbed by organizer].
2. Currency: [USD]. Taxes: [ITBMS 7%?].
3. Refund policy: [...].
4. Payout schedule to organizers: [...].

## 8. Design

[Brand colors, logo, typography, tone.] Mobile first (most buyers come from Instagram/WhatsApp),
large event imagery, dark or light theme [decide], fast pages (LCP < 2.5s).

## 9. Build order

1. Schema + auth + seed data.
2. Public pages (home, listing, detail).
3. Checkout + payment + email tickets.
4. Organizer dashboard + scanner.
5. Admin, blog, SEO, analytics.
6. QA: oversell test, payment webhook retries, mobile pass.
