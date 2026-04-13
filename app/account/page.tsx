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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  async function deleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setDeleteError("You must be logged in."); setDeleteLoading(false); return; }
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) { setDeleteError(result.error || "Failed to delete account."); setDeleteLoading(false); return; }
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDeleteError("Failed to connect to the server.");
    }
    setDeleteLoading(false);
  }


  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-5">
          <div className="mb-1 inline-flex rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
            Account
          </div>
          <h1 className="text-2xl font-black tracking-tight">Manage your membership</h1>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-500">
            Loading account details...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Membership details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-bold">Membership Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{userEmail || "No email found"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Current plan</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{access?.plan || "No active plan"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Access level</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{access?.access_level || "None"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{access?.status || "Inactive"}</p>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Renews / expires</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDate(access?.ends_at || null)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-bold">Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="w-full rounded-xl bg-blue-900 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {portalLoading ? "Opening..." : "Manage Billing"}
                </button>
                <a
                  href="/pricing"
                  className="block w-full rounded-xl bg-orange-500 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Upgrade Plan
                </a>
                <a
                  href="/dashboard"
                  className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Back to Dashboard
                </a>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Use Manage Billing to cancel, update payment methods, or review invoices through Stripe.
              </p>
            </div>
            {/* Close Account */}
            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base font-bold text-red-700">Close Account</h2>
              <p className="mb-4 text-xs leading-5 text-slate-500">
                Permanently deletes your account and all associated data. This cannot be undone. If you have an active subscription, cancel it through Manage Billing first.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Close my account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Type <span className="font-black text-red-600">DELETE</span> to confirm:</p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={deleteAccount}
                      disabled={deleteLoading || deleteConfirmText !== "DELETE"}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleteLoading ? "Deleting..." : "Yes, delete my account"}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeleteError(""); }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {deleteError && (
                    <p className="text-xs text-red-600">{deleteError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}