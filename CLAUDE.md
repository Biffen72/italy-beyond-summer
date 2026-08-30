# Italy Beyond Summer — platform

## What this is
A B2B platform connecting Scandinavian (Norway/Sweden/Denmark) travel agencies
with a curated network of Calabrian tourism suppliers (hotels, restaurants,
wineries, guides, transport) to sell off-season group travel packages.
Agency, supplier, and admin sides are all built and working. A traveller-facing
app and a guide-facing app are planned next, sharing the same backend.

Non-technical founder (Thomas) drives this repo directly through Claude Code —
prefer small, well-explained steps over large unexplained diffs. After any
change, say in plain language what changed and what to check in the browser.

## User roles
- **agency** — Scandinavian travel agency staff. Browses packages (with live
  NOK/SEK/DKK conversion), sends reservation requests, builds custom packages,
  manages their company profile. Fully built (`app/dashboard`).
- **supplier** — Calabrian business (hotel, restaurant, etc.). Manages their
  own profile, room types/pricing, photo gallery, and responds to incoming
  booking requests. Fully built (`app/supplier`).
- **admin** — Italy Beyond Summer staff. Approves suppliers, manages packages,
  reservations, custom requests, finance dashboard, agency accounts, and the
  AI-translation review queue. Can also "view as" any agency/supplier
  (read-only impersonation) to see what they see. Fully built (`app/admin`).
- **guide** — leads groups on the ground in Calabria. Exists as a DB role and
  a "Coming soon" placeholder in admin, but has **no UI yet** — this is the
  main thing genuinely not built.

## Commands
- `npm install` — install dependencies (run once, and again after pulling
  changes that touch package.json)
- `npm run dev` — start the local dev server on http://localhost:3000
- `npm run build` — production build (good sanity check before deploying)
- `npm run lint` — check code style

## Architecture
- **Next.js 15** (App Router), TypeScript, Tailwind CSS
- **Supabase** — Postgres database + auth. Schema lives in `supabase/schema.sql`,
  built up as a series of commented migration stages (multi-language supplier
  profiles, hotel room types, package↔supplier linking, exchange-rate cache,
  price snapshots, supplier-confirmation workflow). `profiles.role` drives
  what a logged-in user can see.
- **AI translation** — `app/api/translate/route.ts` + `lib/ai/translate-supplier.ts`
  use `@anthropic-ai/sdk` (Claude Haiku) to auto-translate supplier profile
  copy into the other Scandinavian languages when a supplier publishes. Output
  lands as `pending_review` rows that an admin approves/rejects in
  `TranslationsList.tsx` before it goes live to agencies.
- **Vercel** is the intended host (not yet deployed)
- Auth session handling is in `middleware.ts` — protects `/dashboard/*`,
  `/supplier/*`, `/admin/*`; redirects signed-out users to `/login` and
  bounces wrong-role users back to `/dashboard`.

## Design tokens (see tailwind.config.ts)
- Colors: `wine` #8A1F2A (primary), `ink` #1E2A22 (near-black text/dark bg),
  `olive` #3F6E44, `gold` #BB8F2B, `paper` #FBF8EF (background), `line` #D8CBA6
  (borders) — wine/olive nudged toward true red/green for a bit more Italian
  character (subtle, not a literal flag palette)
- Fonts: `font-display` (Fraunces, serif — headings) / `font-body` (Inter —
  everything else)
- These match the color language used in the pitch decks (Suppliers,
  Travel Agencies, Authorities, Airlines) — keep new UI consistent with it.
- Signature element: the seasonal focus strip (`components/SeasonStrip.tsx`)
  highlighting April–June and September–November, used on the public
  marketing homepage. Reuse this motif rather than inventing a new one when a
  calendar/seasonality visual is needed elsewhere.

## Current state (what exists right now)
- Landing page (`app/page.tsx`) — marketing page for agencies, with quiet
  links to supplier/guide login
- Login + signup (`app/login/page.tsx`) — email/password via Supabase auth,
  role is passed as a URL param and stored on the user
- **Agency dashboard** (`app/dashboard`) — package catalog with currency
  conversion, reservation requests (notifies all linked suppliers), supplier
  directory, "build your own package" wizard, company profile with logo
  upload, booking flow gated on all suppliers confirming
- **Supplier portal** (`app/supplier`) — profile editing, room types with
  per-room pricing and photos, multi-language profile copy, request inbox to
  accept/decline bookings
- **Admin backoffice** (`app/admin`) — supplier approval, package CRUD,
  reservations management, custom-request review, finance dashboard, agency
  account management, AI-translation review queue, "view as" impersonation
- Database has all the tables backing the above, with row-level security
  policies throughout

## Known gaps / rough edges
- **Guide app**: no UI at all yet — the natural next big feature.
- When a supplier declines a booking request, the parent reservation/custom
  request status doesn't auto-update — an admin currently has to manually
  decline it in the admin reservations table.
- Real payment/invoicing (Stripe) — not started.
- Traveller-facing app (itinerary, addresses, contacts, push notifications) —
  not started; would share this same Supabase backend.

## Conventions
- Server Components by default; add `"use client"` only where interactivity
  requires it (forms, buttons with handlers)
- Use the `@/` path alias (e.g. `@/lib/supabase/server`) instead of relative
  `../../` imports
- Keep copy in the interface plain and active ("Log in", "Register your
  agency"), matching the tone used throughout the pitch decks
