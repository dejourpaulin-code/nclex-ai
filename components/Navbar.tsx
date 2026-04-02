"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useEffect, useMemo, useState } from "react";

type AccessResponse = {
  loggedIn: boolean;
  accessLevel: string;
  plan: string | null;
  status: string;
  endsAt?: string | null;
  features: {
    quiz: boolean;
    lexi: boolean;
    history: boolean;
    study: boolean;
    dashboard: boolean;
    dashboardAdvanced?: boolean;
    weakAreas: boolean;
    weakAreasAdvanced?: boolean;
    lecture: boolean;
    liveFull: boolean;
    catExam: boolean;
  };
};

type NavItem = {
  href: string;
  label: string;
  requires?: keyof AccessResponse["features"];
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", requires: "dashboard" },
  { href: "/quiz", label: "Quiz", requires: "quiz" },
  { href: "/chat", label: "Lexi", requires: "lexi" },
  { href: "/study", label: "Study with Lexi", requires: "study" },
  { href: "/history", label: "History", requires: "history" },
  { href: "/closet", label: "Locker", requires: "dashboard" },
  { href: "/cat", label: "CAT Exam", requires: "catExam" },
  { href: "/lecture", label: "Lecture Mode", requires: "lecture" },
  { href: "/lecture/live-full", label: "Live Full", requires: "liveFull" },
  { href: "/lecture/stream", label: "Stream v2", requires: "lecture" },
  { href: "/account", label: "Account" },
];

const guestFeatures: AccessResponse["features"] = {
  quiz: true,
  lexi: true,
  history: false,
  study: false,
  dashboard: false,
  dashboardAdvanced: false,
  weakAreas: false,
  weakAreasAdvanced: false,
  lecture: false,
  liveFull: false,
  catExam: false,
};

export default function Navbar() {
  const pathname = usePathname();

  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    async function loadUserAndAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setEmail(user?.email || "");

        const res = await fetch("/api/access/me", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.id || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAccess(null);
          setAccessLoading(false);
          return;
        }

        setAccess(data);
      } catch {
        setAccess(null);
      }

      setAccessLoading(false);
    }

    void loadUserAndAccess();
  }, []);

  function isActive(href: string) {
    return pathname === href;
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const initials = useMemo(() => {
    return email ? email.slice(0, 1).toUpperCase() : "U";
  }, [email]);

  const isLoggedIn = !!email;
  const features = access?.features || guestFeatures;

  function isUnlocked(item: NavItem) {
    if (!item.requires) return true;
    return !!features[item.requires];
  }

  const planLabel = useMemo(() => {
    if (!access?.loggedIn) return "Guest access";

    switch (access.accessLevel) {
      case "starter":
        return "Starter";
      case "core":
        return "Core";
      case "semester":
        return "Semester";
      case "three-semester":
        return "3-Semester";
      case "full-program":
        return "Full Program";
      default:
        return "Free";
    }
  }, [access]);

  const shouldShowUpgrade =
    !accessLoading &&
    (!access?.loggedIn ||
      (access.accessLevel !== "core" &&
        access.accessLevel !== "semester" &&
        access.accessLevel !== "three-semester" &&
        access.accessLevel !== "full-program"));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 xl:px-8">

        {/* Top row: logo + actions */}
        <div className="flex items-center justify-between gap-4 py-2">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-orange-500 text-base font-bold text-white shadow-md">
              N
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-base font-bold text-slate-900">NCLEXAI</p>
              <p className="text-[10px] text-slate-500">Built for nursing students</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Log in
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Get Access
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/quiz"
                  className="hidden rounded-xl bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-orange-600 sm:inline-flex"
                >
                  Start Quiz
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-md transition hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                      {initials}
                    </div>
                    <div className="hidden text-left sm:block">
                      <p className="max-w-[120px] truncate text-sm font-semibold text-slate-900">
                        {email}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {accessLoading ? "Loading..." : planLabel}
                      </p>
                    </div>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-3 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl">
                      <div className="mb-2 rounded-xl bg-slate-50 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-900">{email}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {accessLoading ? "Loading access..." : `Access level: ${planLabel}`}
                        </p>
                      </div>

                      {allNavItems.map((item) => {
                        const unlocked = isUnlocked(item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                              unlocked
                                ? "hover:bg-slate-100"
                                : "text-orange-700 hover:bg-orange-50"
                            }`}
                            onClick={() => setMenuOpen(false)}
                          >
                            <span className="inline-flex items-center gap-2">
                              {item.label}
                              {!unlocked && <span className="text-xs">🔒</span>}
                            </span>
                          </Link>
                        );
                      })}

                      {shouldShowUpgrade && (
                        <>
                          <div className="my-2 h-px bg-slate-200" />
                          <Link
                            href={`/checkout?plan=core-monthly&source=navbar-upgrade&returnTo=${encodeURIComponent(pathname)}`}
                            className="block rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                            onClick={() => setMenuOpen(false)}
                          >
                            Upgrade
                          </Link>
                        </>
                      )}

                      <div className="my-2 h-px bg-slate-200" />

                      <button
                        onClick={logout}
                        className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Nav row — fits all items; scrollable on narrow screens without scrollbar */}
        <nav className="no-scrollbar flex gap-0.5 overflow-x-auto pb-2 pt-0">
          {allNavItems.map((item) => {
            const active = isActive(item.href);
            const unlocked = isUnlocked(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-blue-900 text-white shadow-sm"
                    : unlocked
                    ? "text-slate-600 hover:bg-blue-50 hover:text-blue-900"
                    : "text-slate-400 hover:bg-orange-50 hover:text-orange-700"
                }`}
                title={unlocked ? item.label : "Preview available — upgrade to use this feature"}
              >
                <span className="inline-flex items-center gap-1">
                  {item.label}
                  {!unlocked && <span className="text-[10px]">🔒</span>}
                </span>
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
