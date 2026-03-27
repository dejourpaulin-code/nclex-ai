"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";

type UserAccessRow = {
  id: string;
  plan: string | null;
  access_level: string | null;
  status: string | null;
  ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "No end date";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [access, setAccess] = useState<UserAccessRow | null>(null);
  const [error, setError] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to view your account.");
        setLoading(false);
        return;
      }

      setUserEmail(user.email || null);

      const { data, error } = await supabase
        .from("user_access")
        .select("id, plan, access_level, status, ends_at, stripe_customer_id, stripe_subscription_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setError("Failed to load your account details.");
        setLoading(false);
        return;
      }

      setAccess((data as UserAccessRow | null) || null);
      setLoading(false);
    }

    loadAccount();
  }, []);

  async function openBillingPortal() {
  try {
    setPortalLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      setError("You must be logged in to manage billing.");
      setPortalLoading(false);
      return;
    }

    const res = await fetch("/api/account/create-portal-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to open billing portal.");
      setPortalLoading(false);
      return;
    }

    if (!data.url) {
      setError("Billing portal URL was not returned.");
      setPortalLoading(false);
      return;
    }

    window.location.href = data.url;
  } catch {
    setError("Failed to connect to the server.");
    setPortalLoading(false);
  }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
            Account
          </div>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Manage your membership
          </h1>

          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            View your current plan, manage billing, cancel your subscription, or upgrade access.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Loading account details...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700 shadow-xl">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
              <h2 className="text-2xl font-bold">Membership details</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {userEmail || "No email found"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Current plan</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {access?.plan || "No active plan"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Access level</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {access?.access_level || "None"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">Status</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {access?.status || "Inactive"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
                  <p className="text-sm text-slate-500">Renews / expires</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {formatDate(access?.ends_at || null)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-8 shadow-xl">
              <h2 className="text-2xl font-bold">Actions</h2>

              <div className="mt-6 space-y-4">
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="w-full rounded-2xl bg-blue-900 px-5 py-4 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {portalLoading ? "Opening..." : "Manage Billing"}
                </button>

                <a
                  href="/pricing"
                  className="block w-full rounded-2xl bg-orange-500 px-5 py-4 text-center font-semibold text-white transition hover:bg-orange-600"
                >
                  Upgrade Plan
                </a>

                <a
                  href="/dashboard"
                  className="block w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-center font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Back to Dashboard
                </a>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-7 text-slate-600">
                  Use Manage Billing to cancel subscriptions, update payment methods, or review invoices through Stripe.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}