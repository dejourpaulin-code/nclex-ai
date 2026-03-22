import Link from "next/link";
import Navbar from "../../components/Navbar";

export const metadata = {
  title: "Pricing | NCLEXAI",
  description: "Choose the NCLEXAI plan that fits your study needs.",
};

type Plan = {
  name: string;
  price: string;
  suffix: string;
  badge: string;
  accent: "slate" | "blue" | "orange" | "purple" | "emerald";
  description: string;
  features: string[];
  href: string;
  cta: string;
  featured: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "$19",
    suffix: "/month",
    badge: "Entry",
    accent: "slate",
    description:
      "Start with core NCLEX-style quizzes and basic Lexi support.",
    features: [
      "Basic quiz generation",
      "Limited Lexi explanations",
      "Tutor mode access",
      "Good for trying the system",
    ],
    href: "/checkout?plan=starter-monthly&source=pricing-page",
    cta: "Start Starter",
    featured: false,
  },
  {
    name: "Core",
    price: "$30",
    suffix: "/month",
    badge: "Popular Monthly",
    accent: "blue",
    description:
      "Unlock the full adaptive workflow with smarter quizzes, weak-area targeting, and stronger AI coaching.",
    features: [
      "Full adaptive quizzes",
      "Weak-area targeting",
      "Full Lexi coaching",
      "Tutor + Exam modes",
      "Study assistant access",
    ],
    href: "/checkout?plan=core-monthly&source=pricing-page",
    cta: "Choose Core",
    featured: false,
  },
  {
    name: "Semester Access",
    price: "$129",
    suffix: "/one time",
    badge: "Most Popular",
    accent: "orange",
    description:
      "Best for students who want one focused semester of full access without monthly billing.",
    features: [
      "Everything in Core",
      "Full semester access",
      "No monthly renewals",
      "Strongest value for active students",
      "Built for exam-heavy stretches",
    ],
    href: "/checkout?plan=semester&source=pricing-page",
    cta: "Get Semester Access",
    featured: true,
  },
  {
    name: "3-Semester Accelerator",
    price: "$199",
    suffix: "/one time",
    badge: "Long-Term",
    accent: "purple",
    description:
      "Lock in multi-semester momentum and avoid restarting your study system every term.",
    features: [
      "Everything in Core",
      "3 semesters of access",
      "Better long-term value",
      "Stay consistent across terms",
    ],
    href: "/checkout?plan=three-semester&source=pricing-page",
    cta: "Lock In 3 Semesters",
    featured: false,
  },
  {
    name: "Full Program Access",
    price: "$249",
    suffix: "/one time",
    badge: "Best Value",
    accent: "emerald",
    description:
      "One decision for your whole nursing program. No renewals, no interruptions, no re-buying later.",
    features: [
      "Everything unlocked",
      "Covers the full program",
      "No renewals",
      "Lowest long-term cost",
      "Best total value",
    ],
    href: "/checkout?plan=full-program&source=pricing-page",
    cta: "Get Full Program Access",
    featured: false,
  },
];

function getPlanClasses(
  accent: "slate" | "blue" | "orange" | "purple" | "emerald",
  featured?: boolean
) {
  if (accent === "blue") {
    return {
      badge: "border-blue-200 bg-blue-100 text-blue-800",
      card: "border-blue-200 bg-white",
      button: "bg-blue-900 text-white hover:bg-blue-800",
      feature: "border-blue-100 bg-blue-50",
    };
  }

  if (accent === "orange") {
    return {
      badge: "bg-orange-500 text-white border-orange-500",
      card: featured
        ? "border-orange-300 bg-gradient-to-b from-orange-50 to-white shadow-2xl"
        : "border-orange-100 bg-white",
      button: "bg-orange-500 text-white hover:bg-orange-600",
      feature: "border-orange-100 bg-orange-50",
    };
  }

  if (accent === "purple") {
    return {
      badge: "border-purple-200 bg-purple-100 text-purple-700",
      card: "border-purple-200 bg-white",
      button: "bg-purple-600 text-white hover:bg-purple-700",
      feature: "border-purple-100 bg-purple-50",
    };
  }

  if (accent === "emerald") {
    return {
      badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
      card: "border-emerald-200 bg-white",
      button: "bg-emerald-600 text-white hover:bg-emerald-700",
      feature: "border-emerald-100 bg-emerald-50",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    card: "border-slate-200 bg-white",
    button:
      "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
    feature: "border-slate-200 bg-slate-50",
  };
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-[1500px] px-6 py-12 xl:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex rounded-full border border-orange-200 bg-orange-100 px-4 py-1 text-sm font-medium text-orange-700">
            Pricing
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
            Choose the plan that fits your
            <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
              NCLEX prep
            </span>
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            The faster you fix your weak areas, the less time you waste rereading
            the wrong material. Most students choose Semester Access because it
            removes monthly friction and gets full access immediately.
          </p>
        </div>

        <div className="mt-12 grid gap-6 xl:grid-cols-5">
          {plans.map((plan) => {
            const styles = getPlanClasses(plan.accent, plan.featured);

            return (
              <div
                key={plan.name}
                className={`relative flex h-full flex-col rounded-[32px] border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${styles.card}`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${styles.badge}`}
                  >
                    {plan.badge}
                  </span>

                  {plan.featured && (
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">
                      Best seller
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>

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

                  <div className="mt-3 space-y-3">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className={`rounded-2xl border px-4 py-3 text-sm font-medium text-slate-700 ${styles.feature}`}
                      >
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {plan.name === "Semester Access" && (
                  <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-700">
                      Most students choose this because it gives full access now
                      without stacking monthly payments.
                    </p>
                  </div>
                )}

                {plan.name === "Full Program Access" && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-700">
                      Smartest long-term play if you already know you want this
                      for the whole program.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex-1" />

                <Link
                  href={plan.href}
                  className={`mt-6 block rounded-2xl px-6 py-4 text-center text-base font-semibold transition ${styles.button}`}
                >
                  {plan.cta}
                </Link>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Founders pricing can increase as access expands
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
          <h3 className="text-2xl font-bold">Which plan unlocks what?</h3>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
              <p className="text-lg font-bold text-slate-900">Starter</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                Basic quiz generation, limited Lexi explanations, and tutor mode access.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-lg font-bold text-slate-900">Core</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                Full adaptive quizzes, weak-area targeting, full Lexi coaching,
                tutor + exam modes, and study assistant access.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-lg font-bold text-slate-900">One-Time Access Plans</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                Semester, 3-Semester, and Full Program options give you Core-level
                access without monthly renewals.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}