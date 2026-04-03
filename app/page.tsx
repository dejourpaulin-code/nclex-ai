"use client";

import Navbar from "../components/Navbar";
import Reveal from "../components/Reveal";
import WaitlistForm from "../components/WaitlistForm";
import WaitlistCount from "../components/WaitlistCount";
import { supabase } from "../lib/supabase";

const testimonials = [
  {
    quote:
      "This feels like it was built by someone who actually understands nursing school instead of a random software company guessing what we need.",
    name: "Nursing Student",
    role: "Med-Surg + Fundamentals",
  },
  {
    quote:
      "The weak-area coaching made me realize I was wasting time studying what felt familiar instead of what was actually hurting my score.",
    name: "Senior Nursing Student",
    role: "NCLEX-style Practice",
  },
  {
    quote:
      "Lexi feels more like a smart study coach than a question bank. It helps me know what to do next.",
    name: "BSN Student",
    role: "Daily Review Workflow",
  },
];

const features = [
  {
    icon: "🧠",
    title: "Adaptive Quiz Intelligence",
    description:
      "Generate focused question sets by topic, all-topic review, random mode, or the exact subjects you keep missing.",
  },
  {
    icon: "💬",
    title: "Lexi AI Coach",
    description:
      "Get explanations, breakdowns, coaching, and next-step study guidance from an AI tutor built for nursing students.",
  },
  {
    icon: "📚",
    title: "Lecture-to-Study System",
    description:
      "Turn notes, screenshots, and lecture material into summaries, study plans, key points, and usable review instead of rereading slides.",
  },
  {
    icon: "🔥",
    title: "Weak-Area Targeting",
    description:
      "See what keeps hurting your performance, detect patterns faster, and turn weak subjects into focused drills.",
  },
  {
    icon: "🎯",
    title: "Readiness + Pass Signals",
    description:
      "Track readiness, momentum, study plans, and performance signals in a way that actually helps you decide what to do next.",
  },
  {
    icon: "🎙️",
    title: "Lecture Intelligence",
    description:
      "Process lectures into timelines, testable moments, professor emphasis signals, and practical study actions.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$19",
    suffix: "/month",
    plan: "starter-monthly",
    source: "pricing-starter",
    description:
      "Start with core NCLEX-style quizzes and basic Lexi support.",
    highlight: false,
    badge: "Entry",
    features: [
      "Basic quiz generation",
      "Limited Lexi explanations",
      "Tutor mode access",
      "Good for trying the system",
    ],
    cta: "Start Starter",
    cardClass: "border-slate-200 bg-white",
    buttonClass:
      "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
  },
  {
    name: "Core",
    price: "$30",
    suffix: "/month",
    plan: "core-monthly",
    source: "pricing-core",
    description:
      "Unlock the full adaptive workflow with smarter quizzes, weak-area targeting, and stronger AI coaching.",
    highlight: false,
    badge: "Popular Monthly",
    features: [
      "Full adaptive quizzes",
      "Weak-area targeting",
      "Full Lexi coaching",
      "Tutor + Exam modes",
      "Study assistant access",
    ],
    cta: "Choose Core",
    cardClass: "border-blue-200 bg-white",
    buttonClass: "bg-blue-900 text-white hover:bg-blue-800",
  },
  {
    name: "Semester Access",
    price: "$129",
    suffix: "/one time",
    plan: "semester",
    source: "pricing-semester",
    description:
      "Best for students who want one focused semester of full access without monthly billing.",
    highlight: true,
    badge: "Most Popular",
    features: [
      "Everything in Core",
      "Full semester access",
      "No monthly renewals",
      "Strongest value for active students",
      "Built for exam-heavy stretches",
    ],
    cta: "Get Semester Access",
    cardClass:
      "border-orange-300 bg-gradient-to-b from-orange-50 to-white shadow-2xl scale-[1.02]",
    buttonClass: "bg-orange-500 text-white hover:bg-orange-600",
  },
  {
    name: "3-Semester Accelerator",
    price: "$199",
    suffix: "/one time",
    plan: "three-semester",
    source: "pricing-accelerator",
    description:
      "Lock in multi-semester momentum and avoid restarting your study system every term.",
    highlight: false,
    badge: "Long-Term",
    features: [
      "Everything in Core",
      "3 semesters of access",
      "Better long-term value",
      "Stay consistent across terms",
    ],
    cta: "Lock In 3 Semesters",
    cardClass: "border-purple-200 bg-white",
    buttonClass: "bg-purple-600 text-white hover:bg-purple-700",
  },
  {
    name: "Full Program Access",
    price: "$249",
    suffix: "/one time",
    plan: "full-program",
    source: "pricing-full-program",
    description:
      "One decision for your whole nursing program. No renewals, no interruptions, no re-buying later.",
    highlight: false,
    badge: "Best Value",
    features: [
      "Everything unlocked",
      "Covers the full program",
      "No renewals",
      "Lowest long-term cost",
      "Best total value",
    ],
    cta: "Get Full Program Access",
    cardClass: "border-emerald-200 bg-white",
    buttonClass: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Expose the exact weak areas costing you points",
    description:
      "Use weak-area tracking, quiz performance, and Lexi coaching to stop wasting time on what feels familiar and start fixing what is actually dragging your score down.",
  },
  {
    number: "02",
    title: "Turn scattered class material into usable review",
    description:
      "Upload notes, screenshots, and lecture material so Lexi can convert them into summaries, concepts, and guided study instead of letting information pile up unread.",
  },
  {
    number: "03",
    title: "Train exactly where your performance breaks",
    description:
      "Run weak-area drills, topic quizzes, and exam-style sessions built around the places your understanding is still failing under pressure.",
  },
  {
    number: "04",
    title: "Build a study loop that actually compounds",
    description:
      "Stop bouncing between random notes, scattered slides, and generic tools. Use one adaptive workflow built for nursing students who need results, not more noise.",
  },
];

const faqs = [
  {
    question: "What makes this different from a normal question bank?",
    answer:
      "This adapts around your weaker subjects, quiz performance, and study workflow instead of just throwing random questions at you and hoping volume solves the problem.",
  },
  {
    question: "Can Lexi explain concepts at different levels?",
    answer:
      "Yes. Lexi can simplify concepts when you need clarity, then go deeper when you want fuller reasoning, memory hooks, and test-taking strategy.",
  },
  {
    question: "Can I use this for both studying and testing myself?",
    answer:
      "Yes. Tutor Mode is better for learning with immediate rationales, while Exam Mode is better for honest self-testing with review at the end.",
  },
  {
    question: "Can I focus only on my weak areas?",
    answer:
      "Yes. You can generate quizzes from weak areas only, target one subject, use random topic mode, or mix all topics together.",
  },
  {
    question: "Does the Study Assistant work with lecture material?",
    answer:
      "Yes. You can upload notes, class material, and screenshots so Lexi can summarize, explain, and turn them into more useful study help.",
  },
  {
    question: "Who is this for?",
    answer:
      "It is built for nursing students who want a cleaner, faster, and more focused way to study for class exams, clinical content, and NCLEX-style practice.",
  },
];

const trustBadges = [
  "Adaptive quizzes",
  "NCLEX-style practice",
  "Weak-area tracking",
  "Lexi tutoring",
  "Study assistant",
  "Tutor + exam modes",
];

const trustStats = [
  { value: "Focused", label: "study workflow" },
  { value: "Adaptive", label: "question generation" },
  { value: "Smarter", label: "weak-area practice" },
  { value: "Cleaner", label: "student experience" },
];

const urgencyBullets = [
  "Every week you study the wrong material, someone else gets sharper on the questions that actually matter.",
  "Most students do not need more notes. They need better targeting.",
  "If your scores are inconsistent, your study system is probably the real problem.",
];

const painPoints = [
  "Rereading slides and still missing the exam question",
  "Spending hours studying and not knowing if it helped",
  "Getting questions wrong and still not understanding why",
  "Bouncing between notes, screenshots, videos, and question banks",
];

const proofSignals = [
  "Built from repeated nursing-student feedback",
  "Refined around real study pain points",
  "Designed for class exams and NCLEX-style pressure",
  "Created to reduce wasted study time fast",
];

export default function Home() {
  async function trackCtaClick(source: string, label: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventName: "cta_click",
          source,
          page: "homepage",
          label,
          userId: user?.id || null,
          metadata: {
            path: window.location.pathname,
          },
        }),
      });
    } catch {
      // fail silently
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <div className="sticky top-[100px] z-20 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl">
  <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 overflow-x-auto px-6 py-3 xl:px-10">
    <div className="hidden shrink-0 text-sm font-semibold text-slate-500 md:block">
      Explore
    </div>

    <div className="flex min-w-max items-center gap-2 md:gap-3">
      <a
        href="#features"
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
      >
        Features
      </a>
      <a
        href="#proof"
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
      >
        Proof
      </a>
      <a
        href="#pricing"
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
      >
        Pricing
      </a>
      <a
        href="#testimonials"
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
      >
        Testimonials
      </a>
      <a
        href="#faq"
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
      >
        FAQ
      </a>
      <a
        href="/checkout?plan=semester&source=sticky-nav"
        onClick={() => trackCtaClick("sticky-nav", "Get Semester Access")}
        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Semester Access ($129)
      </a>
    </div>
  </div>
</div>

      <section className="mx-auto grid max-w-[1500px] scroll-mt-28 items-center gap-14 px-6 py-20 xl:grid-cols-[1.1fr_0.9fr] xl:px-10 xl:py-24">
        <Reveal>
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1 text-sm font-semibold text-red-700 shadow-sm transition hover:shadow-md">
              Nursing students are done wasting study time
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[1.02] tracking-tight md:text-6xl xl:text-7xl">
              Stop studying everything.
              <br />
              <span className="text-slate-900">
                Start fixing what is actually costing you points.
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              This is not another generic question bank.
              <br />
              NCLEXAI is built for nursing students who are tired of rereading notes,
              guessing what to review next, and losing points because their study system
              is too scattered to work.
            </p>

            <div className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-700">
                What this fixes
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {painPoints.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="/checkout?plan=semester&source=hero-primary"
                onClick={() => trackCtaClick("hero-primary", "Start My Weak-Area Quiz")}
                className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white shadow-md transition hover:bg-orange-600 hover:shadow-xl"
              >
                Start My Weak-Area Quiz
              </a>

              <a
                href="#pricing"
                onClick={() => trackCtaClick("hero-secondary", "View Pricing")}
                className="rounded-2xl border border-blue-200 bg-white px-8 py-4 text-center text-lg font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 hover:shadow-lg"
              >
                View Pricing
              </a>
            </div>

            <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
              {[
                ["Fix Blind Spots", "Target weak areas"],
                ["Study Faster", "Cut wasted review"],
                ["Train Smarter", "Know your next move"],
              ].map(([title, desc]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-sm text-slate-500">{title}</p>
                  <p className="mt-1 font-bold text-slate-900">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Early access is filling now
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    Join before the next rollout window closes.
                  </p>
                </div>
                <WaitlistCount />
              </div>
            </div>

            <div className="mt-6 space-y-2 text-sm text-slate-500">
              {urgencyBullets.map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {[
                "Adaptive quizzes",
                "Lexi tutoring",
                "Weak-area heatmaps",
                "Study assistant",
                "Tutor + exam modes",
              ].map((item, index) => (
                <Reveal key={item} delayMs={index * 60}>
                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
                    {item}
                  </span>
                </Reveal>
              ))}
            </div>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {[
                ["Built for", "Nursing students", "border-blue-100"],
                ["Focuses on", "Weak areas", "border-orange-100"],
                ["Designed for", "NCLEX-style prep", "border-emerald-100"],
              ].map(([label, value, border], index) => (
                <Reveal key={label} delayMs={index * 90}>
                  <div
                    className={`rounded-2xl border ${border} bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
                  >
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-xl font-bold">{value}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="relative">
            <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="absolute -right-6 bottom-0 h-48 w-48 rounded-full bg-orange-200/50 blur-3xl" />

            <div className="relative overflow-hidden rounded-[36px] border border-blue-100 bg-white/95 p-6 shadow-2xl backdrop-blur transition duration-500 hover:-translate-y-1 hover:shadow-[0_25px_80px_rgba(15,23,42,0.18)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="mb-2 text-sm font-semibold text-emerald-600">
                    Live system output
                  </p>
                  <p className="text-sm font-medium text-slate-500">
                    Real-time study intelligence
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900">Lexi Study System</h2>
                </div>
                <div className="rounded-2xl bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                  Live
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 transition duration-300 hover:shadow-md">
                  <p className="text-sm text-slate-500">Accuracy</p>
                  <p className="mt-2 text-3xl font-bold">82%</p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 transition duration-300 hover:shadow-md">
                  <p className="text-sm text-slate-500">Answered</p>
                  <p className="mt-2 text-3xl font-bold">124</p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 transition duration-300 hover:shadow-md">
                  <p className="text-sm text-slate-500">Weakest Area</p>
                  <p className="mt-2 text-lg font-bold">Pharmacology</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition duration-300 hover:shadow-md">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                      Cardiac
                    </span>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      Priority
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Tutor Mode
                    </span>
                  </div>

                  <p className="text-base leading-7 text-slate-800">
                    A nurse is caring for a patient with worsening shortness of breath and crackles
                    in both lungs. Which action should the nurse take first?
                  </p>

                  <div className="mt-5 space-y-3">
                    {[
                      "Increase oral fluids",
                      "Assess oxygen saturation",
                      "Place the patient flat in bed",
                      "Delay assessment until the provider arrives",
                    ].map((choice, i) => (
                      <div
                        key={choice}
                        className={`flex items-start gap-4 rounded-2xl border p-4 transition duration-300 hover:shadow-sm ${
                          i === 1
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-700">
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className="pt-1 text-sm leading-7 text-slate-800">{choice}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition duration-300 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-500">Lexi</p>
                    <p className="mt-3 text-sm leading-7 text-slate-800">
                      Since airway and breathing problems come first, the nurse should assess oxygen
                      saturation immediately before delaying or escalating other actions.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition duration-300 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-500">Weak-area signal</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-slate-500">
                          <span>Pharmacology</span>
                          <span>78%</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-200">
                          <div className="h-3 w-[78%] rounded-full bg-orange-500 transition-all duration-700" />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-slate-500">
                          <span>Cardiac</span>
                          <span>61%</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-200">
                          <div className="h-3 w-[61%] rounded-full bg-amber-400 transition-all duration-700" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-red-100 bg-red-50 p-5 transition duration-300 hover:shadow-md">
                    <p className="text-sm font-semibold text-red-700">What happens next</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      The system identifies the exact weakness, teaches the reason, and sends the
                      student straight into another targeted quiz instead of letting the mistake repeat.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Generated from adaptive performance tracking and real study workflows
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="proof" className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-500">
          Hard truth
        </p>

        <h2 className="mt-3 text-3xl font-black md:text-4xl">
          More effort does not fix a broken study system.
        </h2>

        <div className="mt-8 space-y-6 text-lg text-slate-600">
          <p>You are not losing because you do not care.</p>
          <p className="font-semibold text-slate-900">
            You are usually losing because your review is too broad, too scattered, and too slow.
          </p>

          <p>You do not need more random studying.</p>
          <p className="font-semibold text-slate-900">
            You need faster feedback, targeted repetition, and a system that tells you what matters next.
          </p>

          <p className="text-sm text-slate-500">That is the whole point of NCLEXAI.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {proofSignals.map((item, index) => (
            <Reveal key={item} delayMs={index * 70}>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <p className="text-sm font-semibold text-slate-800">{item}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section
        id="pricing"
        className="mx-auto max-w-[1500px] scroll-mt-28 px-6 pb-20 xl:px-10"
      >
        <Reveal>
          <div className="mb-12 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              Pick the level that matches how serious you are
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              The faster you fix your weak areas, the less time you waste rereading the wrong material.
              Most students choose{" "}
              <span className="font-bold text-slate-900">Semester Access</span>{" "}
              because it removes monthly friction and gets them full access immediately.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 xl:grid-cols-5">
          {pricingPlans.map((plan, index) => (
            <Reveal key={plan.name} delayMs={index * 70}>
              <div
                className={`relative flex h-full flex-col rounded-[32px] border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${plan.cardClass}`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      plan.highlight
                        ? "bg-orange-500 text-white"
                        : plan.badge === "Best Value"
                        ? "bg-emerald-100 text-emerald-700"
                        : plan.badge === "Long-Term"
                        ? "bg-purple-100 text-purple-700"
                        : plan.badge === "Popular Monthly"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {plan.badge}
                  </span>

                  {plan.highlight && (
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">
                      Best seller
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>

                <div className="mt-4">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="ml-1 text-sm font-semibold text-slate-500">
                    {plan.suffix}
                  </span>
                </div>

                <p className="mt-4 min-h-[96px] text-sm leading-7 text-slate-600">
                  {plan.description}
                </p>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    What’s included
                  </p>

                  <div className="mt-3 space-y-2">
                    {plan.features.map((feature) => (
                      <p key={feature} className="text-sm text-slate-700">
                        • {feature}
                      </p>
                    ))}
                  </div>
                </div>

                {plan.highlight && (
                  <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-700">
                      Most students choose this because it gives full access now without stacking monthly payments.
                    </p>
                  </div>
                )}

                {plan.name === "Full Program Access" && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-700">
                      Smartest long-term play if you already know you want this for the whole program.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex-1" />

                <a
                  href={`/checkout?plan=${plan.plan}&source=${plan.source}`}
                  onClick={() => trackCtaClick(plan.source, plan.cta)}
                  className={`mt-6 block rounded-2xl px-6 py-4 text-center text-base font-semibold transition ${plan.buttonClass}`}
                >
                  {plan.cta}
                </a>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Founders pricing can increase as access expands
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={120}>
          <div className="mt-10 rounded-[32px] border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-600">
                  Do not overcomplicate this decision
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  The wrong study system is more expensive than the right one.
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
                  If you spend weeks studying the wrong material, missing weak areas, and repeating the
                  same mistakes, that costs more than choosing the right system early.
                </p>
              </div>

              <a
                href="/checkout?plan=semester&source=pricing-bottom-push"
                onClick={() => trackCtaClick("pricing-bottom-push", "Get Semester Access")}
                className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
              >
                Get Semester Access
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-[1500px] px-6 py-10 xl:px-10">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Trusted workflow signals
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  Built around the way nursing students actually study
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {trustBadges.map((badge, index) => (
                  <Reveal key={badge} delayMs={index * 70}>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                      {badge}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {trustStats.map((stat, index) => (
                <Reveal key={stat.label} delayMs={index * 90}>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                    <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                    <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <section
        id="testimonials"
        className="scroll-mt-28 border-y border-slate-200 bg-slate-950 text-white"
      >
        <div className="mx-auto max-w-[1500px] px-6 py-16 xl:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
                  Why students stay with it
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                  It does not just give more questions.
                  <br />
                  It gives students a sharper way to win.
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
                  Students do not stay because the interface looks nice.
                  They stay because the system helps them find what is weak, fix it faster,
                  and stop burning time on the wrong things.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((item, index) => (
                <Reveal key={item.quote} delayMs={index * 100}>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/10 hover:shadow-xl">
                    <p className="text-sm leading-7 text-slate-200">“{item.quote}”</p>
                    <div className="mt-6">
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.role}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-6 py-20 text-center">
        <h2 className="text-3xl font-black md:text-4xl">
          You do not need more content.
        </h2>

        <p className="mt-4 text-lg text-slate-600">
          You need to know what to attack, what to ignore, and what to repeat until it sticks.
        </p>

        <div className="mt-8 space-y-3 text-sm text-slate-500">
          <p>• Stop rereading notes that do not move your score</p>
          <p>• Stop guessing what to study next</p>
          <p>• Start training exactly where you are weak</p>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-[1500px] scroll-mt-28 px-6 py-20 xl:px-10"
      >
        <Reveal>
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
              Core system
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              A sharper, faster nursing study platform
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Everything is built around clearer practice, faster correction, adaptive guidance,
              and better use of every hour you spend studying.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 70}>
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-6 pb-20 xl:px-10">
        <Reveal>
          <div className="rounded-[36px] border border-blue-100 bg-white p-8 shadow-2xl transition duration-500 hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)] md:p-10">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Build a study loop that actually compounds
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Instead of bouncing between slides, random notes, and generic question banks,
                use one tighter system that keeps exposing, explaining, and drilling your weakest areas.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((step, index) => (
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

      <section
        id="faq"
        className="mx-auto max-w-[1500px] scroll-mt-28 px-6 pb-20 xl:px-10"
      >
        <div className="grid gap-10 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <Reveal>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                FAQ
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Questions students will ask before they commit
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
                This is where you remove hesitation, answer objections, and make the next click easier.
              </p>
            </div>
          </Reveal>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Reveal key={faq.question} delayMs={index * 70}>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  <h3 className="text-lg font-bold text-slate-900">{faq.question}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{faq.answer}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="get-started"
        className="mx-auto max-w-[1500px] scroll-mt-28 px-6 pb-24 xl:px-10"
      >
        <Reveal>
          <div className="overflow-hidden rounded-[40px] bg-gradient-to-r from-blue-950 via-blue-900 to-orange-600 p-10 text-white shadow-2xl transition duration-500 hover:shadow-[0_30px_90px_rgba(15,23,42,0.25)] md:p-14">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">
                  Ready to lock in?
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                  Stop guessing what to study.
                  <br />
                  Start fixing what is costing you points.
                </h2>
                <p className="mt-3 text-sm text-blue-100">
                  Built inside real nursing programs — for students who want a real edge
                </p>
                <p className="mt-5 text-lg leading-8 text-blue-100">
                  Use Lexi, adaptive quizzes, weak-area tracking, and smarter study tools built for
                  nursing students who are done with scattered prep and generic practice.
                </p>
              </div>

              <div className="mt-5">
                <WaitlistCount dark />
              </div>

              <div className="w-full max-w-xl">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                  <a
                    href="/checkout?plan=semester&source=bottom-primary"
                    onClick={() => trackCtaClick("bottom-primary", "Start Practicing")}
                    className="rounded-2xl bg-white px-8 py-4 text-center text-lg font-semibold text-blue-950 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-xl"
                  >
                    Start Practicing
                  </a>

                  <a
                    href="/checkout?plan=full-program&source=bottom-secondary"
                    onClick={() => trackCtaClick("bottom-secondary", "Get Full Program Access")}
                    className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-center text-lg font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    Get Full Program Access
                  </a>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                  <p className="mb-2 text-sm font-semibold text-orange-100">
                    Join the waitlist before the next access wave fills.
                  </p>
                  <p className="mb-4 text-sm leading-7 text-blue-100">
                    If you want early updates, launch access, and first priority when new features roll out,
                    put your email in now.
                  </p>
                  <WaitlistForm source="homepage-cta" dark />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <Reveal>
          <div className="mx-auto max-w-[1500px] px-6 py-12 xl:px-10">
            <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
              <div>
                <div className="inline-flex rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-2 text-lg font-black text-white shadow-md transition duration-300 hover:shadow-lg">
                  NCLEXAI
                </div>
                <p className="mt-4 max-w-md leading-7 text-slate-600">
                  Adaptive study support for nursing students built around quizzes, weak-area
                  tracking, Lexi tutoring, and cleaner day-to-day review.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  Product
                </h3>
                <div className="mt-4 space-y-3 text-slate-600">
                  <a href="/quiz" className="block transition hover:text-blue-900">
                    Quiz Generator
                  </a>
                  <a href="/chat" className="block transition hover:text-blue-900">
                    Lexi Tutor
                  </a>
                  <a href="/study" className="block transition hover:text-blue-900">
                    Study Assistant
                  </a>
                  <a href="/dashboard" className="block transition hover:text-blue-900">
                    Dashboard
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  Workflow
                </h3>
                <div className="mt-4 space-y-3 text-slate-600">
                  <a href="/closet" className="block transition hover:text-blue-900">
                    Avatar Locker
                  </a>
                  <a href="/history" className="block transition hover:text-blue-900">
                    Quiz History
                  </a>
                  <a href="/dashboard" className="block transition hover:text-blue-900">
                    Weak Areas
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  Brand
                </h3>
                <div className="mt-4 space-y-3 text-slate-600">
                  <p>Built for focused nursing students</p>
                  <p>Lexi-powered study support</p>
                  <p>NCLEX-style practice workflow</p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>© 2026 NCLEXAI. Built for nursing students.</p>
              <p>Adaptive quizzes • Lexi tutoring • Weak-area tracking</p>
            </div>
          </div>
        </Reveal>
      </footer>
    </main>
  );
}