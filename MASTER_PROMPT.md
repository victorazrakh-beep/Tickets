# Master Prompt: Events Now (v1.0, based on full analysis of eventos.divenue.com)

> Reference product: eventos.divenue.com (Panama). We replicate its **structure, flows, data model
> and feature set 1:1**. Brand name, logo, written copy, photos, legal texts and event data are
> **original to Events Now** (never copy Divenue's text, logo or images).
> Items marked **[NEED]** are decisions or credentials the owner must provide.

---

## 0. What the reference runs (verified from its code and public API, Oct 2026)

| Layer | Divenue uses | Evidence |
|---|---|---|
| Frontend | Next.js 14 App Router, React, Tailwind, mostly client-rendered pages | `_next` chunks, RSC payload |
| Hosting (web) | Vercel | `server: Vercel`, `x-vercel-id` |
| Backend API | Separate REST API on Railway (`divenue-api-production.up.railway.app`), called with axios + `Authorization: Bearer <supabase jwt>` | API client in bundle |
| Auth | Supabase Auth: email + password (signup with email confirmation, password reset) and Google OAuth; hCaptcha on login/signup | `signInWithPassword`, `signInWithOAuth({provider:"google"})`, `captchaToken` |
| Database | Supabase Postgres (tables seen: `events`, `ticket_tiers`, `ticket_orders`, tickets, users/profiles) | API response shape |
| Storage | Supabase Storage, public bucket (`/storage/v1/object/public/.../events/<uuid>.jpeg`) | `cover_url` |
| Realtime | Supabase Realtime (live updates, e.g. scanner/messages) + a Next route `/api/broadcast` | bundle |
| Payments | **Stripe** (live key) — Payment Element card form + **Express Checkout (Apple Pay / Google Pay)**; **Yappy** (Panama) via `/events/yappy/order`; free reservations; "pay at the venue" | `pk_live_`, `expressCheckout`, `payment_method: card / yappy / free` |
| Email | Resend (order confirmation, calendar invite `.ics`, reminders) | bundle strings |
| Translation | `/api/translate` Next route auto-translates event content ES ⇄ EN | bundle |
| Maps | Google Maps links + Places autocomplete via `/venues/places/autocomplete|details` | bundle |
| i18n | Client `LangProvider`, ~1,000 UI strings, EN/ES toggle in header | bundle |
| SEO | Organization JSON-LD, OG/Twitter tags, sitemap.xml, robots.txt (blocks private routes, allows AI crawlers), blog with `hreflang` es-PA / en | fetched files |
| Theme | Dark by default, light toggle stored in `localStorage` | inline script |

**Our stack (mirror it, simplified):** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui on
Vercel; Supabase (Auth, Postgres with RLS, Storage, Realtime); API as Next.js Route Handlers/Server
Actions (no separate Railway service unless needed); Stripe + Yappy behind a `PaymentProvider`
interface; Resend; hCaptcha (or Turnstile); Google Places. **Decided: Vercel + Supabase.**

---

## 1. Product summary

Events Now is a Spanish-first (ES/EN) ticketing + social platform for parties, concerts and events
in Panama.

1. **Buyers** browse, pick ticket tiers or tables, pay with Yappy, card, Apple Pay or Google Pay
   (or reserve free tickets), receive QR tickets by email, and find them later in "Mis entradas".
2. **Organizers** (any logged-in user) create events in a single long form, add tiers, promo codes,
   promoters and scanner staff, track sales, refund, and request payouts.
3. **Admins** moderate events before/after they go live and pick featured events.
4. **Community**: user profiles with @handles, follow, posts with likes/comments, event RSVP
   ("who's going"), feed, and direct messages.
5. **Events Now acts as the organizer's collection agent**: it collects payment, deducts the
   service fee, and pays out the rest.

---

## 2. Routes (match 1:1)

Public (indexable):
- `/` Home: hero with background photo + dark wash, headline, subtitle, two CTAs ("Explorar
  eventos", "Crear evento"), featured/upcoming events, marquee animation, footer.
- `/busqueda` Search & listing of events.
- `/e/[slug]` Event page (slug = name + 4-char suffix, e.g. `coco-disco-a8e0`).
- `/comunidad` Community feed.
- `/crear` Create event (landing + form; requires login to publish).
- `/blog`, `/blog/en`, `/blog/[slug]` (ES default, EN alternates with hreflang).
- `/u/[handle]` or `/@handle` public profile.
- Legal: terms, privacy, cookies, organizer agreement (original texts **[NEED]**).

Private (noindex, disallowed in robots.txt):
- `/tickets` My tickets · `/t/[token]` single ticket with QR · `/pedido/[id]` order status page
- `/permiso/[id]` parental consent signature page (minors)
- `/mis-eventos` organizer list · `/manage/[eventId]` organizer dashboard
- `/scan` door scanner (staff login with event + 5-digit PIN)
- `/mensajes` DMs · `/perfil` profile settings
- `/admin` moderation · `/admin/destacados` featured events

Header: logo, Find events, Venues (external, optional), My tickets, Create event, ES/EN toggle,
theme toggle, avatar/login. Footer columns: Events, Venues, Your tickets, Create event, Blog |
Tools: Scan tickets | Contact | Legal: Terms, Privacy, Cookies | © year.

---

## 3. Data model (Supabase Postgres)

### `events`
`id uuid, slug, name, description, starts_at, ends_at, date_tbd, time_tbd, location,
map_url, venue_map_url, cover_url, gallery_urls[], capacity, status
(draft | pending_review | live | closed | cancelled | rejected), created_at, organizer_id,
lineup jsonb [{name, time}], links jsonb[], music_url (Spotify), video_url (YouTube),
reglamento text, reglamento_pdf_url, whatsapp, yappy_phone,
requires_cedula, require_phone, require_gender, require_dob, require_parent_consent,
collect_ruc (invoice data), show_attendee_name, allow_refunds, calendar_invite,
event_reminder, featured, is_private, hide_whos_going,
fee_pct, fee_flat (per-event fee override; null = platform default)`

### `ticket_tiers`
`id, event_id, name, description, tier_type (ticket | table), price, currency (USD),
quantity, sold, admits (people per ticket, e.g. table of 6), min_per_order, max_per_order (10),
sales_start, sales_end, valid_until, sort_order, hidden (unlock by code/link),
show_remaining, sequential (next tier opens only when previous sells out — early bird),
deposit_mode (full | deposit), deposit_pct, variable_pricing (pay-what-you-want),
requires_approval (buyer requests, organizer accepts/rejects), app_exclusive`
Computed: `sold_out`.

### Others
- `profiles` (id = auth user, name, handle unique, avatar_url, phone, organizer_name,
  organizer_handle, organizer_verified, organizer_avatar_url, role user|admin)
- `ticket_orders` (id, event_id, buyer_id nullable, email, name, phone, cedula, gender, dob, ruc,
  payment_method card|yappy|free|venue, status pending|paid|failed|refunded|cancelled,
  subtotal, fee, total, deposit_amount, promo_code_id, promoter_id, provider_ref, created_at)
- `tickets` (id, order_id, tier_id, token unique (QR), attendee_name, status
  valid|used|refunded|void, checked_in_at, checked_in_by, transfer fields)
- `tier_requests` (approval-required tiers) · `tier_audit` (change log on tiers)
- `promo_codes` (event_id, code, type percent|fixed, value, max_uses, used, tier ids)
- `promoters` (event_id, name, ref_code; sales attributed via `/e/[slug]?ref=CODE`)
- `scanners` (event_id, name, pin hash) · `checkins`
- `consents` (ticket/order, guardian name, signature, signed_at)
- `payouts` (event_id, amount, status requested|paid, reference)
- Social: `posts`, `comments`, `post_likes`, `follows`, `rsvps` (going/interested), `seeds`
  (pre-seeded social content attached to events), `message_threads`, `messages` (read_at)

---

## 4. Event page `/e/[slug]`

Cover (or gallery), title, date/time (or "TBD"), location + Google Maps link, organizer card
(avatar, name, verified badge, follow), description, lineup with times, embedded Spotify / YouTube,
links, rules (text or PDF), age/consent notice, WhatsApp contact button, "who's going" avatars
(unless hidden), share button, RSVP, posts from the event, related events.
**Ticket panel**: tiers in `sort_order`, price, perks, remaining (if `show_remaining`), sold out /
sales closed / not yet open states, sequential lock, hidden tier unlock by code, quantity stepper
within min/max, table tiers, deposit tiers ("Deposit only"), variable price input, approval tiers
("Request tickets"), free tiers ("Reserve free tickets"). Total = subtotal + service fee shown
before paying. JSON-LD `Event`, OG image.

## 5. Checkout

1. Contact info: name, email, phone (prefilled if logged in; optional login). Extra fields only if
   the event requires them: cédula, gender, date of birth, RUC/invoice, attendee name per ticket.
2. Promo code field ("That code is not valid for this event").
3. Payment method selector:
   - **Yappy**: user enters Yappy number (8 digits, starts with 6 or 7) → backend creates Yappy
     order → user confirms in the Yappy app → webhook marks paid. Fallback message if it fails.
   - **Card**: Stripe Payment Element.
   - **Apple Pay / Google Pay**: Stripe Express Checkout button, shown only if the device
     supports it (`availablePaymentMethods`).
   - **Free**: reserve without payment. **Pay at venue**: for tables/deposits.
4. Detect in-app browsers (Instagram, Snapchat, TikTok) and show "Open in your browser" when
   wallets/payment won't work there.
5. Order page `/pedido/[id]`: pending → confirmed / failed, polling or realtime.
6. On success: tickets issued automatically, email with QR + `.ics` calendar invite, reminder
   email before the event; if parental consent required, guardian signs at `/permiso/[id]`.
7. Refunds: only card payments, only if `allow_refunds`; organizer can refund a ticket.

## 6. Organizer (`/crear`, `/mis-eventos`, `/manage/[id]`)

- **Create form** (one page): name, cover upload, gallery, dates (or TBD), location with Places
  autocomplete, capacity, description, lineup, music/video links, links, rules text/PDF,
  WhatsApp, Yappy number (where the organizer gets paid), checkboxes for all `require_*` and
  display options, tiers & tables, then submit. Organizer agreement must be accepted.
- **Manage**: edit details, tiers CRUD + drag reorder, promo codes, promoters (with sales per
  promoter), scanners (name + PIN), sales dashboard (gross, fees, net, tickets by tier, orders
  list), delete order/ticket, refund ticket, approve/reject tier requests, close sales, publish,
  request payout, attendee list, messages with buyers.

## 7. Scanner (`/scan`)

Staff log in with event + 5-digit PIN (`/events/scan/auth`), camera QR scan
(`/events/scan/checkin`), large green check (draw/pop/ring animation) or red error: "Ticket already
used", "Ticket not found", shows attendee name and tier, counter of checked-in vs sold.

## 8. Admin

Moderation queue (approve/reject with reason, emailed), suspend events, featured events
(`/admin/destacados`), refunds, payouts marked paid, user/organizer verification.

## 9. Community

Feed, posts (text + image), likes, comments, follow/unfollow, profiles by @handle, RSVP to events,
event posts, DMs with threads + unread badge (Supabase Realtime).

## 10. Business rules

- Currency USD. Platform service fee default **9% + US$1.00 per ticket, paid by the buyer**, shown
  as a separate line (Divenue's rate). Ours: **[NEED: your fee]** (stored as `fee_pct` +
  `fee_flat`, overridable per event).
- Max 10 tickets per order by default. Pending orders release stock after a timeout (10 min).
- Never oversell: stock decrement in a Postgres transaction (`SELECT … FOR UPDATE` / atomic
  RPC) at payment confirmation, with a short reservation at checkout start.
- Webhooks (Stripe, Yappy) are idempotent and the source of truth for "paid".

## 11. Design system (mirror the feel, not the brand)

Reference tokens (dark default / light):
`--bg #131519 / #eceef0`, `--surface #1c1f25 / #fff`, `--card #23272e / #fff`,
`--border #30353e / #e1e3e7`, `--accent #c7cdd6 / #3a3f47`, `--cta #f4f5f7 / #16181c`
(CTA text inverted), `--text-main #eceef1 / #14161a`, `--text-sub #9aa1ac / #5b616b`,
`--text-muted #6b7280`, `--danger #ff3b30`. Monochrome graphite look, no brand color.
Fonts: Archivo (headings), Inter (body), Gelasio (serif accents). Radii 16–26px cards,
pill buttons (999px). Animations: marquee, pulse, spin, check-draw/pop/ring (scanner).
Mobile first. Events Now may keep this structure but use its own accent **[NEED: logo, colors]**.

## 12. Build order

1. Supabase project, schema + RLS, seed 4 events; Next.js skeleton, theme, i18n, layout.
2. Public pages: home, search, event page, blog.
3. Auth (email + Google + captcha), profiles.
4. Checkout: Stripe card + Apple/Google Pay, Yappy, free; orders, tickets, QR, emails, `.ics`.
5. Organizer create + manage (tiers, codes, promoters, scanners, sales, refunds, payouts).
6. Scanner. 7. Admin. 8. Community + DMs. 9. Translation, SEO, analytics.
10. QA: oversell test, webhook retries, Apple Pay on real iPhone, in-app browsers, mobile.
