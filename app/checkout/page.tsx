"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function CheckoutPageContent() {
  const searchParams = useSearchParams();

  const plan = searchParams.get("plan") || "starter-monthly";
  const source = searchParams.get("source") || "unknown";
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");

  useEffect(() => {
    async function loadUserAndTrack() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUserId(user?.id || null);
        setUserEmail(user?.email || null);

        await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventName: "checkout_view",
            source,
            page: "checkout",
            label: plan,
            userId: user?.id || null,
            metadata: {
              plan,
              path: window.location.pathname,
              fullPath: window.location.href,
              returnTo,
            },
          }),
        });
      } catch {
        //
      }
    }

    void loadUserAndTrack();
  }, [plan, source, returnTo]);

  const trimmedGuestEmail = guestEmail.trim().toLowerCase();

  const emailToUse = useMemo(() => {
    if (userEmail) return userEmail;
    if (trimmedGuestEmail) return trimmedGuestEmail;
    return null;
  }, [userEmail, trimmedGuestEmail]);

  const canCheckout = !!userId || !!emailToUse;

  async function startCheckout() {
    try {
      setLoading(true);
      setError("");

      if (!userId && !emailToUse) {
        setError("Enter your email or log in before checkout.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan,
          source,
          returnTo,
          userId,
          email: emailToUse,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start checkout.");
        setLoading(false);
        return;
      }

      if (!data.url) {
        setError("Checkout URL was not returned.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Failed to connect to the server.");
      setLoading(false);
    }
  }

  const planDetails: Record<
    string,
    { title: string; price: string; bullets: string[] }
  > = {
    "starter-monthly": {
      title: "Starter",
      price: "$19/month",
      bullets: [
        "Quiz access",
        "Lexi chat access",
        "History access",
        "Starter dashboard",
        "Weak-area basics",
        "Lecture mode",
      ],
    },
    "core-monthly": {
      title: "Core",
      price: "$30/month",
      bullets: [
        "Everything in Starter",
        "Full dashboard",
        "Advanced weak areas",
        "Study with Lexi",
        "CAT Exam",
        "Live full access",
      ],
    },
    semester: {
      title: "Semester Access",
      price: "$129 one-time",
      bullets: [
        "Everything in Core",
        "One semester of full access",
        "No monthly billing",
      ],
    },
    "three-semester": {
      title: "3-Semester Access",
      price: "$199 one-time",
      bullets: [
        "Everything in Core",
        "3 semesters of full access",
        "Best long-term momentum option",
      ],
    },
    "full-program": {
      title: "Full Program Access",
      price: "$249 one-time",
      bullets: [
        "Everything in Core",
        "Full program access",
        "No renewals",
      ],
    },
  };

  const selected = planDetails[plan] || planDetails["starter-monthly"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-xl border border-slate-200 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
          {selected.title}
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-900">
          Complete your access
        </h1>

        <p className="mt-3 text-slate-600">
          Picked from NCLEXAI pricing and ready for secure checkout.
        </p>

        <div className="mt-6 text-4xl font-black text-slate-900">
          {selected.price}
        </div>

        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left">
          <p className="text-sm font-semibold text-orange-700">Included</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {selected.bullets.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>

        {userId ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
            <p className="text-sm font-semibold text-emerald-700">Logged in</p>
            <p className="mt-1 text-sm text-slate-700">
              Purchase will be attached to your account automatically.
            </p>
            {userEmail && (
              <p className="mt-2 text-xs text-slate-500">{userEmail}</p>
            )}
          </div>
        ) : (
          <div className="mt-6 text-left">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email address
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Enter your email to purchase"
              className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-slate-900 outline-none transition focus:border-orange-400"
            />
            <p className="mt-2 text-xs text-slate-500">
              You can create your account after purchase using this same email.
            </p>
          </div>
        )}

        <button
          onClick={startCheckout}
          disabled={loading || !canCheckout}
          className="mt-6 w-full rounded-2xl bg-orange-500 px-6 py-4 text-lg font-semibold text-white hover:bg-orange-600 transition disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Continue to Secure Checkout"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <p className="mt-4 text-xs text-slate-500">
          Plan: {plan} • Source: {source}
        </p>
      </div>
    </div>
  );
}

function CheckoutFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-xl border border-slate-200 text-center">
        <h1 className="text-3xl font-black text-slate-900">Loading checkout...</h1>
        <p className="mt-3 text-slate-600">Preparing your secure checkout page.</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <CheckoutPageContent />
    </Suspense>
  );
}