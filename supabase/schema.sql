-- Italy Beyond Summer — starter database schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Partner travel agencies (Norway / Sweden / Denmark)
-- ─────────────────────────────────────────────────────────────
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null check (country in ('NO', 'SE', 'DK')),
  contact_email text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- One row per logged-in user, extending Supabase's built-in auth.users.
-- role determines what part of the platform they see.
-- ─────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('agency', 'supplier', 'guide', 'admin')),
  full_name text,
  agency_id uuid references agencies (id),
  created_at timestamptz not null default now()
);

-- Automatically create a profile row whenever someone signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'agency'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Calabrian suppliers (hotels, restaurants, wineries, guides, transport, ...)
-- ─────────────────────────────────────────────────────────────
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  base_region text not null,
  short_description text,
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Bookable travel packages
-- ─────────────────────────────────────────────────────────────
create table packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  package_type text not null check (package_type in ('opplevelsesreise', 'firma', 'bryllup')),
  nights int not null,
  base_region text not null,
  price_eur numeric(10, 2) not null,
  description text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- An agency's request to book a package for a group
-- ─────────────────────────────────────────────────────────────
create table reservation_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  package_id uuid not null references packages (id),
  travel_month date not null,
  group_size int not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — every table is locked down by default;
-- these policies open exactly the access each role needs.
-- ─────────────────────────────────────────────────────────────
alter table agencies enable row level security;
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table packages enable row level security;
alter table reservation_requests enable row level security;

-- Packages are the public catalog — any signed-in user can browse them.
create policy "Packages are readable by signed-in users"
  on packages for select
  to authenticated
  using (true);

-- A user can read their own profile.
create policy "Users can read their own profile"
  on profiles for select
  to authenticated
  using (id = auth.uid());

-- A user can read their own agency's record.
create policy "Users can read their own agency"
  on agencies for select
  to authenticated
  using (
    id in (select agency_id from profiles where profiles.id = auth.uid())
  );

-- Agencies can read and create their own reservation requests only.
create policy "Agencies can read their own reservation requests"
  on reservation_requests for select
  to authenticated
  using (
    agency_id in (select agency_id from profiles where profiles.id = auth.uid())
  );

create policy "Agencies can create their own reservation requests"
  on reservation_requests for insert
  to authenticated
  with check (
    agency_id in (select agency_id from profiles where profiles.id = auth.uid())
  );

-- Active suppliers are visible to any signed-in user (used on supplier-facing pages later).
create policy "Active suppliers are readable by signed-in users"
  on suppliers for select
  to authenticated
  using (status = 'active');

-- ─────────────────────────────────────────────────────────────
-- Multi-language supplier profiles.
-- One row per (supplier, language). The supplier's own source-language
-- row goes live immediately (is_source = true); the three AI-translated
-- rows start as 'pending_review' and only become visible to agencies
-- once an admin approves them.
-- ─────────────────────────────────────────────────────────────
alter table profiles add column if not exists supplier_id uuid references suppliers (id);

create table supplier_translations (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  language text not null check (language in ('no', 'sv', 'da', 'en')),
  is_source boolean not null default false,
  name text,
  short_description text,
  long_description text,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'rejected')),
  translated_by text not null default 'human' check (translated_by in ('human', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, language)
);

alter table supplier_translations enable row level security;

-- A supplier can read all of their own translation rows, whatever status.
create policy "Suppliers can read their own translations"
  on supplier_translations for select
  to authenticated
  using (
    supplier_id in (select supplier_id from profiles where profiles.id = auth.uid())
  );

-- A supplier can create their own translation rows.
create policy "Suppliers can insert their own translations"
  on supplier_translations for insert
  to authenticated
  with check (
    supplier_id in (select supplier_id from profiles where profiles.id = auth.uid())
  );

-- A supplier can always edit their own rows (including re-editing their
-- live source text). But writing an AI-translated row (is_source = false)
-- can never leave it marked 'approved' — that would let a supplier
-- silently bypass admin review; a resubmit must go back to pending_review.
create policy "Suppliers can update their own translations"
  on supplier_translations for update
  to authenticated
  using (
    supplier_id in (select supplier_id from profiles where profiles.id = auth.uid())
  )
  with check (
    supplier_id in (select supplier_id from profiles where profiles.id = auth.uid())
    and (is_source = true or status <> 'approved')
  );

-- Any signed-in user (agencies) can read approved translations, plus the
-- supplier's own source-language text, which is live immediately.
create policy "Approved and source translations are readable by signed-in users"
  on supplier_translations for select
  to authenticated
  using (status = 'approved' or is_source = true);

-- Admins can read and update every translation row (the approve/reject path).
create policy "Admins can read all translations"
  on supplier_translations for select
  to authenticated
  using (
    (select role from profiles where profiles.id = auth.uid()) = 'admin'
  );

create policy "Admins can update all translations"
  on supplier_translations for update
  to authenticated
  using (
    (select role from profiles where profiles.id = auth.uid()) = 'admin'
  );

-- ─────────────────────────────────────────────────────────────
-- Stage E: fuller supplier profiles — images, address, price, and
-- what's included in the price. Category/price/address are one value
-- per supplier (not per language); only free text gets translated.
-- ─────────────────────────────────────────────────────────────
alter table suppliers add column if not exists price_per_person numeric(10, 2);
alter table suppliers add column if not exists address text;
alter table suppliers add column if not exists logo_url text;

-- Suppliers previously had no way to edit their own row at all.
drop policy if exists "Suppliers can update their own supplier row" on suppliers;
create policy "Suppliers can update their own supplier row"
  on suppliers for update
  to authenticated
  using (id in (select supplier_id from profiles where profiles.id = auth.uid()))
  with check (id in (select supplier_id from profiles where profiles.id = auth.uid()));

-- Gallery images (separate from the single logo_url above).
create table if not exists supplier_images (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table supplier_images enable row level security;

drop policy if exists "Supplier images are readable by signed-in users" on supplier_images;
create policy "Supplier images are readable by signed-in users"
  on supplier_images for select
  to authenticated
  using (true);

drop policy if exists "Suppliers can manage their own images" on supplier_images;
create policy "Suppliers can manage their own images"
  on supplier_images for all
  to authenticated
  using (supplier_id in (select supplier_id from profiles where profiles.id = auth.uid()))
  with check (supplier_id in (select supplier_id from profiles where profiles.id = auth.uid()));

drop policy if exists "Admins can manage all images" on supplier_images;
create policy "Admins can manage all images"
  on supplier_images for all
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

-- Italian is now allowed as a language (source-only in practice — the
-- supplier writes in it, but agencies only ever see no/sv/da/en).
alter table supplier_translations drop constraint if exists supplier_translations_language_check;
alter table supplier_translations add constraint supplier_translations_language_check
  check (language in ('it', 'no', 'sv', 'da', 'en'));

-- "name" was the profile's marketing title, easy to confuse with
-- suppliers.name (the internal/admin name) — renamed for clarity.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'supplier_translations' and column_name = 'name'
  ) then
    alter table supplier_translations rename column name to headline;
  end if;
end $$;

-- Consolidate short/long description into one field, and add what's
-- included in the price (translated free text, same as the description).
alter table supplier_translations drop column if exists short_description;
alter table supplier_translations drop column if exists long_description;
alter table supplier_translations add column if not exists description text;
alter table supplier_translations add column if not exists price_includes text;

-- Storage bucket for logos and gallery photos. Public read (images aren't
-- sensitive and agencies need to see them); write restricted to the
-- owning supplier via a "{supplier_id}/..." path prefix.
insert into storage.buckets (id, name, public)
values ('supplier-media', 'supplier-media', true)
on conflict (id) do nothing;

drop policy if exists "Supplier media is publicly readable" on storage.objects;
create policy "Supplier media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'supplier-media');

drop policy if exists "Suppliers can upload their own media" on storage.objects;
create policy "Suppliers can upload their own media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'supplier-media'
    and (storage.foldername(name))[1] = (select supplier_id::text from profiles where profiles.id = auth.uid())
  );

drop policy if exists "Suppliers can update their own media" on storage.objects;
create policy "Suppliers can update their own media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'supplier-media'
    and (storage.foldername(name))[1] = (select supplier_id::text from profiles where profiles.id = auth.uid())
  );

drop policy if exists "Suppliers can delete their own media" on storage.objects;
create policy "Suppliers can delete their own media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'supplier-media'
    and (storage.foldername(name))[1] = (select supplier_id::text from profiles where profiles.id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Stage F: admin write access. packages and suppliers had no admin
-- write policies at all yet, and reservation_requests only let an
-- agency see/insert its own rows — admin needs the full picture.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Admins can read all agencies" on agencies;
create policy "Admins can read all agencies"
  on agencies for select
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Admins can manage packages" on packages;
create policy "Admins can manage packages"
  on packages for all
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin')
  with check ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Admins can read all suppliers" on suppliers;
create policy "Admins can read all suppliers"
  on suppliers for select
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Admins can update all suppliers" on suppliers;
create policy "Admins can update all suppliers"
  on suppliers for update
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin')
  with check ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Admins can read all reservation requests" on reservation_requests;
create policy "Admins can read all reservation requests"
  on reservation_requests for select
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Admins can update all reservation requests" on reservation_requests;
create policy "Admins can update all reservation requests"
  on reservation_requests for update
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin')
  with check ((select role from profiles where profiles.id = auth.uid()) = 'admin');

-- ─────────────────────────────────────────────────────────────
-- Stage G: agency (customer) self-serve registration + profile.
-- Signup used to only create a profiles row with agency_id left null
-- forever unless linked manually. Now handle_new_user() also creates a
-- placeholder agencies row for role = 'agency' signups and links it.
-- ─────────────────────────────────────────────────────────────
alter table agencies add column if not exists address text;
alter table agencies add column if not exists city text;
alter table agencies add column if not exists mobile_phone text;
alter table agencies add column if not exists billing_address text;
alter table agencies add column if not exists electronic_invoice_address text;
alter table agencies add column if not exists logo_url text;

-- country isn't collected at signup anymore, only on the completion form.
alter table agencies alter column country drop not null;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_agency_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'role', 'agency') = 'agency' then
    insert into public.agencies (name, contact_email)
    values (
      coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
      new.email
    )
    returning id into new_agency_id;
  end if;

  insert into public.profiles (id, role, full_name, agency_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'agency'),
    new.raw_user_meta_data ->> 'full_name',
    new_agency_id
  );
  return new;
end;
$$ language plpgsql security definer;

drop policy if exists "Agencies can update their own agency" on agencies;
create policy "Agencies can update their own agency"
  on agencies for update
  to authenticated
  using (id in (select agency_id from profiles where profiles.id = auth.uid()))
  with check (id in (select agency_id from profiles where profiles.id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('agency-media', 'agency-media', true)
on conflict (id) do nothing;

drop policy if exists "Agency media is publicly readable" on storage.objects;
create policy "Agency media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'agency-media');

drop policy if exists "Agencies can upload their own media" on storage.objects;
create policy "Agencies can upload their own media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'agency-media'
    and (storage.foldername(name))[1] = (select agency_id::text from profiles where profiles.id = auth.uid())
  );

drop policy if exists "Agencies can update their own media" on storage.objects;
create policy "Agencies can update their own media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'agency-media'
    and (storage.foldername(name))[1] = (select agency_id::text from profiles where profiles.id = auth.uid())
  );

drop policy if exists "Agencies can delete their own media" on storage.objects;
create policy "Agencies can delete their own media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'agency-media'
    and (storage.foldername(name))[1] = (select agency_id::text from profiles where profiles.id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Stage H: hotel room types. Hotels price per room/night, not per
-- person like the rest of the suppliers, and need a single-room
-- price supplement — so this is a separate table, not a suppliers column.
-- ─────────────────────────────────────────────────────────────
create table if not exists hotel_room_types (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  name text not null,
  capacity int not null default 2,
  price_per_night numeric(10, 2),
  single_supplement numeric(10, 2),
  description text,
  created_at timestamptz not null default now()
);

alter table hotel_room_types enable row level security;

drop policy if exists "Room types are readable by signed-in users" on hotel_room_types;
create policy "Room types are readable by signed-in users"
  on hotel_room_types for select
  to authenticated
  using (true);

drop policy if exists "Suppliers can manage their own room types" on hotel_room_types;
create policy "Suppliers can manage their own room types"
  on hotel_room_types for all
  to authenticated
  using (supplier_id in (select supplier_id from profiles where profiles.id = auth.uid()))
  with check (supplier_id in (select supplier_id from profiles where profiles.id = auth.uid()));

drop policy if exists "Admins can manage all room types" on hotel_room_types;
create policy "Admins can manage all room types"
  on hotel_room_types for all
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

-- ─────────────────────────────────────────────────────────────
-- A few starter packages so the dashboard has real data to show.
-- ─────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────
-- Stage J: packages ↔ suppliers. Packages and suppliers were fully
-- separate until now — this lets admin link which suppliers/activities
-- make up a package, so agencies can click through from a package to
-- each included supplier's profile.
-- ─────────────────────────────────────────────────────────────
create table if not exists package_suppliers (
  package_id uuid not null references packages (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  sort_order int not null default 0,
  primary key (package_id, supplier_id)
);

alter table package_suppliers enable row level security;

drop policy if exists "Package suppliers are readable by signed-in users" on package_suppliers;
create policy "Package suppliers are readable by signed-in users"
  on package_suppliers for select
  to authenticated
  using (true);

drop policy if exists "Admins can manage package suppliers" on package_suppliers;
create policy "Admins can manage package suppliers"
  on package_suppliers for all
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin')
  with check ((select role from profiles where profiles.id = auth.uid()) = 'admin');

insert into packages (title, package_type, nights, base_region, price_eur, description) values
  ('Calabria Food & Wine', 'opplevelsesreise', 4, 'lamezia-tropea', 895.00, 'Wine, olive oil and cheese tastings across the Lamezia–Tropea coast.'),
  ('Olive Oil & Gastronomy', 'opplevelsesreise', 3, 'reggio-locride', 745.00, 'Groves, harvest and tastings in the Locride hills.'),
  ('Authentic Calabria', 'opplevelsesreise', 7, 'cosenza-sila', 1395.00, 'From Lamezia/Tropea to Cosenza and the Sila plateau.'),
  ('Nature & Wellness', 'opplevelsesreise', 4, 'cosenza-sila', 995.00, 'Sila national park and spa.'),
  ('Premium Calabria', 'opplevelsesreise', 7, 'reggio-locride', 2195.00, 'Private transfers and boutique hotels.'),
  ('Calabria Firmatur & Konferanse', 'firma', 3, 'lamezia-tropea', 1195.00, 'Build-your-own corporate and conference days.');

-- ─────────────────────────────────────────────────────────────
-- Stage K1: pricing engine. Daily EUR exchange rates, cached in the
-- database (lazily fetched by the app on first use each day — no cron
-- infrastructure yet since this app isn't deployed).
-- ─────────────────────────────────────────────────────────────
create table if not exists exchange_rates (
  id date primary key,
  eur_to_nok numeric(10, 4) not null,
  eur_to_sek numeric(10, 4) not null,
  eur_to_dkk numeric(10, 4) not null,
  fetched_at timestamptz not null default now()
);

alter table exchange_rates enable row level security;

drop policy if exists "Signed-in users can read exchange rates" on exchange_rates;
create policy "Signed-in users can read exchange rates"
  on exchange_rates for select
  to authenticated
  using (true);

drop policy if exists "Signed-in users can cache today's exchange rate" on exchange_rates;
create policy "Signed-in users can cache today's exchange rate"
  on exchange_rates for insert
  to authenticated
  with check (true);

-- ─────────────────────────────────────────────────────────────
-- Stage K3: price snapshot on reservation requests, so historical sales
-- figures stay accurate even as supplier prices or FX rates change later.
-- ─────────────────────────────────────────────────────────────
alter table reservation_requests add column if not exists price_eur_snapshot numeric(10, 2);
alter table reservation_requests add column if not exists supplier_cost_eur_snapshot numeric(10, 2);
alter table reservation_requests add column if not exists currency text;
alter table reservation_requests add column if not exists converted_amount numeric(10, 2);

-- ─────────────────────────────────────────────────────────────
-- Stage K4: build-your-own package. An agency picks a region, nights,
-- and suppliers/activities, and submits it as a quote request — no
-- self-service checkout, admin follows up with pricing.
-- ─────────────────────────────────────────────────────────────
create table if not exists custom_package_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id),
  base_region text not null,
  nights int not null,
  group_size int,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists custom_package_request_suppliers (
  request_id uuid not null references custom_package_requests (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  primary key (request_id, supplier_id)
);

alter table custom_package_requests enable row level security;
alter table custom_package_request_suppliers enable row level security;

drop policy if exists "Agencies can read their own custom requests" on custom_package_requests;
create policy "Agencies can read their own custom requests"
  on custom_package_requests for select
  to authenticated
  using (agency_id in (select agency_id from profiles where profiles.id = auth.uid()));

drop policy if exists "Agencies can create their own custom requests" on custom_package_requests;
create policy "Agencies can create their own custom requests"
  on custom_package_requests for insert
  to authenticated
  with check (agency_id in (select agency_id from profiles where profiles.id = auth.uid()));

drop policy if exists "Admins can read all custom requests" on custom_package_requests;
create policy "Admins can read all custom requests"
  on custom_package_requests for select
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Admins can update all custom requests" on custom_package_requests;
create policy "Admins can update all custom requests"
  on custom_package_requests for update
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin')
  with check ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Signed-in users can read custom request suppliers" on custom_package_request_suppliers;
create policy "Signed-in users can read custom request suppliers"
  on custom_package_request_suppliers for select
  to authenticated
  using (true);

drop policy if exists "Agencies can add suppliers to their own custom requests" on custom_package_request_suppliers;
create policy "Agencies can add suppliers to their own custom requests"
  on custom_package_request_suppliers for insert
  to authenticated
  with check (
    request_id in (
      select id from custom_package_requests
      where agency_id in (select agency_id from profiles where profiles.id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Stage L: admin can fully manage a supplier's profile on their behalf
-- (fill it in for suppliers who need help). Admin already had select/
-- update on supplier_translations; insert and the supplier-media storage
-- policies were still owner-only.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Admins can insert translations" on supplier_translations;
create policy "Admins can insert translations"
  on supplier_translations for insert
  to authenticated
  with check ((select role from profiles where profiles.id = auth.uid()) = 'admin');

drop policy if exists "Admins can upload any supplier media" on storage.objects;
create policy "Admins can upload any supplier media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'supplier-media'
    and (select role from profiles where profiles.id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can update any supplier media" on storage.objects;
create policy "Admins can update any supplier media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'supplier-media'
    and (select role from profiles where profiles.id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can delete any supplier media" on storage.objects;
create policy "Admins can delete any supplier media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'supplier-media'
    and (select role from profiles where profiles.id = auth.uid()) = 'admin'
  );

-- ─────────────────────────────────────────────────────────────
-- Stage M: single-room occupancy actually affects the computed price.
-- A hotel's single_supplement (set on each room type) is added on top of
-- the per-person, per-night rate only when the traveller books that room
-- alone rather than sharing — both booking paths (a standard package
-- reservation, and a build-your-own request) need to record whether a
-- single room was requested so the snapshot/quote reflects it.
-- ─────────────────────────────────────────────────────────────
alter table reservation_requests add column if not exists single_room boolean not null default false;
alter table custom_package_requests add column if not exists single_room boolean not null default false;

-- ─────────────────────────────────────────────────────────────
-- Stage N: hotel room photos, star rating, and room ordering.
-- ─────────────────────────────────────────────────────────────
alter table suppliers add column if not exists star_rating int;
alter table suppliers drop constraint if exists suppliers_star_rating_check;
alter table suppliers add constraint suppliers_star_rating_check
  check (star_rating is null or (star_rating between 1 and 5));

alter table hotel_room_types add column if not exists sort_order int not null default 0;

-- One row per room-type photo. Reuses the supplier-media bucket under
-- "{supplier_id}/rooms/{room_type_id}/..." — the existing storage
-- policies already scope on the first path segment being the supplier's
-- own id, so no new storage policy is needed.
create table if not exists hotel_room_images (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references hotel_room_types (id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table hotel_room_images enable row level security;

drop policy if exists "Room images are readable by signed-in users" on hotel_room_images;
create policy "Room images are readable by signed-in users"
  on hotel_room_images for select
  to authenticated
  using (true);

drop policy if exists "Suppliers can manage their own room images" on hotel_room_images;
create policy "Suppliers can manage their own room images"
  on hotel_room_images for all
  to authenticated
  using (
    room_type_id in (
      select id from hotel_room_types
      where supplier_id in (select supplier_id from profiles where profiles.id = auth.uid())
    )
  )
  with check (
    room_type_id in (
      select id from hotel_room_types
      where supplier_id in (select supplier_id from profiles where profiles.id = auth.uid())
    )
  );

drop policy if exists "Admins can manage all room images" on hotel_room_images;
create policy "Admins can manage all room images"
  on hotel_room_images for all
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

-- ─────────────────────────────────────────────────────────────
-- Stage O: a 1-5 price/quality rating for every non-Hotel supplier.
-- Hotels already carry an official star_rating; this is admin's own
-- judgment call on value for money for everything else (wineries,
-- guides, restaurants, ...), shown the same way star_rating is.
-- ─────────────────────────────────────────────────────────────
alter table suppliers add column if not exists quality_rating int;
alter table suppliers drop constraint if exists suppliers_quality_rating_check;
alter table suppliers add constraint suppliers_quality_rating_check
  check (quality_rating is null or (quality_rating between 1 and 5));

-- ─────────────────────────────────────────────────────────────
-- Stage P: supplier capacity confirmation. Every supplier linked to a
-- booking request (catalog reservation or build-your-own) is asked
-- "can you take this group on these dates?" — once all of them say yes,
-- the agency gets Book/Cancel buttons; when they pick one, every
-- supplier sees the outcome next time they load their requests page.
--
-- Polymorphic on purpose: reservation_requests and custom_package_requests
-- are two different tables, and every consumer of this data (the
-- supplier's own list, the agency's "my requests" list, admin's read-only
-- summary) needs to treat both the same way. A single request_id column
-- can't have a real foreign key to two different tables, so a trigger
-- checks it points at a real row in the right one instead.
-- ─────────────────────────────────────────────────────────────
create table if not exists booking_supplier_confirmations (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('reservation', 'custom')),
  request_id uuid not null,
  supplier_id uuid not null references suppliers (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'yes', 'no')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_type, request_id, supplier_id)
);

create or replace function check_confirmation_request_exists() returns trigger as $$
begin
  if new.request_type = 'reservation' then
    if not exists (select 1 from reservation_requests where id = new.request_id) then
      raise exception 'Invalid reservation_request id: %', new.request_id;
    end if;
  else
    if not exists (select 1 from custom_package_requests where id = new.request_id) then
      raise exception 'Invalid custom_package_request id: %', new.request_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists check_confirmation_request on booking_supplier_confirmations;
create trigger check_confirmation_request
  before insert on booking_supplier_confirmations
  for each row execute function check_confirmation_request_exists();

alter table booking_supplier_confirmations enable row level security;

drop policy if exists "Suppliers can read their own confirmations" on booking_supplier_confirmations;
create policy "Suppliers can read their own confirmations"
  on booking_supplier_confirmations for select
  to authenticated
  using (supplier_id in (select supplier_id from profiles where profiles.id = auth.uid()));

drop policy if exists "Admins can read all confirmations" on booking_supplier_confirmations;
create policy "Admins can read all confirmations"
  on booking_supplier_confirmations for select
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

-- Scoped, not wide-open: these rows are created by the agency's own
-- session right after they submit a request, so the check just confirms
-- the request being pointed at actually belongs to that agency — an open
-- `with check (true)` would let an agency forge a "yes" for a supplier
-- it doesn't own.
drop policy if exists "Agencies can create confirmations for their own requests" on booking_supplier_confirmations;
create policy "Agencies can create confirmations for their own requests"
  on booking_supplier_confirmations for insert
  to authenticated
  with check (
    (
      request_type = 'reservation'
      and request_id in (
        select id from reservation_requests
        where agency_id in (select agency_id from profiles where profiles.id = auth.uid())
      )
    )
    or (
      request_type = 'custom'
      and request_id in (
        select id from custom_package_requests
        where agency_id in (select agency_id from profiles where profiles.id = auth.uid())
      )
    )
  );

drop policy if exists "Suppliers can update their own confirmations" on booking_supplier_confirmations;
create policy "Suppliers can update their own confirmations"
  on booking_supplier_confirmations for update
  to authenticated
  using (supplier_id in (select supplier_id from profiles where profiles.id = auth.uid()))
  with check (supplier_id in (select supplier_id from profiles where profiles.id = auth.uid()));

drop policy if exists "Admins can update all confirmations" on booking_supplier_confirmations;
create policy "Admins can update all confirmations"
  on booking_supplier_confirmations for update
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

-- custom_package_requests gets the same confirmed/cancelled outcome
-- values reservation_requests already has, so the agency's Book/Cancel
-- action can reuse the one status column instead of a parallel one.
-- Admin's existing Mark contacted / Close buttons are untouched.
alter table custom_package_requests drop constraint if exists custom_package_requests_status_check;
alter table custom_package_requests add constraint custom_package_requests_status_check
  check (status in ('pending', 'contacted', 'closed', 'confirmed', 'cancelled'));

-- Suppliers can't answer "capacity on these dates" without a date —
-- build-your-own collects nights today but no calendar month. Nullable
-- since existing rows won't have one; the form makes it required from
-- here on.
alter table custom_package_requests add column if not exists travel_month date;

-- Agencies already have SELECT on their own rows in both tables — this
-- adds UPDATE, scoped to only the two outcome values the Book/Cancel
-- buttons are allowed to set. The "only once every supplier said yes"
-- rule itself is enforced in the server action, not here — same
-- "RLS is the backstop, the action gives the clean error" pattern used
-- throughout this app (e.g. requireOwnSupplier).
drop policy if exists "Agencies can book or cancel their own reservation" on reservation_requests;
create policy "Agencies can book or cancel their own reservation"
  on reservation_requests for update
  to authenticated
  using (agency_id in (select agency_id from profiles where profiles.id = auth.uid()))
  with check (status in ('confirmed', 'cancelled'));

drop policy if exists "Agencies can book or cancel their own custom request" on custom_package_requests;
create policy "Agencies can book or cancel their own custom request"
  on custom_package_requests for update
  to authenticated
  using (agency_id in (select agency_id from profiles where profiles.id = auth.uid()))
  with check (status in ('confirmed', 'cancelled'));

-- Fix found during testing: suppliers need to read the request they're
-- being asked about (and the requesting agency's name), and agencies
-- need to read the confirmation rows for their own requests (to show
-- "X/Y suppliers confirmed"). But reservation_requests/
-- custom_package_requests and booking_supplier_confirmations then each
-- reference the other in their RLS policies — a raw subquery from one
-- into the other causes Postgres to report "infinite recursion detected
-- in policy" the moment either table is queried, because evaluating one
-- policy requires evaluating the other table's policies, which requires
-- the first again.
--
-- Fixed with `security definer` helper functions: they run as the
-- function's owner (the `postgres` role here, which bypasses RLS), so a
-- lookup inside one of these functions never re-triggers the calling
-- table's own policies — breaking the cycle. This is the standard fix
-- for cross-table RLS recursion.
create or replace function fn_current_supplier_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select supplier_id from profiles where id = auth.uid();
$$;

create or replace function fn_current_agency_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select agency_id from profiles where id = auth.uid();
$$;

-- Does the signed-in supplier have a confirmation row for this request?
create or replace function fn_supplier_has_confirmation(p_request_type text, p_request_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from booking_supplier_confirmations
    where request_type = p_request_type
      and request_id = p_request_id
      and supplier_id = fn_current_supplier_id()
  );
$$;

-- Does this request belong to the signed-in agency?
create or replace function fn_agency_owns_request(p_request_type text, p_request_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when p_request_type = 'reservation' then exists (
      select 1 from reservation_requests where id = p_request_id and agency_id = fn_current_agency_id()
    )
    else exists (
      select 1 from custom_package_requests where id = p_request_id and agency_id = fn_current_agency_id()
    )
  end;
$$;

-- Has the signed-in supplier ever been asked about a request from this agency?
create or replace function fn_supplier_can_see_agency(p_agency_id uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from booking_supplier_confirmations c
    join reservation_requests r on r.id = c.request_id and c.request_type = 'reservation'
    where c.supplier_id = fn_current_supplier_id() and r.agency_id = p_agency_id
  ) or exists (
    select 1 from booking_supplier_confirmations c
    join custom_package_requests r on r.id = c.request_id and c.request_type = 'custom'
    where c.supplier_id = fn_current_supplier_id() and r.agency_id = p_agency_id
  );
$$;

drop policy if exists "Suppliers can read reservation requests they're asked about" on reservation_requests;
create policy "Suppliers can read reservation requests they're asked about"
  on reservation_requests for select
  to authenticated
  using (fn_supplier_has_confirmation('reservation', id));

drop policy if exists "Suppliers can read custom requests they're asked about" on custom_package_requests;
create policy "Suppliers can read custom requests they're asked about"
  on custom_package_requests for select
  to authenticated
  using (fn_supplier_has_confirmation('custom', id));

drop policy if exists "Agencies can read confirmations for their own requests" on booking_supplier_confirmations;
create policy "Agencies can read confirmations for their own requests"
  on booking_supplier_confirmations for select
  to authenticated
  using (fn_agency_owns_request(request_type, request_id));

-- Replaces the original (recursive) insert policy from earlier in this
-- stage with the same rule, expressed via the non-recursive function.
drop policy if exists "Agencies can create confirmations for their own requests" on booking_supplier_confirmations;
create policy "Agencies can create confirmations for their own requests"
  on booking_supplier_confirmations for insert
  to authenticated
  with check (fn_agency_owns_request(request_type, request_id));

drop policy if exists "Suppliers can read agencies for their confirmations" on agencies;
create policy "Suppliers can read agencies for their confirmations"
  on agencies for select
  to authenticated
  using (fn_supplier_can_see_agency(id));

-- ─────────────────────────────────────────────────────────────
-- Stage Q: admin-facing customer (agency) list + edit-on-behalf, same
-- shape as Stage L's admin-can-edit-any-supplier. Admin already had
-- SELECT on every agency; this adds UPDATE so admin can fill in/correct
-- an agency's profile the same way they already can for suppliers.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Admins can update all agencies" on agencies;
create policy "Admins can update all agencies"
  on agencies for update
  to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');
