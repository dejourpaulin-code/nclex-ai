"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");
        setUserId(user.id);
      }
    }

    loadUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-2xl">
          <div className="mb-6">
            <div className="mb-4 inline-flex rounded-full border border-orange-200 bg-orange-100 px-4 py-1 text-sm font-medium text-orange-700">
              My Account
            </div>

            <h1 className="text-3xl font-black">Account Details</h1>
            <p className="mt-2 text-slate-600">
              Manage your student account and access your saved study progress.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-sm font-medium text-slate-500">Email</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {email || "Loading..."}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-slate-500">User ID</p>
              <p className="mt-1 break-all text-sm font-medium text-slate-800">
                {userId || "Loading..."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Back to Dashboard
            </a>

            <button
              onClick={logout}
              className="rounded-2xl bg-blue-900 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              Log out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}