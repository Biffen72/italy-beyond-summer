"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") ?? "agency";
  const startInSignup = searchParams.get("signup") === "1";

  const [isSignup, setIsSignup] = useState(startInSignup);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role, full_name: fullName } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setError(
        "Check your email to confirm your account, then log in."
      );
      setIsSignup(false);
      setLoading(false);
      return;
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    let destination = "/dashboard";
    if (signInData.user) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .single();

      if (userProfile?.role === "supplier") destination = "/supplier";
      else if (userProfile?.role === "admin") destination = "/admin";
    }

    router.push(destination);
    router.refresh();
  }

  const roleLabel: Record<string, string> = {
    agency: "travel agency",
    supplier: "supplier",
    guide: "guide",
    admin: "admin",
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-wine">
          {isSignup ? "Register" : "Log in"} · {roleLabel[role] ?? role}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Italy Beyond Summer
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {isSignup && (
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-ink">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-card border border-line bg-white px-4 py-2.5 text-ink outline-none focus-visible:border-wine"
            />
          </div>

          {error && <p className="text-sm text-wine">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-card bg-wine px-4 py-3 font-semibold text-paper transition hover:bg-wine-dark disabled:opacity-60"
          >
            {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="mt-5 text-sm text-ink/70 underline decoration-line underline-offset-4 hover:text-wine"
        >
          {isSignup
            ? "Already have an account? Log in"
            : "New here? Register your agency"}
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
