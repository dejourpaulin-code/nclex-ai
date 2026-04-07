"use client";

import Navbar from "../components/Navbar";
import Reveal from "../components/Reveal";
import { supabase } from "../lib/supabase";

const testimonials = [
  {
    quote:
      "This feels like it was built by someone who actually understands nursing school instead of a random software company guessing what we need.",
    name: "Ashley R.",
    role: "Med-Surg + Fundamentals",
    stars: 5,
    outcome: "Went from 68% to 84% accuracy in 3 weeks",
  },
  {
    quote:
      "The weak-area coaching made me realize I was wasting time studying what felt familiar instead of what was actually hurting my score.",
    name: "Marcus T.",
    role: "NCLEX-style Practice",
    stars: 5,
    outcome: "Identified 4 blind spots in first session",
  },
  {
    quote:
      "Lexi feels more like a smart study coach than a question bank. It helps me know what to do next, not just grade me.",
    name: "Priya S.",
    role: "Daily Review Workflow",
    stars: 5,
    outcome: "Cut study time by 40 minutes per day",
  },
  {
    quote:
      "I used to dread studying after a long clinical day. Now I open this, ask Lexi one question, and somehow end up in a full review session without even noticing.",
    name: "Jordan M.",
    role: "Pediatrics + OB",
    stars: 5,
    outcome: "Passed med-surg on first attempt",
  },
  {
    quote:
      "My professor kept saying I needed to stop memorizing and start thinking like a nurse. Lexi actually helped me get there faster than any textbook did.",
    name: "Danielle K.",
    role: "Fundamentals + Pharmacology",
    stars: 5,
    outcome: "Raised pharm score from 58% to 79%",
  },
  {
    quote:
      "I failed my first med-surg exam and had no idea where to start. The weak-area tracking showed me exactly what was dragging me down and I passed the next one.",
    name: "Tyler B.",
    role: "Med-Surg II",
    stars: 5,
    outcome: "Passed second exam after targeting 2 weak areas",
  },
  {
    quote:
      "The live lecture feature is something I did not know I needed. I stopped missing key points the professor emphasized and my notes got so much better.",
    name: "Simone A.",
    role: "Live Lecture Mode",
    stars: 5,
    outcome: "Never misses a testable lecture moment now",
  },
  {
    quote:
      "I have tried other question banks and they just throw questions at you. This one actually adapts and coaches. It is a completely different experience.",
    name: "Chris W.",
    role: "Exit Exam Prep",
    stars: 5,
    outcome: "Cleared exit exam on first attempt",
  },
];

const features = [
  {
    icon: "🧠",
    title: "Adaptive Quiz Intelligence",
    outcome: "Stop wasting time on topics you already know",
    description:
      "Generate focused question sets by topic, all-topic review, random mode, or the exact subjects you keep missing.",
  },
  {
    icon: "💬",
    title: "Lexi AI Coach",
    outcome: "Get answers in minutes, not hours of rereading",
    description:
      "Get explanations, breakdowns, coaching, and next-step study guidance from an AI tutor built for nursing students.",
  },
  {
    icon: "📚",
    title: "Lecture-to-Study System",
    outcome: "Turn 3 hours of slides into 20 minutes of review",
    description:
      "Turn notes, screenshots, and lecture material into summaries, study plans, key points, and usable review instead of rereading slides.",
  },
  {
    icon: "🔥",
    title: "Weak-Area Targeting",
    outcome: "Know exactly what to fix before the next exam",
    description:
      "See what keeps hurting your performance, detect patterns faster, and turn weak subjects into focused drills.",
  },
  {
    icon: "🎯",
    title: "Readiness Signals",
    outcome: "Know if you are actually ready before you sit down",
    description:
      "Track readiness, momentum, study plans, and performance signals in a way that actually helps you decide what to do next.",
  },
  {
    icon: "🎙",
    title: "Live Lecture Intelligence",
    outcome: "Capture what professors emphasize in real time",
    description:
      "Transcribe lectures into timelines, testable moments, professor emphasis signals, and practical study actions.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$19",
    suffix: "/month",
    plan: "starter-monthly",
    source: "pricing-starter",
    description: "Start with core NCLEX-style quizzes and basic Lexi support.",
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
    buttonClass: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
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
    name: "3-Semester",
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
    name: "Full Program",
    price: "$249",
    suffix: "/one time",
    plan: "full-program",
    source: "pricing-full-program",
    description:
      "One decision for your whole nursing program. No renewals, no interruptions, no re-buying.",
    highlight: false,
    badge: "Best Value",
    features: [
      "Everything unlocked",
      "Covers the full program",
      "No renewals ever",
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
    title: "Turn scattered lecture material into usable review",
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
    question: "What makes this different from UWorld or ATI?",
    answer:
      "Those platforms throw questions at you and grade you. NCLEXAI adapts around your weak subjects, explains the reasoning behind every answer, and tells you what to fix next — so you are training smarter, not just drilling harder.",
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
    question: "Does the Study Assistant work with my lecture notes?",
    answer:
      "Yes. You can upload notes, class material, screenshots, and PDFs so Lexi can summarize, explain, and turn them into more useful study help.",
  },
  {
    question: "Is there a money-back guarantee?",
    answer:
      "Yes. If you are not satisfied within 48 hours of purchase, contact us at nclexai@gmail.com and we will refund you — no questions asked.",
  },
  {
    question: "Who is this built for?",
    answer:
      "It is built for nursing students who want a cleaner, faster, and more focused way to study for class exams, clinical content, and NCLEX-style practice.",
  },
];

const lectureTestimonials = [
  {
    quote:
      "I used to sit in pharmacology frantically writing notes and still miss the connection she made between the drug and the side effect. Now I just listen and let NCLEXAI capture every word. I review the transcript that night and I actually understand what she was building toward.",
    name: "Maya L.",
    role: "Pharmacology + Fundamentals",
    outcome: "Never misses a professor connection anymore",
  },
  {
    quote:
      "My professor talks faster than I can write. I was always two sentences behind and panicking. The first time I used Live Lecture Mode I nearly cried. I had a full transcript, the key points highlighted, and a list of what she was hinting would be on the test.",
    name: "Kayla T.",
    role: "Med-Surg II",
    outcome: "Full transcript + study guide from every class",
  },
  {
    quote:
      "No other study tool I have ever used touches what happens inside the actual classroom. UWorld does not know what my professor said on Tuesday. NCLEXAI does. That is a completely different kind of advantage.",
    name: "Devon R.",
    role: "BSN Program",
    outcome: "Studies directly from what professor emphasized",
  },
];

const comparisonRows = [
  { feature: "Adaptive weak-area targeting", nclexai: true, generic: false },
  { feature: "AI tutor that explains reasoning", nclexai: true, generic: false },
  { feature: "Live lecture transcription + notes", nclexai: true, generic: false },
  { feature: "Study upload (PDF, images, slides)", nclexai: true, generic: false },
  { feature: "Tutor mode + Exam mode", nclexai: true, generic: true },
  { feature: "NCLEX-style questions", nclexai: true, generic: true },
  { feature: "Know what to study next", nclexai: true, generic: false },
  { feature: "Money-back guarantee", nclexai: true, generic: false },
];

export default function Home() {
  async function trackCtaClick(source: string, label: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "cta_click",
          source,
          page: "homepage",
          label,
          userId: user?.id || null,
          metadata: { path: window.location.pathname },
        }),
      });
    } catch {
      // fail silently
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />

      {/* Sticky secondary nav */}
      <div className="sticky top-[92px] z-20 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 overflow-x-auto px-6 py-2.5 xl:px-10">
          <div className="flex min-w-max items-center gap-1.5">
            {["Features", "How It Works", "Pricing", "Testimonials", "FAQ"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {label}
              </a>
            ))}
          </div>
          <a
            href="/checkout?plan=semester&source=sticky-nav"
            onClick={() => trackCtaClick("sticky-nav", "Get Semester Access")}
            className="shrink-0 rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
          >
            Get Access — $129
          </a>
        </div>
      </div>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-orange-500/15 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-[1500px] px-6 pb-20 pt-16 xl:px-10 xl:pt-20">
          {/* Social proof pill */}
          <Reveal>
            <div className="mb-8 flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                <span className="text-yellow-400">★★★★★</span>
                <span>Rated 5/5 by nursing students</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span>Students studying right now</span>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-14 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
            <Reveal>
              <div>
                <h1 className="max-w-4xl text-5xl font-black leading-[1.03] tracking-tight md:text-6xl xl:text-7xl">
                  The AI study system built for nursing students who need to pass,
                  <span className="text-orange-400"> not just practice.</span>
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100 md:text-xl">
                  NCLEXAI finds your weak areas, explains every concept through Lexi, and adapts every session around what is actually costing you points.
                  No more rereading the same slides. No more studying blind.
                </p>

                {/* Pain bullets */}
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Rereading notes that never stick", "Targeted weak-area drills"],
                    ["Guessing what to study next", "Lexi tells you exactly what to fix"],
                    ["Generic question banks with no coaching", "AI tutor that explains the why"],
                    ["Missing key lecture points", "Live lecture transcription + notes"],
                  ].map(([before, after]) => (
                    <div
                      key={before}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                    >
                      <p className="text-xs font-semibold text-slate-400 line-through">{before}</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-300">{after}</p>
                    </div>
                  ))}
                </div>

                {/* Primary CTA */}
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="/checkout?plan=semester&source=hero-primary"
                    onClick={() => trackCtaClick("hero-primary", "Get Semester Access")}
                    className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-orange-400 hover:shadow-orange-500/30 hover:shadow-xl"
                  >
                    Get Semester Access — $129
                  </a>
                  <a
                    href="/login?returnTo=/chat&mode=signup"
                    onClick={() => trackCtaClick("hero-secondary", "Try Lexi Free")}
                    className="rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-center text-lg font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Try Lexi Free
                  </a>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-blue-200">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 48-hour money-back guarantee</span>
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> No setup, no learning curve</span>
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Cancel any time</span>
                </div>
              </div>
            </Reveal>

            {/* Product preview card */}
            <Reveal delayMs={120}>
              <div className="relative">
                <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="absolute -right-6 bottom-0 h-48 w-48 rounded-full bg-orange-500/15 blur-3xl" />

                <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        Live session
                      </span>
                      <h2 className="mt-3 text-xl font-bold text-white">Lexi Study System</h2>
                    </div>
                    <div className="rounded-xl bg-orange-500/20 px-3 py-1.5 text-xs font-bold text-orange-300">
                      Tutor Mode
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
                      <p className="text-xs text-blue-300">Accuracy</p>
                      <p className="mt-1 text-2xl font-black text-white">82%</p>
                      <p className="text-xs text-emerald-400">+14% this week</p>
                    </div>
                    <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 p-4">
                      <p className="text-xs text-orange-300">Questions</p>
                      <p className="mt-1 text-2xl font-black text-white">124</p>
                      <p className="text-xs text-slate-400">This session</p>
                    </div>
                    <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                      <p className="text-xs text-red-300">Weakest</p>
                      <p className="mt-1 text-lg font-black text-white">Pharm</p>
                      <p className="text-xs text-slate-400">3 drills queued</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300">Cardiac</span>
                      <span className="rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-semibold text-orange-300">Priority</span>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">Adaptive</span>
                    </div>
                    <p className="text-sm leading-7 text-slate-200">
                      A nurse is caring for a patient with worsening shortness of breath and crackles in both lungs. Which action should the nurse take first?
                    </p>
                    <div className="mt-4 space-y-2">
                      {["Increase oral fluids", "Assess oxygen saturation", "Place patient flat", "Delay until provider arrives"].map((c, i) => (
                        <div
                          key={c}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm ${i === 1 ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-300"}`}
                        >
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 1 ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-400"}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {c}
                          {i === 1 && <span className="ml-auto text-xs text-emerald-400">Correct</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-blue-400/15 bg-blue-500/10 p-4">
                    <p className="text-xs font-semibold text-blue-300">Lexi explains</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      Airway and breathing are always the priority. Assess O2 saturation immediately before escalating — the other options delay the most critical nursing action.
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-2 text-xs font-semibold text-slate-400">Weak-area signals</p>
                    {[["Pharmacology", 58, "bg-red-400"], ["Cardiac", 73, "bg-amber-400"], ["Fundamentals", 88, "bg-emerald-400"]].map(([label, pct, color]) => (
                      <div key={String(label)} className="mb-2 last:mb-0">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>{label}</span><span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10">
                          <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── TRUST STRIP ─── */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-6 py-6 xl:px-10">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            {[
              ["500+", "Nursing students"],
              ["50,000+", "Questions answered"],
              ["★★★★★", "Average rating"],
              ["48-hr", "Money-back guarantee"],
              ["0", "Setup required"],
            ].map(([value, label]) => (
              <div key={String(label)}>
                <p className="text-xl font-black text-slate-900">{value}</p>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROBLEM / AGITATION ─── */}
      <section className="mx-auto max-w-[1100px] px-6 py-20 text-center">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-500">The real problem</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
            More studying is not the answer.
            <br />
            <span className="text-slate-400">A better system is.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Most nursing students fail because they study broadly instead of surgically.
            They reread what feels familiar, miss what is actually hurting their score,
            and never get honest feedback fast enough to adjust.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "📖",
              title: "Rereading everything",
              description: "You cover all the material. You understand the concepts. But the exam asks the one thing you glossed over — again.",
              color: "border-red-200 bg-red-50",
            },
            {
              icon: "🎲",
              title: "Studying without direction",
              description: "You open a question bank, do 40 random questions, score 68%, and have no idea which 5 topics are responsible for 80% of your misses.",
              color: "border-amber-200 bg-amber-50",
            },
            {
              icon: "🔁",
              title: "Repeating the same mistakes",
              description: "You miss pharmacology questions on Monday. You miss them again on Friday. Nothing in your study system flags the pattern or forces you to fix it.",
              color: "border-orange-200 bg-orange-50",
            },
          ].map((item) => (
            <Reveal key={item.title}>
              <div className={`rounded-3xl border p-8 text-left ${item.color}`}>
                <div className="mb-4 text-4xl">{item.icon}</div>
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-700">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-10 rounded-3xl border border-blue-100 bg-blue-50 p-8">
            <p className="text-lg font-bold text-slate-900">
              NCLEXAI fixes all three — by showing you exactly where you are weak, explaining why you missed it, and making sure you never leave that weakness untrained.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ─── FEATURES ─── */}
      <section
        id="features"
        className="scroll-mt-28 bg-slate-950 py-20 text-white"
      >
        <div className="mx-auto max-w-[1500px] px-6 xl:px-10">
          <Reveal>
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">Core system</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                Six tools that make every study hour count
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Each feature is built around one goal: closing the gap between what you are studying and what is actually costing you points.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delayMs={index * 70}>
                <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10">
                  <div className="mb-4 text-4xl">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-orange-300">{feature.outcome}</p>
                  <p className="mt-3 leading-7 text-slate-400">{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIVE LECTURE SPOTLIGHT ─── */}
      <section className="relative overflow-hidden bg-[#050d1a] py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-700/10 blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-orange-500/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-[1500px] px-6 xl:px-10">
          <Reveal>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full bg-orange-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-orange-400">
                Only on NCLEXAI
              </span>
              <span className="text-xs font-semibold text-slate-500">
                — no other nursing platform has built this
              </span>
            </div>

            <h2 className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Your professor is saying the most important thing
              <br />
              <span className="text-orange-400">on your next exam right now.</span>
              <br />
              <span className="text-slate-400">Are you catching it?</span>
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Live Lecture Mode listens to your class in real time, transcribes every word with medical-grade accuracy, flags what your professor emphasizes, and converts it into a study guide — while you sit there and actually pay attention.
            </p>
          </Reveal>

          <div className="mt-16 grid gap-12 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            {/* Live mockup */}
            <Reveal>
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur shadow-2xl">
                {/* Header bar */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Live Lecture Mode</p>
                      <p className="text-xs text-slate-400">Med-Surg II — Tuesday 9:04 AM</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                    ● LIVE
                  </span>
                </div>

                {/* Transcript lines */}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Live transcript</p>

                  {[
                    { text: "Alright, so when we talk about heart failure, the first thing I want you to understand is the difference between left-sided and right-sided...", dim: true, flag: null },
                    { text: "Left-sided heart failure — and this is going to be on your exam — causes pulmonary edema because the left ventricle cannot pump efficiently forward.", dim: false, flag: "testable" },
                    { text: "The classic signs: dyspnea, orthopnea, crackles in the lungs. Remember that.", dim: false, flag: "emphasis" },
                    { text: "Right-sided failure, on the other hand, backs up into systemic circulation. Peripheral edema, JVD, hepatomegaly...", dim: true, flag: null },
                    { text: "I always say — if the fluid goes to the lungs, think left. If it goes to the body, think right. That distinction will save you on the NCLEX.", dim: false, flag: "testable" },
                  ].map((line, i) => (
                    <div key={i} className={`rounded-xl p-3 ${line.dim ? "opacity-50" : ""}`}>
                      <div className="flex items-start gap-2">
                        {line.flag === "testable" && (
                          <span className="mt-0.5 shrink-0 rounded-md bg-orange-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-400">
                            ⚡ Testable
                          </span>
                        )}
                        {line.flag === "emphasis" && (
                          <span className="mt-0.5 shrink-0 rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-400">
                            🔔 Emphasized
                          </span>
                        )}
                        <p className={`text-sm leading-6 ${line.dim ? "text-slate-500" : line.flag ? "text-white" : "text-slate-300"}`}>
                          {line.text}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <p className="text-xs text-slate-500">Transcribing...</p>
                  </div>
                </div>

                {/* Auto-generated study notes */}
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-400">Auto-generated study notes</p>
                  <div className="space-y-2 text-sm text-slate-300">
                    <p>• Left-sided HF → pulmonary edema (dyspnea, crackles, orthopnea)</p>
                    <p>• Right-sided HF → systemic backup (edema, JVD, hepatomegaly)</p>
                    <p className="font-semibold text-orange-300">⚡ Memory hook: Fluid to lungs = Left. Fluid to body = Right.</p>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-slate-600">
                  Runs in your browser — no app, no download, works on your phone
                </p>
              </div>
            </Reveal>

            {/* Right column */}
            <Reveal delayMs={100}>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">What it captures</p>
                  <div className="mt-5 space-y-4">
                    {[
                      ["⚡", "Testable moments", "Flags every time your professor signals something will be on the exam — the phrases, the emphasis, the repetition."],
                      ["🔔", "Professor emphasis", "Detects when your professor slows down, repeats a point, or says 'remember this' — and marks it in your transcript."],
                      ["📝", "Auto study notes", "Converts the transcript into clean, scannable study bullets you can review that night instead of rereading 80 slides."],
                      ["📱", "Works on your phone", "Open it in Safari or Chrome, tap record, set it on your desk. Your phone works while you take notes the normal way."],
                      ["🧠", "Medical terminology", "Trained on clinical vocabulary — hears pharmacology, pathophysiology, and NCLEX terms the way a nursing student expects."],
                    ].map(([icon, title, desc]) => (
                      <div key={String(title)} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="font-bold text-white">{title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-400">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href="/lecture/live-full"
                  className="block rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-bold text-white shadow-lg transition hover:bg-orange-400"
                >
                  Try Live Lecture Mode Free
                </a>
                <p className="text-center text-xs text-slate-500">No payment required to try it — open in any browser</p>
              </div>
            </Reveal>
          </div>

          {/* Lecture testimonials */}
          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {lectureTestimonials.map((item, index) => (
              <Reveal key={item.name} delayMs={index * 70}>
                <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <div className="mb-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-sm text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-7 text-slate-200">
                    &#x201C;{item.quote}&#x201D;
                  </p>
                  <div className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-500/10 px-4 py-2">
                    <p className="text-xs font-semibold text-orange-300">{item.outcome}</p>
                  </div>
                  <div className="mt-4">
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        id="how-it-works"
        className="scroll-mt-28 border-b border-slate-200 bg-white py-20"
      >
        <div className="mx-auto max-w-[1500px] px-6 xl:px-10">
          <Reveal>
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">How it works</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                A study loop that actually compounds
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Instead of bouncing between slides, random notes, and generic banks, NCLEXAI keeps exposing, explaining, and drilling your weakest areas on repeat.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal key={step.number} delayMs={index * 80}>
                <div className="relative rounded-3xl border border-slate-200 bg-slate-50 p-8 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl">
                  <div className="mb-4 text-4xl font-black text-blue-100">{step.number}</div>
                  <div className="absolute right-6 top-6 h-8 w-8 rounded-full bg-blue-900 text-center text-sm font-black leading-8 text-white">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-10 text-center">
              <a
                href="/checkout?plan=semester&source=how-it-works-cta"
                onClick={() => trackCtaClick("how-it-works-cta", "Start Today")}
                className="inline-block rounded-2xl bg-orange-500 px-10 py-4 text-lg font-bold text-white shadow-md transition hover:bg-orange-600 hover:shadow-xl"
              >
                Start Today — $129 Semester Access
              </a>
              <p className="mt-3 text-sm text-slate-400">48-hour money-back guarantee. No questions asked.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-[900px] px-6">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">Why NCLEXAI</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                Not just another question bank
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
                Generic platforms grade you. NCLEXAI coaches you.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
              <div className="grid grid-cols-[1fr_120px_120px] border-b border-slate-200 bg-slate-900 px-6 py-4 text-sm font-bold text-white">
                <span>Feature</span>
                <span className="text-center text-orange-300">NCLEXAI</span>
                <span className="text-center text-slate-400">Generic</span>
              </div>
              {comparisonRows.map((row, index) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-[1fr_120px_120px] px-6 py-4 text-sm ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                >
                  <span className="font-medium text-slate-700">{row.feature}</span>
                  <span className="text-center text-lg">
                    {row.nclexai ? <span className="font-bold text-emerald-500">✓</span> : <span className="text-slate-300">—</span>}
                  </span>
                  <span className="text-center text-lg">
                    {row.generic ? <span className="font-bold text-emerald-500">✓</span> : <span className="text-slate-300">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section
        id="testimonials"
        className="scroll-mt-28 bg-slate-950 py-20 text-white"
      >
        <div className="mx-auto max-w-[1500px] px-6 xl:px-10">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">Student results</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                Real students. Real outcomes.
              </h2>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <span className="text-2xl text-yellow-400">★★★★★</span>
                <span className="text-slate-300">Rated 5 stars by every reviewer</span>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((item, index) => (
              <Reveal key={item.name} delayMs={index * 60}>
                <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/10">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: item.stars }).map((_, i) => (
                      <span key={i} className="text-sm text-yellow-400">★</span>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-7 text-slate-200">
                    &#x201C;{item.quote}&#x201D;
                  </p>
                  <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2">
                    <p className="text-xs font-semibold text-emerald-300">{item.outcome}</p>
                  </div>
                  <div className="mt-4">
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section
        id="pricing"
        className="scroll-mt-28 bg-white py-20"
      >
        <div className="mx-auto max-w-[1500px] px-6 xl:px-10">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-600">Pricing</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                Pick your level. Start today.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Most students choose <strong>Semester Access</strong> — full access, no monthly friction, best value per exam.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                Founders pricing — may increase as the platform grows
              </div>
            </div>
          </Reveal>

          <div className="grid gap-6 xl:grid-cols-5">
            {pricingPlans.map((plan, index) => (
              <Reveal key={plan.name} delayMs={index * 70}>
                <div
                  className={`relative flex h-full flex-col rounded-[32px] border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${plan.cardClass}`}
                >
                  <div className="mb-4 flex items-center justify-between">
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
                      <span className="text-xs font-bold uppercase tracking-wide text-orange-600">
                        Best seller
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                  <div className="mt-3">
                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                    <span className="ml-1 text-sm font-semibold text-slate-500">{plan.suffix}</span>
                  </div>

                  <p className="mt-4 min-h-[80px] text-sm leading-7 text-slate-600">{plan.description}</p>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Included</p>
                    <div className="mt-3 space-y-2">
                      {plan.features.map((f) => (
                        <p key={f} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-0.5 text-emerald-500">✓</span> {f}
                        </p>
                      ))}
                    </div>
                  </div>

                  {plan.highlight && (
                    <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-sm font-semibold text-orange-700">
                        Most students choose this — full access without stacking monthly charges.
                      </p>
                    </div>
                  )}

                  <div className="flex-1" />

                  <a
                    href={`/checkout?plan=${plan.plan}&source=${plan.source}`}
                    onClick={() => trackCtaClick(plan.source, plan.cta)}
                    className={`mt-6 block rounded-2xl px-6 py-4 text-center text-base font-bold transition ${plan.buttonClass}`}
                  >
                    {plan.cta}
                  </a>

                  <p className="mt-3 text-center text-xs text-slate-400">
                    48-hour money-back guarantee
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-10 rounded-[32px] border border-slate-200 bg-slate-50 p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Not sure which to pick?</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">
                    The wrong study system is more expensive than the right one.
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    Every week you study without targeted feedback is a week you could be closing gaps. Most students who buy Semester Access say they wish they had started sooner.
                  </p>
                </div>
                <a
                  href="/checkout?plan=semester&source=pricing-nudge"
                  onClick={() => trackCtaClick("pricing-nudge", "Get Semester Access")}
                  className="shrink-0 rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-bold text-white transition hover:bg-orange-600"
                >
                  Get Semester Access
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section
        id="faq"
        className="scroll-mt-28 border-t border-slate-200 bg-slate-50 py-20"
      >
        <div className="mx-auto max-w-[1500px] px-6 xl:px-10">
          <div className="grid gap-12 xl:grid-cols-[0.85fr_1.15fr] xl:items-start">
            <Reveal>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">FAQ</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                  Every question before you commit
                </h2>
                <p className="mt-4 max-w-md text-lg leading-8 text-slate-600">
                  If you are on the fence, one of these probably answers it.
                </p>
                <div className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
                  <p className="font-bold text-slate-900">Still have questions?</p>
                  <p className="mt-2 text-sm text-slate-500">Email us directly and we respond within a few hours.</p>
                  <a
                    href="mailto:nclexai@gmail.com"
                    className="mt-4 inline-block rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-md"
                  >
                    nclexai@gmail.com
                  </a>
                </div>
              </div>
            </Reveal>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Reveal key={faq.question} delayMs={index * 60}>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:shadow-lg">
                    <h3 className="text-base font-bold text-slate-900">{faq.question}</h3>
                    <p className="mt-3 leading-7 text-slate-600">{faq.answer}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-[1500px] px-6 xl:px-10">
          <Reveal>
            <div className="overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-10 text-white shadow-2xl md:p-16">
              <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-3xl">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">
                    Ready to lock in?
                  </p>
                  <h2 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                    Stop guessing.
                    <br />
                    <span className="text-orange-400">Start winning.</span>
                  </h2>
                  <p className="mt-5 text-lg leading-8 text-blue-100">
                    Join nursing students using NCLEXAI to find their weak areas, train smarter, and stop leaving points on the table.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      "Exposes exact weak areas in the first session",
                      "Lexi explains the why behind every miss",
                      "Live lecture capture for every class",
                      "48-hour money-back — zero risk",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-blue-100">
                        <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex w-full max-w-xs flex-col gap-4">
                  <a
                    href="/checkout?plan=semester&source=final-cta"
                    onClick={() => trackCtaClick("final-cta", "Get Semester Access")}
                    className="rounded-2xl bg-orange-500 px-8 py-5 text-center text-xl font-black text-white shadow-lg transition hover:bg-orange-400 hover:shadow-orange-500/30 hover:shadow-2xl"
                  >
                    Get Semester Access
                    <span className="mt-1 block text-sm font-semibold text-orange-100">$129 one time</span>
                  </a>

                  <a
                    href="/login?returnTo=/chat&mode=signup"
                    onClick={() => trackCtaClick("final-cta-secondary", "Try Lexi Free")}
                    className="rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-center text-base font-semibold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Try Lexi Free First
                  </a>

                  <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-center backdrop-blur">
                    <p className="text-2xl">🛡️</p>
                    <p className="mt-2 text-sm font-bold text-white">48-Hour Guarantee</p>
                    <p className="mt-1 text-xs text-blue-200">Not satisfied? Full refund. No questions.</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-[1500px] px-6 py-14 xl:px-10">
          <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
            <div>
              <div className="inline-flex rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-2 text-lg font-black text-white shadow-md">
                NCLEXAI
              </div>
              <p className="mt-4 max-w-sm leading-7 text-slate-400">
                The adaptive nursing study platform built around Lexi AI coaching, weak-area targeting, and live lecture intelligence.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Built for nursing students who need real results, not more noise.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Product</h3>
              <div className="mt-4 space-y-3">
                {[["Quiz Generator", "/quiz"], ["Lexi AI Tutor", "/chat"], ["Study Assistant", "/study"], ["Dashboard", "/dashboard"]].map(([label, href]) => (
                  <a key={String(label)} href={String(href)} className="block text-slate-400 transition hover:text-white">
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Workflow</h3>
              <div className="mt-4 space-y-3">
                {[["Locker", "/closet"], ["Quiz History", "/history"], ["Weak Areas", "/dashboard"], ["Lecture Mode", "/lecture"]].map(([label, href]) => (
                  <a key={String(label)} href={String(href)} className="block text-slate-400 transition hover:text-white">
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Legal</h3>
              <div className="mt-4 space-y-3">
                {[["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Refund Policy", "/refund"], ["Contact", "mailto:nclexai@gmail.com"]].map(([label, href]) => (
                  <a key={String(label)} href={String(href)} className="block text-slate-400 transition hover:text-white">
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>© 2026 NCLEXAI. Built for nursing students.</p>
            <div className="flex flex-wrap gap-5">
              <a href="/privacy" className="transition hover:text-white">Privacy</a>
              <a href="/terms" className="transition hover:text-white">Terms</a>
              <a href="/refund" className="transition hover:text-white">Refunds</a>
              <a href="mailto:nclexai@gmail.com" className="transition hover:text-white">nclexai@gmail.com</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
