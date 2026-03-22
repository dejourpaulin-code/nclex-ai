"use client";

import Navbar from "../../components/Navbar";
import Reveal from "../../components/Reveal";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type AccessResponse = {
  loggedIn: boolean;
  accessLevel: string;
  plan: string | null;
  status: string;
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

const liveSignals = [
  "Teacher shift detector",
  "Exam nugget detector",
  "Professor emphasis detector",
  "Best question to ask",
  "Safe answer if called on",
  "Stronger class contribution",
];

const workflow = [
  {
    number: "01",
    title: "Capture the lecture",
    description:
      "Upload recorded audio or use Live Full during class depending on how you want Lexi to listen.",
  },
  {
    number: "02",
    title: "Let Lexi organize the chaos",
    description:
      "Lexi turns raw lecture content into a transcript, summary, key points, and likely testable angles.",
  },
  {
    number: "03",
    title: "Spot what actually matters",
    description:
      "Use shift detection, exam nuggets, and emphasis signals to notice the moments most likely to matter later.",
  },
  {
    number: "04",
    title: "Study from it intelligently",
    description:
      "Turn the lecture into a study plan, follow-up quiz work, and cleaner review instead of rereading random notes.",
  },
];

export default function LectureHubPage() {
  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);

  useEffect(() => {
    async function loadAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

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

    loadAccess();
  }, []);

  const hasLiveFull = !!access?.features?.liveFull;
  const loggedIn = !!access?.loggedIn;

  const lectureModes = useMemo(() => {
    return [
      {
        badge: "Upload + Process",
        title: "Lecture Upload",
        description:
          "Upload recorded lecture audio and let Lexi turn it into a transcript, summary, key points, likely testable concepts, a study plan, and quiz questions.",
        href: "/lecture/upload",
        cta: "Open Upload Mode",
        accent: "border-blue-100 bg-blue-50",
        icon: "🎙️",
        locked: false,
      },
      {
        badge: hasLiveFull ? "Premium Live Mode" : "Core+ Upgrade",
        title: "Live Full",
        description:
          "Run Lexi during live class to capture rolling transcript windows, detect topic shifts, surface questions to ask, and coach stronger participation in real time.",
        href: hasLiveFull
          ? "/lecture/live-full"
          : loggedIn
          ? "/checkout?plan=core-monthly&source=lecture-live-full-card"
          : "/login",
        cta: hasLiveFull ? "Open Live Full" : loggedIn ? "Upgrade to Core" : "Log In to Unlock",
        accent: "border-orange-100 bg-orange-50",
        icon: "⚡",
        locked: !hasLiveFull,
      },
      {
        badge: "Minimal View",
        title: "Lecture HUD",
        description:
          "Use a clean in-class prompt board that keeps only the most useful live signals on screen — what to ask, what to say, and what sounds testable.",
        href: "/lecture/hud",
        cta: "Open HUD",
        accent: "border-purple-100 bg-purple-50",
        icon: "🧭",
        locked: false,
      },
      {
        badge: "Saved Sessions",
        title: "Lecture History",
        description:
          "Review processed lecture sessions later so your summaries, concepts, study plans, and generated questions stay reusable instead of disappearing after class.",
        href: "/lecture/history",
        cta: "Open History",
        accent: "border-emerald-100 bg-emerald-50",
        icon: "🗂️",
        locked: false,
      },
    ];
  }, [hasLiveFull, loggedIn]);

  if (accessLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <section className="mx-auto max-w-[1100px] px-6 py-20">
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
              🔐
            </div>
            <h1 className="text-3xl font-black text-slate-900">Checking your access...</h1>
            <p className="mt-4 text-lg text-slate-600">
              Loading your lecture permissions now.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const canUseLecture = !!access?.features?.lecture;

  if (!canUseLecture) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />

        <section className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="rounded-[36px] border border-purple-200 bg-white p-8 shadow-2xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-4 py-1 text-sm font-semibold text-purple-800">
                  Lecture Mode locked
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  Lecture intelligence is available on
                  <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                    Starter and above
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Turn lectures into transcripts, summaries, testable signals, study plans,
                  and reusable review instead of losing the value after class ends.
                </p>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  {[
                    "Recorded lecture processing",
                    "Lecture transcripts",
                    "Summary + key point extraction",
                    "Testable concept detection",
                    "Lecture study planning",
                    "Saved lecture session review",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  {!loggedIn ? (
                    <a
                      href="/login"
                      className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
                    >
                      Log In to Continue
                    </a>
                  ) : (
                    <a
                      href="/checkout?plan=starter-monthly&source=lecture-gate"
                      className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
                    >
                      Upgrade to Starter
                    </a>
                  )}

                  <a
                    href="/quiz"
                    className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-center text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Go to Quiz
                  </a>
                </div>

                <p className="mt-5 text-sm text-slate-500">
                  {loggedIn
                    ? `Your current access level: ${access?.accessLevel || "guest"}`
                    : "You are currently browsing as a guest."}
                </p>
              </div>

              <div className="rounded-[32px] border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900">Upgrade path</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Starter unlocks</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Lecture hub, upload mode, lecture history, study tools, dashboard, and history.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Core unlocks</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Everything in Starter plus Live Full, CAT Exam, and advanced dashboard features.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-700">Important</p>
                    <p className="mt-1 text-sm text-slate-700">
                      The Lecture Hub is Starter+, but Live Full remains a premium Core+ feature.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-[1500px] px-6 py-12 xl:px-10">
        <div className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <Reveal>
            <div>
              <div className="mb-5 inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-4 py-1 text-sm font-medium text-purple-800">
                Lecture Intelligence Hub
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-6xl">
                Turn lectures into
                <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white shadow-lg">
                  study tools
                </span>
              </h1>

              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
                NCLEXAI Lecture Mode helps you process recorded lectures, run live class support,
                surface testable signals, and study from what your professor actually said — not just
                what you hope you wrote down.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="/lecture/upload"
                  className="rounded-2xl bg-blue-900 px-8 py-4 text-center text-lg font-semibold text-white shadow-md transition duration-300 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl"
                >
                  Open Upload Mode
                </a>

                <a
                  href={
                    hasLiveFull
                      ? "/lecture/live-full"
                      : loggedIn
                      ? "/checkout?plan=core-monthly&source=lecture-hero-live-full"
                      : "/login"
                  }
                  className="rounded-2xl border border-blue-200 bg-white px-8 py-4 text-center text-lg font-semibold text-blue-900 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-lg"
                >
                  {hasLiveFull
                    ? "Open Live Full"
                    : loggedIn
                    ? "Upgrade for Live Full"
                    : "Log In for Live Full"}
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "Transcript generation",
                  "Live class coaching",
                  "Exam nugget detection",
                  "Shift detection",
                  "Lecture study plans",
                ].map((item, index) => (
                  <Reveal key={item} delayMs={index * 70}>
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
                      {item}
                    </span>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={120}>
            <div className="relative">
              <div className="absolute -left-10 top-12 h-48 w-48 rounded-full bg-blue-200/50 blur-3xl" />
              <div className="absolute -right-6 bottom-0 h-48 w-48 rounded-full bg-orange-200/50 blur-3xl" />

              <div className="relative overflow-hidden rounded-[36px] border border-blue-100 bg-white/95 p-6 shadow-2xl backdrop-blur transition duration-500 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(15,23,42,0.18)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Live lecture intelligence</p>
                    <h2 className="text-2xl font-bold text-slate-900">Lexi Classroom View</h2>
                  </div>
                  <div className="rounded-2xl bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                    Premium
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm text-slate-500">Current Topic</p>
                    <p className="mt-2 text-xl font-bold">Fluid Overload</p>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-sm text-slate-500">Shift Alert</p>
                    <p className="mt-2 text-xl font-bold">Detected</p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm text-slate-500">Exam Signal</p>
                    <p className="mt-2 text-xl font-bold">Priority</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.92fr]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                        Teacher shift detector
                      </span>
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        Professor emphasis
                      </span>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                        Exam nugget
                      </span>
                    </div>

                    <p className="text-base leading-7 text-slate-800">
                      Lexi thinks the professor just shifted from preload and afterload into fluid
                      volume overload and emphasized crackles, oxygenation, and early assessment as
                      the high-yield section.
                    </p>

                    <div className="mt-5 space-y-3">
                      {[
                        "Best question: Would you prioritize oxygenation before fluid restriction here?",
                        "Safe answer: I’d assess oxygen saturation and respiratory status first because airway and breathing take priority.",
                        "Class contribution: This sounds like an assessment-first situation before we move to later interventions.",
                      ].map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold text-slate-500">Lexi Study Plan</p>
                      <p className="mt-3 text-sm leading-7 text-slate-800">
                        Review the lecture summary, run a 5-question cardiac and fluid-balance drill,
                        then ask Lexi to compare overload vs dehydration in NCLEX language.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-semibold text-slate-500">Why this matters</p>
                      <p className="mt-3 text-sm leading-7 text-slate-800">
                        Instead of losing lecture value after class, Lexi turns it into signals,
                        actions, and review material you can actually use.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                      <p className="text-sm font-semibold text-blue-800">Best next move</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        Use Starter for lecture tools and upgrade to Core if you want Live Full during class.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 pb-20 xl:px-10">
        <Reveal>
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Lecture modes
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              One hub. Four ways to use lecture intelligence.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Keep the lecture product clean and premium by treating everything as part of one guided
              system instead of scattered tools.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {lectureModes.map((mode, index) => (
            <Reveal key={mode.title} delayMs={index * 80}>
              <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className={`rounded-2xl border px-4 py-3 text-2xl ${mode.accent}`}>
                    {mode.icon}
                  </div>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {mode.badge}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900">{mode.title}</h3>
                <p className="mt-4 leading-8 text-slate-600">{mode.description}</p>

                {mode.locked && (
                  <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-700">
                      This mode is reserved for Core and higher memberships.
                    </p>
                  </div>
                )}

                <a
                  href={mode.href}
                  className={`mt-6 inline-flex rounded-2xl px-5 py-3 font-semibold text-white transition ${
                    mode.locked
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-blue-900 hover:bg-blue-800"
                  }`}
                >
                  {mode.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-6 py-16 xl:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Live intelligence layer
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                  Lexi can now listen for what matters, not just what was said.
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
                  The live system is getting stronger because it is not only transcribing class —
                  it is detecting structure, emphasis, and testable moments in real time.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {liveSignals.map((item, index) => (
                <Reveal key={item} delayMs={index * 70}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                    {item}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 py-20 xl:px-10">
        <Reveal>
          <div className="rounded-[36px] border border-blue-100 bg-white p-8 shadow-2xl md:p-10 transition duration-500 hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                How lecture mode works
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Capture. Detect. Study smarter.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                The whole point is to turn lecture time into something reusable, actionable, and
                easier to study from later.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {workflow.map((step, index) => (
                <Reveal key={step.number} delayMs={index * 80}>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                    <div className="text-sm font-black tracking-[0.2em] text-blue-700">
                      {step.number}
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 pb-24 xl:px-10">
        <Reveal>
          <div className="overflow-hidden rounded-[40px] bg-gradient-to-r from-blue-950 via-blue-900 to-orange-600 p-10 text-white shadow-2xl transition duration-500 hover:shadow-[0_30px_90px_rgba(15,23,42,0.25)] md:p-14">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">
                  Ready to use lecture mode?
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                  Stop letting lecture value disappear after class.
                </h2>
                <p className="mt-5 text-lg leading-8 text-blue-100">
                  Use upload processing for recorded lectures or upgrade into Live Full during class
                  so Lexi can help you spot what matters while it is happening.
                </p>
              </div>

              <div className="w-full max-w-xl">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <a
                    href="/lecture/upload"
                    className="rounded-2xl bg-white px-8 py-4 text-center text-lg font-semibold text-blue-950 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl"
                  >
                    Open Upload Mode
                  </a>

                  <a
                    href={
                      hasLiveFull
                        ? "/lecture/live-full"
                        : loggedIn
                        ? "/checkout?plan=core-monthly&source=lecture-bottom-live-full"
                        : "/login"
                    }
                    className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-center text-lg font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    {hasLiveFull
                      ? "Open Live Full"
                      : loggedIn
                      ? "Upgrade for Live Full"
                      : "Log In for Live Full"}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}