-- Scanner v2: PIN-only login (PINs unique platform-wide), shareable scanner link per event,
-- and a short typeable code on every ticket.

-- PINs are now hashed without the event, so a PIN alone identifies the event.
-- (No scanners existed when this ran; old rows would need to be recreated.)
delete from public.scanners;
alter table public.scanners drop column pin_hash;
alter table public.scanners add column pin_hash text not null unique;

-- Secret token for the "open scanner" link the organizer shares with staff.
alter table public.events add column scan_token text unique
  default translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_');
update public.events set scan_token = translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_')
  where scan_token is null;

-- Short code (8 chars, no look-alike characters) to type in when a QR can't be read.
create function public.new_short_code() returns text
language plpgsql set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text; b bytea;
begin
  loop
    b := gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.tickets where short_code = code);
  end loop;
  return code;
end $$;

alter table public.tickets add column short_code text unique;
update public.tickets set short_code = public.new_short_code() where short_code is null;
alter table public.tickets alter column short_code set default public.new_short_code();
alter table public.tickets alter column short_code set not null;

-- Check-in accepts the QR token or the short code.
create or replace function public.check_in(p_event_id uuid, p_token text, p_by text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare tk tickets; tier_name text;
begin
  select * into tk from tickets where token = p_token or short_code = upper(p_token) for update;
  if tk.id is null or tk.event_id <> p_event_id then
    return jsonb_build_object('result', 'not_found');
  end if;
  select name into tier_name from ticket_tiers where id = tk.tier_id;
  if tk.status = 'used' then
    return jsonb_build_object('result', 'already_used', 'name', tk.attendee_name,
                              'tier', tier_name, 'checked_in_at', tk.checked_in_at, 'token', tk.token);
  end if;
  if tk.status <> 'valid' then
    return jsonb_build_object('result', tk.status, 'name', tk.attendee_name, 'tier', tier_name, 'token', tk.token);
  end if;
  update tickets set status = 'used', checked_in_at = now(), checked_in_by = p_by where id = tk.id;
  return jsonb_build_object('result', 'ok', 'name', tk.attendee_name, 'tier', tier_name,
                            'admits', tk.admits, 'token', tk.token, 'checked_in_at', now());
end $$;

revoke execute on function public.check_in(uuid, text, text), public.new_short_code() from public, anon, authenticated;
