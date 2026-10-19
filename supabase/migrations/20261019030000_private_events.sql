-- Private events: hidden from listings and gated by one or more access passwords the
-- organizer shares (e.g. "familia2026"). Never sent to the browser.
alter table public.events add column access_passwords text[] not null default '{}';
