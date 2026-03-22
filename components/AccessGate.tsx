"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { hasRequiredAccess, type AccessLevel } from "../lib/access";
import { useAccess } from "../lib/useAccess";

type AccessGateProps = {
  requiredAccess: AccessLevel;
  title: string;
  description?: string;
  children: ReactNode;
};

function getUpgradeHref(requiredAccess: AccessLevel) {
  const plan =
    requiredAccess === "starter" ? "starter-monthly" : "core-monthly";

  return `/checkout?plan=${plan}&source=locked-modal`;
}

export default function AccessGate({
  requiredAccess,
  title,
  description,
  children,
}: AccessGateProps) {
  const { loading, accessLevel } = useAccess();

  const allowed = useMemo(() => {
    if (loading) return false;
    return hasRequiredAccess(accessLevel, requiredAccess);
  }, [loading, accessLevel, requiredAccess]);

  return (
    <div className="relative">
      {children}

      {loading && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" />
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-xl">
              <p className="text-slate-600">Checking access...</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !allowed && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />

          <div className="absolute inset-0 flex items-center justify-center px-6 py-10">
            <div className="w-full max-w-2xl rounded-3xl border border-orange-200 bg-white p-8 shadow-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                Locked
              </p>

              <h1 className="mt-3 text-3xl font-black text-slate-900">
                {title}
              </h1>

              <p className="mt-4 text-slate-600">
                {description ||
                  "You can preview this section, but your current plan does not include full access."}
              </p>

              <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm text-slate-700">
                  Required access:{" "}
                  <span className="font-semibold">{requiredAccess}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Your access: <span className="font-semibold">{accessLevel}</span>
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={getUpgradeHref(requiredAccess)}
                  className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
                >
                  Upgrade Access
                </Link>

                <Link
                  href="/checkout?plan=starter-monthly&source=locked-modal-pricing"
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  View Pricing
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}