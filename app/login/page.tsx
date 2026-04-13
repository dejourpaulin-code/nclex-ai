"use client";

import { Suspense, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useSearchParams } from "next/navigation";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<"login" | "signup">(modeParam === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

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

  async function handleReset() {
    setResetLoading(true);
    setResetMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setResetMessage(error.message); }
      else { setResetMessage("Check your email for a password reset link."); }
    } catch {
      setResetMessage("Something went wrong.");
    }
    setResetLoading(false);
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
              {mode === "login" ? "Log in" : "Create your free account"}
            </h1>

            <p className="mt-2 text-slate-600">
              {mode === "signup"
                ? "Free account — no credit card required. Get 8 free messages with Lexi."
                : "Log in to access Lexi, your quiz history, and weak-area tracking."}
            </p>

            {sessionId && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Your purchase was detected. Log in or create your account with
                the same email to attach your access.
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

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-800"
                >
                  Forgot password?
                </button>
              </div>
            )}

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

    {showReset && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-8 shadow-2xl">
          <h2 className="text-xl font-black">Reset your password</h2>
          <p className="mt-2 text-sm text-slate-600">Enter your email and we'll send you a reset link.</p>
          <div className="mt-5 space-y-4">
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="student@email.com"
              className="w-full rounded-2xl border border-slate-300 bg-blue-50 p-3 outline-none transition focus:border-blue-500"
            />
            <button
              onClick={handleReset}
              disabled={resetLoading || !resetEmail}
              className="w-full rounded-2xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {resetLoading ? "Sending..." : "Send reset link"}
            </button>
            <button
              onClick={() => { setShowReset(false); setResetMessage(""); }}
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            {resetMessage && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">{resetMessage}</div>
            )}
          </div>
        </div>
      </div>
    )}
    </main>
  );
}

function LoginPageFallback() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />
      <section className="mx-auto max-w-xl px-6 py-20">
        <div className="rounded-3xl border border-blue-100 bg-white p-10 shadow-2xl">
          <h1 className="text-3xl font-black">Loading...</h1>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}