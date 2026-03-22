"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function claimPurchasedAccess(userId: string) {
    if (!sessionId) return;

    try {
      await fetch("/api/checkout/claim-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          sessionId,
        }),
      });
    } catch {
      //
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        const signedUpUser = data.user;

        if (signedUpUser) {
          await claimPurchasedAccess(signedUpUser.id);
        }

        setMessage(
          "Account created. Check your email if confirmation is enabled, then log in to continue."
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        const loggedInUser = data.user;

        if (loggedInUser) {
          await claimPurchasedAccess(loggedInUser.id);
        }

        window.location.href = returnTo;
        return;
      }
    } catch {
      setMessage("Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-xl px-6 py-20">
        <div className="rounded-3xl border border-blue-100 bg-white p-10 shadow-2xl">
          <div className="mb-8">
            <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
              Student Account
            </div>

            <h1 className="text-3xl font-black">
              {mode === "login" ? "Log in" : "Create account"}
            </h1>

            <p className="mt-2 text-slate-600">
              Save your quiz history, track weak areas, and keep your NCLEX progress in one place.
            </p>

            {sessionId && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Your purchase was detected. Log in or create your account with the same email to
                attach your access.
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-blue-50 p-3 outline-none transition focus:border-blue-500"
                placeholder="student@email.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-orange-50 p-3 outline-none transition focus:border-orange-400"
                placeholder="Enter password"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Log in"
                : "Create account"}
            </button>

            <button
              onClick={() =>
                setMode((prev) => (prev === "login" ? "signup" : "login"))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              {mode === "login"
                ? "Need an account? Sign up"
                : "Already have an account? Log in"}
            </button>

            {message && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                {message}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}