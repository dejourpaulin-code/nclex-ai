"use client";

import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    if (!password) { setMessage("Please enter a new password."); return; }
    if (password !== confirm) { setMessage("Passwords do not match."); return; }
    if (password.length < 6) { setMessage("Password must be at least 6 characters."); return; }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated. Redirecting to dashboard...");
      setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
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
              Password Reset
            </div>
            <h1 className="text-3xl font-black">Set a new password</h1>
            <p className="mt-2 text-slate-600">Choose a new password for your account.</p>
          </div>

          {!ready ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
              Waiting for reset link verification... If you landed here from a reset email, this should resolve automatically. Otherwise go back to the login page and request a new link.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-blue-50 p-3 outline-none transition focus:border-blue-500"
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-orange-50 p-3 outline-none transition focus:border-orange-400"
                  placeholder="Repeat your new password"
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
              {message && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                  {message}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
