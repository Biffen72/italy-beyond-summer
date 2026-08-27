import Link from "next/link";
import { SeasonStrip } from "@/components/SeasonStrip";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* Top bar — agency login is the primary path; supplier/guide are quiet text links */}
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          Italy Beyond Summer
        </span>
        <nav className="flex items-center gap-6 text-sm text-ink/70">
          <Link href="/login?role=supplier" className="hover:text-ink">
            Supplier
          </Link>
          <Link href="/login?role=guide" className="hover:text-ink">
            Guide
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 pb-20 pt-12 md:px-12 md:pb-28 md:pt-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-wine">
            For Scandinavian travel agencies
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] text-ink md:text-6xl">
            Sell Calabria&rsquo;s off-season,
            <br />
            <span className="italic text-wine">without the overhead.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink/70">
            Ready-made packages, transparent euro pricing, and a curated
            Calabrian supplier network doing the groundwork for you.
          </p>
          <div className="mt-9 flex items-center gap-4">
            <Link
              href="/login?role=agency"
              className="rounded-card bg-wine px-7 py-3.5 text-base font-semibold text-paper transition hover:bg-wine-dark"
            >
              Log in as a travel agency
            </Link>
            <Link
              href="/login?role=agency&signup=1"
              className="text-base font-semibold text-ink underline decoration-line underline-offset-4 hover:text-wine"
            >
              Register your agency
            </Link>
          </div>
        </div>
      </section>

      {/* Signature element — the seasonal focus strip, same visual language as the pitch deck */}
      <section className="border-y border-line bg-white px-6 py-14 md:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold text-ink">
            Built around Calabria&rsquo;s quiet months
          </h2>
          <p className="mt-2 text-ink/70">
            Where your customers already want to travel — mild weather, fewer
            crowds, harvest season.
          </p>
          <div className="mt-8">
            <SeasonStrip />
          </div>
        </div>
      </section>
    </main>
  );
}
