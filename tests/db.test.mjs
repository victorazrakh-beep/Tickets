import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "fs";
const db = new PGlite();
const R = process.argv[2] ?? ".";
await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql as 'select null::uuid';
create function gen_random_bytes(n int) returns bytea language sql as $$ select substring(decode(md5(random()::text) || md5(random()::text), 'hex') from 1 for n) $$;
create table storage.buckets (id text primary key, name text, public boolean);`);
for (const f of readdirSync(R + "/supabase/migrations").sort()) {
  await db.exec(readFileSync(R + "/supabase/migrations/" + f, "utf8").replace("create extension if not exists pgcrypto;", ""));
}
await db.exec(readFileSync(R + "/supabase/seed.sql", "utf8"));
const q = async (s, p) => (await db.query(s, p)).rows;
console.log("events", (await q("select count(*) from events"))[0], "tiers", (await q("select count(*) from ticket_tiers"))[0]);
const ev = (await q("select id from events where slug='noche-tropical-rooftop-x7k2'"))[0].id;
const tiers = await q("select id,name,price,quantity from ticket_tiers where event_id=$1 order by sort_order", [ev]);
const order = (items, extra = {}) => q("select * from create_order($1)", [JSON.stringify({ event_id: ev, email: "A@b.com", name: "Ana", payment_method: "mock", items, ...extra })]);
// 1. basic order: 2 General ($15) + 1 VIP ($45) → subtotal 75, fee = 2*(1.35+1)+ (4.05+1)=9.75
let [o] = await order([{ tier_id: tiers[0].id, quantity: 2 }, { tier_id: tiers[1].id, quantity: 1 }]);
console.log("order", o.code, o.subtotal, o.fee, o.total, o.amount_due_now, o.status);
console.log("reserved", (await q("select name,reserved,sold from ticket_tiers where event_id=$1 order by sort_order", [ev])));
let [c] = await q("select * from confirm_order($1,'mock','ref1')", [o.id]);
let [c2] = await q("select * from confirm_order($1,'mock','ref1')", [o.id]);
console.log("confirmed", c.status, "idempotent", c2.status, "tickets", (await q("select count(*) from tickets where order_id=$1", [o.id]))[0]);
// 2. promo
await q("insert into promo_codes(event_id,code,discount_type,value,max_uses) values($1,'MONTA10','percent',10,1)", [ev]);
[o] = await order([{ tier_id: tiers[0].id, quantity: 2 }], { promo_code: "monta10" });
console.log("promo order", o.subtotal, o.discount, o.fee, o.total);
await q("select confirm_order($1,'mock',null)", [o.id]);
try { await order([{ tier_id: tiers[0].id, quantity: 1 }], { promo_code: "MONTA10" }); console.log("BAD: promo reused"); } catch (e) { console.log("promo maxed ->", e.message); }
// 3. oversell: tables qty 10
for (let i = 0; i < 5; i++) await order([{ tier_id: tiers[2].id, quantity: 2 }]);
try { await order([{ tier_id: tiers[2].id, quantity: 1 }]); console.log("BAD: oversold"); } catch (e) { console.log("oversell ->", e.message); }
// 4. expiry frees stock
await q("update ticket_orders set expires_at = now() - interval '1 min' where status='pending'");
console.log("expired", (await q("select expire_stale_orders() n"))[0], (await q("select reserved from ticket_tiers where id=$1", [tiers[2].id]))[0]);
// 5. free order + method mismatch
const fest = (await q("select e.id, t.id tid from events e join ticket_tiers t on t.event_id=e.id where t.price=0"))[0];
let [f] = await q("select * from create_order($1)", [JSON.stringify({ event_id: fest.id, email: "k@b.com", name: "Kid", payment_method: "free", items: [{ tier_id: fest.tid, quantity: 2 }] })]);
console.log("free", f.total, f.fee);
try { await q("select * from create_order($1)", [JSON.stringify({ event_id: fest.id, email: "k@b.com", name: "Kid", payment_method: "mock", items: [{ tier_id: fest.tid, quantity: 2 }] })]); } catch (e) { console.log("mismatch ->", e.message); }
// 6. check-in
const tk = (await q("select token from tickets limit 1"))[0].token;
console.log((await q("select check_in($1,$2,'door') r", [ev, tk]))[0].r, (await q("select check_in($1,$2,'door') r", [ev, tk]))[0].r, (await q("select check_in($1,'nope','door') r", [ev]))[0].r);
// 6b. check-in by short code
const sc = (await q("select short_code from tickets where status='valid' and event_id=$1 limit 1", [ev]))[0].short_code;
console.log("short code", sc, /^[A-HJ-NP-Z2-9]{8}$/.test(sc), (await q("select check_in($1,$2,'door') r", [ev, sc.toLowerCase()]))[0].r.result);
// 7. void ticket frees stock
const t2 = (await q("select id, tier_id from tickets where status='valid' limit 1"))[0];
await q("select void_ticket($1,'refunded')", [t2.id]);
console.log("after refund sold", (await q("select sold from ticket_tiers where id=$1", [t2.tier_id]))[0]);
