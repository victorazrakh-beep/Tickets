-- Sample events (fictional). Dates are relative to when the seed runs; hours are Panama time (UTC-5).
with ev as (
  insert into public.events (slug, organizer_display_name, name, description, starts_at, ends_at,
    location, address, map_url, cover_url, capacity, status, featured, lineup, age_limit, whatsapp)
  values
  ('noche-tropical-rooftop-x7k2', 'Monta Demo', 'Noche Tropical Rooftop',
   E'Una noche de salsa, dembow y house bajo el cielo de Casco Viejo.\n\nDJs residentes toda la noche, coctelería de autor y la mejor vista de la bahía.',
   date_trunc('day', now()) + interval '5 days 21 hours' + interval '5 hours', date_trunc('day', now()) + interval '6 days 3 hours' + interval '5 hours',
   'Rooftop, Casco Viejo', 'Calle 3ra, Casco Viejo, Panamá',
   'https://www.google.com/maps/search/?api=1&query=Casco+Viejo+Panama',
   'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=70',
   300, 'live', true, '[{"name":"DJ Marea","time":"21:00"},{"name":"Sol & Luna b2b","time":"23:30"}]', 18, null),
  ('acustico-bajo-las-estrellas-m4p9', 'Monta Demo', 'Acústico Bajo las Estrellas',
   E'Un concierto íntimo al aire libre en la Calzada de Amador.\n\nTrae tu manta, nosotros ponemos la música.',
   date_trunc('day', now()) + interval '9 days 19 hours' + interval '5 hours', date_trunc('day', now()) + interval '9 days 22 hours' + interval '5 hours',
   'Calzada de Amador', 'Amador, Panamá',
   'https://www.google.com/maps/search/?api=1&query=Calzada+de+Amador',
   'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=70',
   400, 'live', true, '[{"name":"Lía Romero","time":"19:30"}]', null, null),
  ('festival-gastronomico-del-pacifico-q8r1', 'Monta Demo', 'Festival Gastronómico del Pacífico',
   E'Más de 30 cocinas locales, música en vivo y zona para niños.\n\nEl pase de degustación incluye 8 platos y una bebida.',
   date_trunc('day', now()) + interval '12 days 12 hours' + interval '5 hours', date_trunc('day', now()) + interval '12 days 20 hours' + interval '5 hours',
   'Costa del Este', 'Parque Costa del Este, Panamá',
   'https://www.google.com/maps/search/?api=1&query=Costa+del+Este+Panama',
   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=70',
   1000, 'live', false, '[]', null, null),
  ('clasico-de-futbol-sala-z3n5', 'Monta Demo', 'Clásico de Fútbol Sala',
   E'El clásico de la liga local de fútbol sala. Llega temprano, las gradas se llenan.',
   date_trunc('day', now()) + interval '6 days 16 hours' + interval '5 hours', date_trunc('day', now()) + interval '6 days 18 hours' + interval '5 hours',
   'Ciudad Deportiva', 'Ciudad Deportiva Irving Saladino, Panamá',
   'https://www.google.com/maps/search/?api=1&query=Ciudad+Deportiva+Irving+Saladino',
   'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=70',
   800, 'live', false, '[]', null, null)
  returning id, slug
)
insert into public.ticket_tiers (event_id, name, description, tier_type, price, quantity, admits, sort_order, max_per_order, show_remaining)
select ev.id, t.name, t.description, t.tier_type, t.price, t.quantity, t.admits, t.sort_order, t.max_per_order, t.show_remaining
from ev join (values
  ('noche-tropical-rooftop-x7k2', 'General', null, 'ticket', 15, 200, 1, 0, 10, false),
  ('noche-tropical-rooftop-x7k2', 'VIP open bar', 'Barra libre de 9 a 12', 'ticket', 45, 80, 1, 1, 10, true),
  ('noche-tropical-rooftop-x7k2', 'Mesa VIP (6 personas)', 'Botella incluida', 'table', 300, 10, 6, 2, 2, true),
  ('acustico-bajo-las-estrellas-m4p9', 'General', null, 'ticket', 25, 250, 1, 0, 10, false),
  ('acustico-bajo-las-estrellas-m4p9', 'Preferencial', 'Zona frente al escenario', 'ticket', 40, 100, 1, 1, 10, false),
  ('acustico-bajo-las-estrellas-m4p9', 'VIP primera fila', null, 'ticket', 70, 30, 1, 2, 4, true),
  ('festival-gastronomico-del-pacifico-q8r1', 'Entrada', null, 'ticket', 10, 700, 1, 0, 10, false),
  ('festival-gastronomico-del-pacifico-q8r1', 'Pase Degustación', '8 platos + 1 bebida', 'ticket', 30, 250, 1, 1, 10, false),
  ('festival-gastronomico-del-pacifico-q8r1', 'Niños (gratis)', 'Menores de 12 años', 'ticket', 0, 200, 1, 2, 6, false),
  ('clasico-de-futbol-sala-z3n5', 'Gradería', null, 'ticket', 8, 600, 1, 0, 10, false),
  ('clasico-de-futbol-sala-z3n5', 'Preferencial', null, 'ticket', 15, 150, 1, 1, 10, false),
  ('clasico-de-futbol-sala-z3n5', 'Palco', 'Palco para 4', 'table', 35, 20, 4, 2, 2, true)
) as t(slug, name, description, tier_type, price, quantity, admits, sort_order, max_per_order, show_remaining)
on t.slug = ev.slug;
