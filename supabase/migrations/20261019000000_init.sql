-- Xopa v1 schema. Apply with the Supabase GitHub integration or paste into the SQL editor.
-- All writes go through the Next.js server with the service role; RLS only exposes public reads.

create extension if not exists pgcrypto;

-- ───────────────────────── Profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  handle text unique,
  avatar_url text,
  phone text,
  organizer_name text,
  organizer_verified boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
          new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Settings ─────────────────────────
create table public.settings (
  id boolean primary key default true check (id),
  fee_pct numeric(5,2) not null default 9,
  fee_flat numeric(10,2) not null default 1.00,
  hold_minutes int not null default 10
);
insert into public.settings default values;

-- ───────────────────────── Events ─────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  organizer_id uuid references public.profiles (id) on delete set null,
  organizer_display_name text,           -- used when organizer_id is null (seed data)
  name text not null,
  description text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  date_tbd boolean not null default false,
  time_tbd boolean not null default false,
  location text not null default '',
  address text,
  map_url text,
  cover_url text,
  gallery_urls text[] not null default '{}',
  capacity int not null default 100,
  status text not null default 'pending_review'
    check (status in ('draft', 'pending_review', 'live', 'closed', 'cancelled', 'rejected')),
  review_note text,
  lineup jsonb not null default '[]',    -- [{name, time}]
  links jsonb not null default '[]',     -- [{label, url}]
  music_url text,
  video_url text,
  reglamento text,
  reglamento_pdf_url text,
  whatsapp text,
  yappy_phone text,
  age_limit int,
  requires_cedula boolean not null default false,
  require_phone boolean not null default false,
  require_gender boolean not null default false,
  require_dob boolean not null default false,
  require_parent_consent boolean not null default false,
  collect_ruc boolean not null default false,
  show_attendee_name boolean not null default true,
  allow_refunds boolean not null default false,
  calendar_invite boolean not null default true,
  event_reminder boolean not null default true,
  featured boolean not null default false,
  is_private boolean not null default false,
  hide_whos_going boolean not null default false,
  fee_pct numeric(5,2),                  -- null = platform default
  fee_flat numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_status_starts on public.events (status, starts_at);
create index events_organizer on public.events (organizer_id);

-- ───────────────────────── Ticket tiers ─────────────────────────
create table public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text,
  tier_type text not null default 'ticket' check (tier_type in ('ticket', 'table')),
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'USD',
  quantity int not null check (quantity >= 0),
  sold int not null default 0,
  reserved int not null default 0,       -- held by unpaid orders
  admits int not null default 1 check (admits >= 1),
  min_per_order int not null default 1,
  max_per_order int not null default 10,
  sales_start timestamptz,
  sales_end timestamptz,
  valid_until timestamptz,
  sort_order int not null default 0,
  hidden boolean not null default false,
  unlock_code text,                      -- reveals a hidden tier
  show_remaining boolean not null default false,
  sequential boolean not null default false, -- only on sale once earlier tiers sell out
  deposit_mode text not null default 'full' check (deposit_mode in ('full', 'deposit')),
  deposit_pct numeric(5,2),
  variable_pricing boolean not null default false, -- price = minimum
  requires_approval boolean not null default false,
  app_exclusive boolean not null default false,
  created_at timestamptz not null default now(),
  check (sold + reserved <= quantity)
);
create index tiers_event on public.ticket_tiers (event_id, sort_order);

-- ───────────────────────── Promo codes & promoters ─────────────────────────
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  max_uses int,
  used int not null default 0,
  tier_ids uuid[],                       -- null = all tiers
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table public.promoters (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

-- ───────────────────────── Orders & tickets ─────────────────────────
create table public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  event_id uuid not null references public.events (id),
  buyer_id uuid references public.profiles (id) on delete set null,
  email text not null,
  name text not null,
  phone text,
  cedula text,
  gender text,
  dob date,
  ruc text,
  payment_method text not null check (payment_method in ('card', 'yappy', 'free', 'venue', 'mock')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'refunded', 'cancelled')),
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  fee numeric(10,2) not null,
  total numeric(10,2) not null,
  amount_due_now numeric(10,2) not null, -- total, or deposit for deposit tiers
  promo_code_id uuid references public.promo_codes (id),
  promoter_id uuid references public.promoters (id),
  provider text,
  provider_ref text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index orders_event on public.ticket_orders (event_id, status);
create index orders_email on public.ticket_orders (lower(email));
create unique index orders_provider_ref on public.ticket_orders (provider, provider_ref) where provider_ref is not null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticket_orders (id) on delete cascade,
  tier_id uuid not null references public.ticket_tiers (id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_'),
  order_id uuid not null references public.ticket_orders (id) on delete cascade,
  event_id uuid not null references public.events (id),
  tier_id uuid not null references public.ticket_tiers (id),
  attendee_name text,
  admits int not null default 1,
  status text not null default 'valid' check (status in ('valid', 'used', 'refunded', 'void')),
  checked_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz not null default now()
);
create index tickets_event on public.tickets (event_id, status);

-- ───────────────────────── Staff, payouts ─────────────────────────
create table public.scanners (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  pin_hash text not null,
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  amount numeric(10,2) not null,
  status text not null default 'requested' check (status in ('requested', 'paid')),
  reference text,
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ───────────────────────── RLS: public reads only ─────────────────────────
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.events enable row level security;
alter table public.ticket_tiers enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promoters enable row level security;
alter table public.ticket_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.scanners enable row level security;
alter table public.payouts enable row level security;

create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "public live events" on public.events for select
  using (status in ('live', 'closed') and not is_private);
create policy "public tiers of live events" on public.ticket_tiers for select
  using (not hidden and exists (select 1 from public.events e
         where e.id = event_id and e.status in ('live', 'closed') and not e.is_private));

-- ───────────────────────── Order functions (atomic stock) ─────────────────────────

-- Release stock of unpaid orders past their hold.
create function public.expire_stale_orders() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; o record;
begin
  for o in select id from ticket_orders
           where status = 'pending' and expires_at < now() for update skip locked loop
    update ticket_tiers t set reserved = t.reserved - i.quantity
      from order_items i where i.order_id = o.id and t.id = i.tier_id;
    update ticket_orders set status = 'expired' where id = o.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- p: {event_id, buyer_id?, email, name, phone?, cedula?, gender?, dob?, ruc?, payment_method,
--     promo_code?, promoter_code?, unlock_code?, items: [{tier_id, quantity, amount?}]}
create function public.create_order(p jsonb) returns public.ticket_orders
language plpgsql security definer set search_path = public as $$
declare
  ev events; s settings; it jsonb; t ticket_tiers; promo promo_codes; prom promoters;
  o ticket_orders; qty int; unit numeric; line numeric;
  v_subtotal numeric := 0; v_discount numeric := 0; v_fee numeric := 0; due numeric := 0;
  eligible numeric := 0; tickets_count int := 0; f_pct numeric; f_flat numeric;
  earlier_left int;
begin
  perform expire_stale_orders();
  select * into ev from events where id = (p ->> 'event_id')::uuid;
  if ev.id is null or ev.status <> 'live' then raise exception 'EVENT_NOT_ON_SALE'; end if;
  select * into s from settings;
  f_pct := coalesce(ev.fee_pct, s.fee_pct);
  f_flat := coalesce(ev.fee_flat, s.fee_flat);

  if coalesce(p ->> 'promo_code', '') <> '' then
    select * into promo from promo_codes
     where event_id = ev.id and upper(code) = upper(p ->> 'promo_code') and active for update;
    if promo.id is null or (promo.max_uses is not null and promo.used >= promo.max_uses) then
      raise exception 'PROMO_INVALID';
    end if;
  end if;
  if coalesce(p ->> 'promoter_code', '') <> '' then
    select * into prom from promoters where event_id = ev.id and upper(code) = upper(p ->> 'promoter_code');
  end if;

  insert into ticket_orders (event_id, buyer_id, email, name, phone, cedula, gender, dob, ruc,
                             payment_method, subtotal, fee, total, amount_due_now,
                             promo_code_id, promoter_id, expires_at)
  values (ev.id, nullif(p ->> 'buyer_id', '')::uuid, lower(trim(p ->> 'email')), trim(p ->> 'name'),
          p ->> 'phone', p ->> 'cedula', p ->> 'gender', nullif(p ->> 'dob', '')::date, p ->> 'ruc',
          p ->> 'payment_method', 0, 0, 0, 0, promo.id, prom.id,
          now() + make_interval(mins => s.hold_minutes))
  returning * into o;

  for it in select * from jsonb_array_elements(p -> 'items') loop
    qty := (it ->> 'quantity')::int;
    if qty is null or qty <= 0 then continue; end if;
    select * into t from ticket_tiers where id = (it ->> 'tier_id')::uuid and event_id = ev.id for update;
    if t.id is null then raise exception 'TIER_NOT_FOUND'; end if;
    if t.requires_approval then raise exception 'TIER_REQUIRES_APPROVAL'; end if;
    if t.hidden and (t.unlock_code is null or upper(t.unlock_code) <> upper(coalesce(p ->> 'unlock_code', ''))) then
      raise exception 'TIER_NOT_FOUND';
    end if;
    if (t.sales_start is not null and now() < t.sales_start) or (t.sales_end is not null and now() > t.sales_end) then
      raise exception 'TIER_NOT_ON_SALE';
    end if;
    if t.sequential then
      select coalesce(sum(quantity - sold - reserved), 0) into earlier_left from ticket_tiers
       where event_id = ev.id and sort_order < t.sort_order and not hidden;
      if earlier_left > 0 then raise exception 'TIER_NOT_ON_SALE'; end if;
    end if;
    if qty < t.min_per_order or qty > t.max_per_order then raise exception 'QUANTITY_OUT_OF_RANGE'; end if;
    if t.quantity - t.sold - t.reserved < qty then raise exception 'SOLD_OUT'; end if;

    unit := t.price;
    if t.variable_pricing then
      unit := greatest(t.price, coalesce((it ->> 'amount')::numeric, t.price));
    end if;
    line := unit * qty;
    v_subtotal := v_subtotal + line;
    if promo.id is not null and (promo.tier_ids is null or t.id = any (promo.tier_ids)) then
      eligible := eligible + line;
    end if;
    if unit > 0 then v_fee := v_fee + qty * (round(unit * f_pct / 100, 2) + f_flat); end if;
    due := due + case when t.deposit_mode = 'deposit' and t.deposit_pct is not null
                      then round(line * t.deposit_pct / 100, 2) else line end;
    tickets_count := tickets_count + qty;

    update ticket_tiers set reserved = reserved + qty where id = t.id;
    insert into order_items (order_id, tier_id, quantity, unit_price) values (o.id, t.id, qty, unit);
  end loop;

  if tickets_count = 0 then raise exception 'EMPTY_ORDER'; end if;
  if promo.id is not null then
    if eligible = 0 then raise exception 'PROMO_INVALID'; end if;
    v_discount := least(eligible, case when promo.discount_type = 'percent'
                                     then round(eligible * promo.value / 100, 2) else promo.value end);
  end if;
  if v_subtotal - v_discount = 0 then v_fee := 0; end if;
  if (v_subtotal - v_discount = 0) <> (p ->> 'payment_method' = 'free') then
    raise exception 'PAYMENT_METHOD_MISMATCH';
  end if;
  -- v_discount and v_fee are charged now; the deposit only reduces the ticket portion
  due := greatest(due - v_discount, 0) + v_fee;

  update ticket_orders set subtotal = v_subtotal, discount = v_discount, fee = v_fee,
         total = v_subtotal - v_discount + v_fee, amount_due_now = due
   where id = o.id returning * into o;
  return o;
end $$;

-- Mark paid and issue tickets. Idempotent.
create function public.confirm_order(p_order_id uuid, p_provider text, p_ref text)
returns public.ticket_orders
language plpgsql security definer set search_path = public as $$
declare o ticket_orders; i record; n int;
begin
  select * into o from ticket_orders where id = p_order_id for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status = 'paid' then return o; end if;
  if o.status = 'expired' then
    -- payment arrived after the hold expired: re-reserve if stock allows
    for i in select * from order_items where order_id = o.id loop
      update ticket_tiers set reserved = reserved + i.quantity
       where id = i.tier_id and quantity - sold - reserved >= i.quantity;
      if not found then raise exception 'SOLD_OUT_AFTER_EXPIRY'; end if;
    end loop;
  elsif o.status <> 'pending' then
    raise exception 'ORDER_NOT_PAYABLE';
  end if;

  for i in select oi.*, t.admits from order_items oi join ticket_tiers t on t.id = oi.tier_id
           where oi.order_id = o.id loop
    update ticket_tiers set reserved = reserved - i.quantity, sold = sold + i.quantity where id = i.tier_id;
    for n in 1..i.quantity loop
      insert into tickets (order_id, event_id, tier_id, attendee_name, admits)
      values (o.id, o.event_id, i.tier_id, o.name, i.admits);
    end loop;
  end loop;
  if o.promo_code_id is not null then
    update promo_codes set used = used + 1 where id = o.promo_code_id;
  end if;
  update ticket_orders set status = 'paid', paid_at = now(), provider = p_provider,
         provider_ref = coalesce(p_ref, provider_ref), expires_at = null
   where id = o.id returning * into o;
  return o;
end $$;

-- Payment failed or cancelled: return stock.
create function public.fail_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update ticket_tiers t set reserved = t.reserved - i.quantity
    from order_items i, ticket_orders o
   where o.id = p_order_id and o.status = 'pending' and i.order_id = o.id and t.id = i.tier_id;
  update ticket_orders set status = 'failed' where id = p_order_id and status = 'pending';
end $$;

-- Refund / void a single ticket: frees one seat of stock.
create function public.void_ticket(p_ticket_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare tk tickets;
begin
  update tickets set status = p_status where id = p_ticket_id and status = 'valid' returning * into tk;
  if tk.id is not null then
    update ticket_tiers set sold = sold - 1 where id = tk.tier_id;
  end if;
end $$;

-- Check-in: atomic, so a ticket can only be used once.
create function public.check_in(p_event_id uuid, p_token text, p_by text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare tk tickets; tier_name text;
begin
  select * into tk from tickets where token = p_token for update;
  if tk.id is null or tk.event_id <> p_event_id then
    return jsonb_build_object('result', 'not_found');
  end if;
  select name into tier_name from ticket_tiers where id = tk.tier_id;
  if tk.status = 'used' then
    return jsonb_build_object('result', 'already_used', 'name', tk.attendee_name,
                              'tier', tier_name, 'checked_in_at', tk.checked_in_at);
  end if;
  if tk.status <> 'valid' then
    return jsonb_build_object('result', tk.status, 'name', tk.attendee_name, 'tier', tier_name);
  end if;
  update tickets set status = 'used', checked_in_at = now(), checked_in_by = p_by where id = tk.id;
  return jsonb_build_object('result', 'ok', 'name', tk.attendee_name, 'tier', tier_name, 'admits', tk.admits);
end $$;

revoke execute on function public.create_order(jsonb), public.confirm_order(uuid, text, text),
  public.fail_order(uuid), public.void_ticket(uuid, text), public.check_in(uuid, text, text),
  public.expire_stale_orders() from public, anon, authenticated;

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public) values ('event-media', 'event-media', true)
  on conflict (id) do nothing;
