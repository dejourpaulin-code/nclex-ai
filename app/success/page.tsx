"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function normalizeInternalPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/checkout")) return "/dashboard";
  return value;
}

function CheckoutSuccessPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("session_id");
  const returnTo = normalizeInternalPath(searchParams.get("returnTo"));

  const [trackingStatus, setTrackingStatus] = useState("Finalizing your access...");
  const [redirectReady, setRedirectReady] = useState(false);

  const hasTracked = useRef(false);

  useEffect(() => {
    async function finalizePurchase() {
      if (!sessionId || hasTracked.current) return;
      hasTracked.current = true;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const sessionRes = await fetch("/api/checkout/session-details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const sessionData = await sessionRes.json();

        if (!sessionRes.ok) {
          setTrackingStatus(
            sessionData.error || "Payment was received, but session details could not be loaded."
          );
          return;
        }

        const accessRes = await fetch("/api/checkout/complete-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        const accessData = await accessRes.json();

        if (!accessRes.ok) {
          setTrackingStatus(
            accessData.error || "Payment confirmed, but access could not be granted."
          );
          return;
        }

        await fetch("/api/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventName: "purchase",
            source: sessionData.source || "unknown",
            page: "checkout-success",
            label: sessionData.plan || "starter-monthly",
            userId: user?.id || null,
            value: sessionData.amount || 0,
            metadata: {
              plan: sessionData.plan || "starter-monthly",
              currency: sessionData.currency || "usd",
              checkoutSessionId: sessionId,
              accessLevel: accessData.accessLevel || null,
              returnTo,
            },
          }),
        }).catch(() => {
          //
        });

        if (!user) {
          setTrackingStatus(
            "Payment confirmed. Your access has been recorded. Log in or create an account with the same email you used at checkout."
          );
          setRedirectReady(true);

          window.setTimeout(() => {
            router.replace("/login");
          }, 1800);

          return;
        }

        setTrackingStatus("Access granted successfully. Redirecting you now...");
        setRedirectReady(true);

        window.setTimeout(() => {
          router.replace(returnTo);
        }, 1200);
      } catch {
        setTrackingStatus("Payment confirmed. Final access setup could not complete.");
      }
    }

    void finalizePurchase();
  }, [sessionId, returnTo, router]);

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Missing checkout session
          </p>

          <h1 className="mt-4 text-4xl font-black text-slate-900">We need one more step.</h1>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            This page was opened without a valid Stripe checkout session ID.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href="/dashboard"
              className="rounded-2xl bg-orange-500 px-6 py-4 font-semibold text-white transition hover:bg-orange-600"
            >
              Go to Dashboard
            </a>

            <a
              href="/checkout"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Back to Checkout
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
          Payment successful
        </p>

        <h1 className="mt-4 text-4xl font-black text-slate-900">You’re in.</h1>

        <p className="mt-4 text-lg leading-8 text-slate-600">
          Your membership is being activated now.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">{trackingStatus}</p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <a
            href={returnTo}
            className="rounded-2xl bg-orange-500 px-6 py-4 font-semibold text-white transition hover:bg-orange-600"
          >
            {redirectReady ? "Continue" : "Open App"}
          </a>

          <a
            href="/dashboard"
            className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

function CheckoutSuccessPageFallback() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
          Payment successful
        </p>

        <h1 className="mt-4 text-4xl font-black text-slate-900">Loading...</h1>

        <p className="mt-4 text-lg leading-8 text-slate-600">
          Preparing your success page.
        </p>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessPageFallback />}>
      <CheckoutSuccessPageInner />
    </Suspense>
  );
}