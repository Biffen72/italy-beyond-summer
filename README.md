# Italy Beyond Summer — platform

This is the starting point for the real, running platform (not a prototype).
Written so you can get it live even without a technical background, by
following each step in order.

## What's already built
- A landing page
- Login / registration for agencies, suppliers, and admin staff
- **Agency side**: package catalog with live currency conversion, sending
  reservation requests, a "build your own package" wizard, company profile
- **Supplier side**: profile and room management, photo galleries, an inbox
  to accept/decline incoming booking requests
- **Admin side**: approving suppliers, managing packages and reservations,
  a finance dashboard, and a review queue for AI-translated supplier content
- The database structure itself (`supabase/schema.sql`), with row-level
  security throughout

Not yet built: a guide-facing app (the guide role exists but has no screens),
and real payment/invoicing.

See `CLAUDE.md` for the full picture — that file is what Claude Code reads
automatically every time you start a session in this project, so you never
have to re-explain the project from scratch.

## One-time setup (do this once)

### 1. Install Node.js
Download and install the "LTS" version from **nodejs.org**. This lets your
computer run the project.

### 2. Install Claude Code
Go to **claude.com/download** and follow the instructions for your computer
(Mac/Windows/Linux). If you're already on Claude Pro or Max, this is included
— no extra cost until you use more than your plan's normal usage.

### 3. Create a free Supabase project (your database)
1. Go to **supabase.com** → sign up (free tier is enough to start) → "New project"
2. Once it's created, go to **Project Settings → API**
3. Copy the **Project URL** and the **anon public key** — you'll need both next

### 4. Connect this project to your database
1. In this folder, make a copy of `.env.local.example` and rename it to `.env.local`
2. Paste in the URL and key you copied in step 3

### 5. Set up the database tables
1. In Supabase, open **SQL Editor → New query**
2. Open `supabase/schema.sql` in this project, copy everything in it, paste
   it into the Supabase SQL editor, and click **Run**
3. This creates all the tables and adds six starter packages so the
   dashboard has real data to show

### 6. Install the project's building blocks
Open this folder in a terminal (or ask Claude Code to do it for you) and run:
```
npm install
```

## Running it locally, day to day
```
npm run dev
```
Then open **http://localhost:3000** in your browser. Leave the terminal
window open while you're working — closing it stops the site.

To try the agency flow: click "Register your agency" on the landing page,
sign up with any email/password, then log in.

## Working with Claude Code from here
Open this project folder in Claude Code and just describe what you want in
plain language — e.g. "add a button on the package catalog that lets an
agency send a reservation request." Claude Code reads `CLAUDE.md`
automatically, so it already knows the project's structure, design colors,
and what's built so far.

## Putting it live on the internet
When you're ready to make it publicly accessible (not just on your own
computer):
1. Push this project to a GitHub repository (Claude Code can help with this —
   just ask)
2. Go to **vercel.com**, sign up, and import that GitHub repository
3. Add the same two values from `.env.local` in Vercel's project settings
   under "Environment Variables"
4. Vercel gives you a live URL — from then on, every change you push to
   GitHub goes live automatically

## Getting unstuck
If something breaks or looks wrong, describe what you see to Claude Code
("the login page shows a blank screen") rather than trying to read the error
yourself — that's exactly the kind of thing it's built to debug with you.
