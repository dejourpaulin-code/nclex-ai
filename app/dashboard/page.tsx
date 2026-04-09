"use client";

import Navbar from "../../components/Navbar";
import AvatarDisplay from "../../components/AvatarDisplay";
import { supabase } from "../../lib/supabase";
import { useEffect, useMemo, useState } from "react";

type WeakAreaRow = {
  id: string;
  topic: string;
  misses: number;
  correct: number;
};

type HistoryRow = {
  id: string;
  topic: string;
  difficulty: string;
  is_correct: boolean | null;
  created_at: string;
};

type UnlockRow = {
  id: string;
  item_key: string;
  item_type: string;
  unlocked: boolean;
  equipped: boolean;
  unlocked_at: string;
};

type ProfileRow = {
  avatar_id: string;
  equipped_hat: string | null;
  equipped_badge: string | null;
  equipped_stethoscope: string | null;
  equipped_scrubs: string | null;
  education_level: string;
  semester_label: string;
  explanation_style: string;
  avatar_gender?: string | null;
  avatar_skin_tone?: string | null;
  avatar_hair_color?: string | null;
  avatar_eye_color?: string | null;
};

type MissionRow = {
  id: string;
  mission_type: string;
  mission_label: string;
  goal_count: number;
  progress_count: number;
  completed: boolean;
};

type StudyPlan = {
  headline: string;
  coachMessage: string;
  tasks: string[];
  focusTopic: string;
  studyMode: string;
  estimatedMinutes: number;
};

type PassPrediction = {
  probability: number;
  label: string;
  reasons: string[];
};

type MemoryBrain = {
  focusTopic: string;
  wins: string[];
  watchouts: string[];
  summary: string;
};

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
    weakAreas: boolean;
    lecture: boolean;
    liveFull: boolean;
    catExam: boolean;
  };
};

function itemVisual(itemKey: string, itemType: string) {
  if (itemType === "hat") {
    return itemKey === "hat-nurse-cap" ? "⛑️" : "🎓";
  }
  if (itemType === "badge") {
    return itemKey === "badge-bronze" ? "🥉" : "🏅";
  }
  if (itemType === "stethoscope") {
    return "🩺";
  }
  if (itemType === "scrubs") {
    if (itemKey === "scrubs-blue") return "🔵";
    if (itemKey === "scrubs-green") return "🟢";
    if (itemKey === "scrubs-purple") return "🟣";
  }
  return "✨";
}

function getHeatColor(percent: number) {
  if (percent >= 80) return "bg-red-500";
  if (percent >= 60) return "bg-orange-500";
  if (percent >= 40) return "bg-amber-400";
  if (percent >= 20) return "bg-yellow-300";
  return "bg-emerald-400";
}

function getHeatLabel(percent: number) {
  if (percent >= 80) return "High concern";
  if (percent >= 60) return "Needs work";
  if (percent >= 40) return "Watch closely";
  if (percent >= 20) return "Improving";
  return "Strong";
}

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

function getReadinessLabel(score: number) {
  if (score >= 85) return "Very strong";
  if (score >= 70) return "On track";
  if (score >= 55) return "Building";
  if (score >= 40) return "Needs structure";
  return "Early stage";
}

function getReadinessColor(score: number) {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-blue-600";
  if (score >= 55) return "bg-amber-400";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export default function DashboardPage() {
  const [weakAreas, setWeakAreas] = useState<WeakAreaRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [unlocks, setUnlocks] = useState<UnlockRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [passPrediction, setPassPrediction] = useState<PassPrediction | null>(null);
  const [memoryBrain, setMemoryBrain] = useState<MemoryBrain | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);

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

  useEffect(() => {
    async function loadData() {
      if (!access?.features?.dashboard) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWeakAreas([]);
        setHistory([]);
        setUnlocks([]);
        setProfile(null);
        setMissions([]);
        setStudyPlan(null);
        setPassPrediction(null);
        setMemoryBrain(null);
        setStudyPlanLoading(false);
        setLoading(false);
        return;
      }

      const [weakAreasRes, historyRes, unlockRes, profileRes, missionRes] =
        await Promise.all([
          supabase
            .from("user_weak_areas")
            .select("*")
            .eq("user_id", user.id)
            .order("misses", { ascending: false })
            .limit(8),

          supabase
            .from("quiz_history")
            .select("id, topic, difficulty, is_correct, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),

          supabase
            .from("user_unlocks")
            .select("*")
            .eq("user_id", user.id)
            .order("unlocked_at", { ascending: false }),

          supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),

          fetch("/api/daily-missions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          }),
        ]);

      const missionData = await missionRes.json();

      setWeakAreas(weakAreasRes.data || []);
      setHistory(historyRes.data || []);
      setUnlocks(unlockRes.data || []);
      setProfile(profileRes.data || null);
      setMissions(missionData.missions || []);

      setStudyPlanLoading(true);

      try {
        const [studyPlanRes, passRes, memoryRes] = await Promise.all([
          fetch("/api/study-plan", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          }),
          fetch("/api/pass-probability", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          }),
          fetch("/api/lexi-memory", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
            }),
          }),
        ]);

        const [studyPlanData, passData, memoryData] = await Promise.all([
          studyPlanRes.json(),
          passRes.json(),
          memoryRes.json(),
        ]);

        setStudyPlan(studyPlanRes.ok ? studyPlanData : null);
        setPassPrediction(passRes.ok ? passData : null);
        setMemoryBrain(memoryRes.ok ? memoryData : null);
      } catch {
        setStudyPlan(null);
        setPassPrediction(null);
        setMemoryBrain(null);
      }

      setStudyPlanLoading(false);
      setLoading(false);
    }

    if (!accessLoading) {
      loadData();
    }
  }, [access, accessLoading]);

  const totalAnswered = history.length;
  const totalCorrect = history.filter((row) => row.is_correct).length;
  const accuracy =
    totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);

  const recentTrend = useMemo(() => {
    const recent = history.slice(0, 10).reverse();
    return recent.map((row, index) => ({
      label: index + 1,
      value: row.is_correct ? 100 : 30,
      isCorrect: !!row.is_correct,
    }));
  }, [history]);

  const topWeakTopic = weakAreas.length > 0 ? weakAreas[0].topic : null;
  const totalUnlocked = unlocks.length;
  const equippedCount = unlocks.filter((item) => item.equipped).length;

  const heatmapRows = useMemo(() => {
    return weakAreas.map((area) => {
      const totalAttempts = area.correct + area.misses;
      const missRate =
        totalAttempts === 0 ? 0 : Math.round((area.misses / totalAttempts) * 100);
      const mastery =
        totalAttempts === 0 ? 0 : Math.round((area.correct / totalAttempts) * 100);

      return {
        ...area,
        totalAttempts,
        missRate,
        mastery,
        heatColor: getHeatColor(missRate),
        heatLabel: getHeatLabel(missRate),
      };
    });
  }, [weakAreas]);

  const strongestTopic = useMemo(() => {
    const withAttempts = [...heatmapRows].filter((row) => row.totalAttempts > 0);
    if (withAttempts.length === 0) return null;

    return withAttempts.sort((a, b) => {
      if (b.mastery !== a.mastery) return b.mastery - a.mastery;
      return b.totalAttempts - a.totalAttempts;
    })[0];
  }, [heatmapRows]);

  const readinessScore = useMemo(() => {
    if (totalAnswered === 0) return 0;

    const avgMastery =
      heatmapRows.length === 0
        ? accuracy
        : Math.round(
            heatmapRows.reduce((sum, row) => sum + row.mastery, 0) /
              heatmapRows.length
          );

    const recent = history.slice(0, 15);
    const recentCorrect = recent.filter((row) => row.is_correct).length;
    const recentAccuracy =
      recent.length === 0
        ? accuracy
        : Math.round((recentCorrect / recent.length) * 100);

    const topWeakMissRate = heatmapRows[0]?.missRate || 0;
    const volumeStrength = Math.min(totalAnswered, 250) / 250;

    const score =
      accuracy * 0.34 +
      recentAccuracy * 0.26 +
      avgMastery * 0.22 +
      volumeStrength * 100 * 0.18 -
      topWeakMissRate * 0.16;

    return clamp(Math.round(score), 0, 99);
  }, [accuracy, heatmapRows, history, totalAnswered]);

  const readinessLabel = getReadinessLabel(readinessScore);
  const readinessColor = getReadinessColor(readinessScore);

  const lexiEmotion = useMemo(() => {
    if (totalAnswered === 0) {
      return {
        emoji: "🩺",
        label: "Ready",
        message: "Lexi is waiting to learn your patterns.",
      };
    }

    if (readinessScore >= 80) {
      return {
        emoji: "🔥",
        label: "Momentum",
        message: "Lexi thinks you're building strong momentum.",
      };
    }

    if (readinessScore >= 60) {
      return {
        emoji: "🧠",
        label: "Focused",
        message: "Lexi is locked in on your next improvement zone.",
      };
    }

    return {
      emoji: "⚠️",
      label: "Concerned",
      message: "Lexi sees weak spots that need immediate structure.",
    };
  }, [readinessScore, totalAnswered]);

  const lexiCoach = useMemo(() => {
    if (totalAnswered === 0) {
      return {
        mood: "🩺 Ready",
        title: "Let’s build your baseline",
        message:
          "You haven’t answered enough questions for me to coach you yet. Start with a short set so I can identify your strongest and weakest areas.",
        primaryHref: "/quiz?count=5&mode=Tutor%20Mode",
        primaryLabel: "Start 5-Question Baseline",
        secondaryHref: "/chat",
        secondaryLabel: "Ask Lexi Where To Start",
      };
    }

    if (topWeakTopic) {
      return {
        mood: "🧠 Adaptive Coach",
        title: `Your biggest focus right now is ${topWeakTopic}`,
        message: `I’m seeing the most friction in ${topWeakTopic}. Run a short targeted drill now and we can tighten that area fast.`,
        primaryHref: "/drill",
        primaryLabel: "⚡ Start 3-Minute Drill",
        secondaryHref: `/quiz?topic=${encodeURIComponent(
          topWeakTopic
        )}&count=10&mode=Tutor%20Mode`,
        secondaryLabel: `Train ${topWeakTopic}`,
      };
    }

    if (accuracy < 60) {
      return {
        mood: "⚠️ Rebuild",
        title: "Let’s slow things down and stabilize",
        message:
          "Your accuracy says you’d benefit from smaller targeted sets and simpler explanations before doing bigger quiz runs.",
        primaryHref: "/drill",
        primaryLabel: "Do a Gentle Drill",
        secondaryHref: "/study",
        secondaryLabel: "Study With Lexi",
      };
    }

    return {
      mood: "🎯 On Track",
      title: "You’re building real momentum",
      message:
        "You’ve got enough data now for targeted training. Keep pressure on weak areas while maintaining your stronger topics.",
      primaryHref: "/drill",
      primaryLabel: "⚡ Start 3-Minute Drill",
      secondaryHref: "/quiz?topic=All%20Topics&count=20&mode=Exam%20Mode",
      secondaryLabel: "Run Full Mixed Set",
    };
  }, [accuracy, topWeakTopic, totalAnswered]);

  const recommendedPlan = useMemo(() => {
    if (totalAnswered === 0) {
      return [
        "Answer 5 baseline questions so Lexi can identify weak areas.",
        "Use Tutor Mode first to collect rationales and patterns.",
        "Come back after your first set to unlock targeted coaching.",
      ];
    }

    const plan: string[] = [];

    if (topWeakTopic) {
      plan.push(`Run a 3-minute drill on ${topWeakTopic}.`);
    }

    if (accuracy < 65) {
      plan.push(
        "Stay in Tutor Mode and tighten fundamentals before longer exam sets."
      );
    } else {
      plan.push("Mix weak-area practice with one larger mixed-topic exam set.");
    }

    if (strongestTopic?.topic) {
      plan.push(
        `Maintain confidence in ${strongestTopic.topic} with occasional review.`
      );
    } else {
      plan.push("Keep building topic coverage so Lexi can detect stronger areas.");
    }

    return plan.slice(0, 3);
  }, [accuracy, strongestTopic?.topic, topWeakTopic, totalAnswered]);

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
              Loading your dashboard permissions now.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const canUseDashboard = !!access?.features?.dashboard;

  if (!canUseDashboard) {
    const loggedIn = !!access?.loggedIn;

    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />

        <section className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="rounded-[36px] border border-blue-200 bg-white p-8 shadow-2xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-800">
                  Dashboard locked
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  The full dashboard is available on
                  <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                    Core and above
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Readiness tracking, weak-area heatmaps, AI study plans, pass prediction,
                  memory analysis, and deeper coaching all live inside the paid dashboard.
                </p>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  {[
                    "NCLEX readiness engine",
                    "Weak-area heatmap",
                    "Lexi AI study planner",
                    "Pass probability estimate",
                    "Memory brain analysis",
                    "Avatar progression overview",
                    "Daily mission tracking",
                    "Recommended next moves",
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
                      href="/checkout?plan=core-monthly&source=dashboard-gate"
                      className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
                    >
                      Upgrade to Core
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
                <h2 className="text-2xl font-bold text-slate-900">Why this matters</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  The dashboard is where NCLEXAI stops being “just more questions” and starts
                  acting like an actual feedback system.
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">See what is costing you points</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Weak-area tracking shows which subjects keep dragging your score down.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Know your next move instantly</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Lexi builds a plan instead of leaving you guessing what to study next.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Track readiness like a real system</p>
                    <p className="mt-1 text-sm text-slate-600">
                      See readiness, pass probability, trend, and memory signals in one place.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-700">Recommended plan</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Core is the entry point for students who want the full feedback loop, not just basic access.
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

      <section className="mx-auto max-w-7xl px-4 py-5 xl:px-8">

        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
              Personal study dashboard
            </div>
            <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
            <p className="mt-0.5 text-sm text-slate-500">Track progress, see weak areas, and let Lexi coach your next move.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/drill" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">⚡ 3 Min Drill</a>
            <a href={topWeakTopic ? `/quiz?topic=${encodeURIComponent(topWeakTopic || "")}` : "/quiz"} className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">Practice Weak Area</a>
            <a href="/chat" className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50">Ask Lexi</a>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">Loading dashboard...</div>
        ) : (
          <>
            {/* Stats row */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
                <p className="text-xs text-slate-500">Answered</p>
                <p className="mt-1 text-3xl font-black">{totalAnswered}</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
                <p className="text-xs text-slate-500">Correct</p>
                <p className="mt-1 text-3xl font-black">{totalCorrect}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm">
                <p className="text-xs text-slate-500">Accuracy</p>
                <p className="mt-1 text-3xl font-black">{accuracy}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs text-slate-500">Top Weak Area</p>
                <p className="mt-1 text-lg font-black leading-tight">{topWeakTopic || "None yet"}</p>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-white p-3 shadow-sm">
                <p className="text-xs text-slate-500">NCLEX Readiness</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-3xl font-black">{readinessScore}%</p>
                  <span className={`mb-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${readinessColor}`}>{readinessLabel}</span>
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">

              {/* Left column */}
              <div className="space-y-4">

                {/* Lexi Coach */}
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-1.5 inline-flex rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">{lexiCoach.mood}</div>
                      <h2 className="text-base font-bold">{lexiCoach.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{lexiCoach.message}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <a href={lexiCoach.primaryHref} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">{lexiCoach.primaryLabel}</a>
                      <a href={lexiCoach.secondaryHref} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">{lexiCoach.secondaryLabel}</a>
                    </div>
                  </div>
                </div>

                {/* Study Plan + Memory Brain side by side */}
                <div className="grid gap-4 md:grid-cols-2">

                  {/* Study Planner */}
                  <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="mb-1 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">AI Study Planner</div>
                        <h2 className="text-sm font-bold">{studyPlanLoading ? "Building plan..." : studyPlan?.headline || "Today's Plan"}</h2>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">{studyPlan?.studyMode || "Tutor Mode"}</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">{studyPlan?.estimatedMinutes || 15} min</span>
                      </div>
                    </div>
                    <p className="mb-3 text-xs leading-5 text-slate-500">{studyPlanLoading ? "Lexi is analyzing your data..." : studyPlan?.coachMessage || "Lexi will generate your plan here."}</p>
                    <div className="space-y-2">
                      {(studyPlan?.tasks || ["Run a short targeted quiz.", "Review one weak topic with Lexi.", "Finish with a confidence-building mixed set."]).map((task, index) => (
                        <div key={index} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{index + 1}</div>
                          <p className="text-xs leading-5 text-slate-700">{task}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href="/drill" className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600">Start Drill</a>
                      <a href={topWeakTopic ? `/quiz?topic=${encodeURIComponent(topWeakTopic || "")}` : "/quiz"} className="rounded-xl bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800">Guided Quiz</a>
                      <a href="/study" className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100">Study With Lexi</a>
                    </div>
                  </div>

                  {/* Memory Brain */}
                  <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="mb-1 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700">Lexi Memory Brain</div>
                        <h2 className="text-sm font-bold">{lexiEmotion.emoji} {lexiEmotion.label}</h2>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Focus: {memoryBrain?.focusTopic || topWeakTopic || "General"}</span>
                    </div>
                    <p className="mb-3 text-xs leading-5 text-slate-500">{lexiEmotion.message}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="mb-1.5 text-xs font-bold text-emerald-700">Improving</p>
                        <div className="space-y-1">
                          {(memoryBrain?.wins || ["Still building data."]).map((item, i) => (
                            <p key={i} className="text-xs leading-5 text-slate-700">{item}</p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                        <p className="mb-1.5 text-xs font-bold text-orange-700">Watching</p>
                        <div className="space-y-1">
                          {(memoryBrain?.watchouts || ["No watchouts yet."]).map((item, i) => (
                            <p key={i} className="text-xs leading-5 text-slate-700">{item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                      {memoryBrain?.summary || "Lexi is still learning your study patterns."}
                    </div>
                  </div>
                </div>

                {/* Readiness + Pass Predictor side by side */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-bold">Readiness Engine</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Live</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span>NCLEX Readiness</span><span>{readinessScore}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${readinessColor}`} style={{ width: `${readinessScore}%` }} />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">Currently in the <span className="font-semibold text-slate-800">{readinessLabel}</span> zone.</p>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-2">
                        <p className="text-[10px] text-slate-500">Strongest Topic</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-900">{strongestTopic?.topic || "Still building"}</p>
                      </div>
                      <div className="rounded-xl border border-orange-100 bg-orange-50 p-2">
                        <p className="text-[10px] text-slate-500">Biggest Risk</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-900">{topWeakTopic || "None yet"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-fuchsia-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-bold">Pass Predictor</h2>
                      <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700">{passPrediction?.label || "Estimating"}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Pass Probability</span><span>{passPrediction?.probability ?? 0}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-fuchsia-600" style={{ width: `${passPrediction?.probability ?? 0}%` }} />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {(passPrediction?.reasons || ["Lexi is gathering data to estimate your pass probability."]).map((reason, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{reason}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Performance */}
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-bold">Recent Performance <span className="font-normal text-slate-400 text-xs">— last 10 answers</span></h2>
                  {history.slice(0, 10).length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-400">No recent data yet. Answer some questions to see your performance here.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {history.slice(0, 10).map((row, i) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <span className="w-4 shrink-0 text-[10px] font-bold text-slate-400">{i + 1}</span>
                          <div className={`h-6 flex-1 rounded-lg ${row.is_correct === true ? "bg-emerald-100" : "bg-red-100"}`}>
                            <div
                              className={`h-full rounded-lg ${row.is_correct === true ? "bg-emerald-500" : "bg-red-400"}`}
                              style={{ width: row.is_correct === true ? "100%" : "30%" }}
                            />
                          </div>
                          <span className={`shrink-0 text-[10px] font-semibold ${row.is_correct === true ? "text-emerald-600" : "text-red-500"}`}>
                            {row.is_correct === true ? "✓" : "✗"}
                          </span>
                          <span className="max-w-[90px] truncate text-[10px] text-slate-400">{row.topic}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Weak-Area Heatmap */}
                <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold">Weak-Area Heatmap</h2>
                    {topWeakTopic && (
                      <a href={`/quiz?topic=${encodeURIComponent(topWeakTopic || "")}`} className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600">Train {topWeakTopic}</a>
                    )}
                  </div>
                  {heatmapRows.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-400">No weak-area data yet. Practice a few questions first.</div>
                  ) : (
                    <div className="space-y-2">
                      {heatmapRows.map((area) => (
                        <div key={area.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{area.topic}</p>
                              <p className="text-[10px] text-slate-500">{area.totalAttempts} attempts · {area.correct} correct · {area.misses} misses</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${area.heatColor}`}>{area.heatLabel}</span>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">{area.missRate}%</span>
                            </div>
                          </div>
                          <div className="mb-1 grid grid-cols-2 gap-2">
                            <div>
                              <div className="mb-1 flex justify-between text-[10px] text-slate-400"><span>Weakness</span><span>{area.missRate}%</span></div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${area.heatColor}`} style={{ width: `${area.missRate}%` }} /></div>
                            </div>
                            <div>
                              <div className="mb-1 flex justify-between text-[10px] text-slate-400"><span>Mastery</span><span>{area.mastery}%</span></div>
                              <div className="h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${area.mastery}%` }} /></div>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <a href={`/quiz?topic=${encodeURIComponent(area.topic)}`} className="rounded-xl bg-blue-900 px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-800">Practice</a>
                            <a href="/chat" className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-100">Ask Lexi</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unlocked Gear */}
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-bold">Unlocked Gear</h2>
                  {unlocks.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-400">No unlocks yet. Answer more questions to start collecting gear.</div>
                  ) : (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                      {unlocks.map((item) => (
                        <div key={item.id} className={`rounded-xl border p-3 ${item.equipped ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl">{itemVisual(item.item_key, item.item_type)}</div>
                            {item.equipped ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Equipped</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Unlocked</span>
                            )}
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-800">{item.item_key}</p>
                          <p className="text-[10px] text-slate-400">{item.item_type}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right sticky sidebar */}
              <div className="space-y-4 xl:self-start xl:sticky xl:top-[72px]">

                {/* Avatar */}
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-bold">Avatar Progress</h2>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                    <div className="mx-auto flex justify-center">
                      <AvatarDisplay avatarId={profile?.avatar_id} scrubs={profile?.equipped_scrubs} hat={profile?.equipped_hat} badge={profile?.equipped_badge} stethoscope={profile?.equipped_stethoscope} size={120} config={{ gender: (profile?.avatar_gender as "female"|"male") ?? "female", skinTone: (profile?.avatar_skin_tone as "light"|"medium"|"tan"|"dark") ?? "light", hairColor: (profile?.avatar_hair_color as "black"|"brown"|"blonde"|"red"|"auburn") ?? "black", eyeColor: (profile?.avatar_eye_color as "brown"|"blue"|"green"|"hazel"|"gray") ?? "brown" }} />
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-500">
                      <p>Level: <span className="font-semibold text-slate-800">{profile?.education_level || "Not set"}</span></p>
                      <p>Semester: <span className="font-semibold text-slate-800">{profile?.semester_label || "Not set"}</span></p>
                      <p>Style: <span className="font-semibold text-slate-800">{profile?.explanation_style || "Not set"}</span></p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-orange-100 bg-orange-50 p-2 text-center">
                      <p className="text-[10px] text-slate-500">Unlocked</p>
                      <p className="text-xl font-black">{totalUnlocked}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-center">
                      <p className="text-[10px] text-slate-500">Equipped</p>
                      <p className="text-xl font-black">{equippedCount}</p>
                    </div>
                  </div>
                  <a href="/closet" className="mt-3 block rounded-xl bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-orange-600">Manage Gear</a>
                </div>

                {/* Daily Missions */}
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-bold">Daily Missions</h2>
                  <div className="space-y-2">
                    {missions.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-400">No daily missions yet.</div>
                    ) : (
                      missions.map((m) => (
                        <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-800">{m.mission_label}</span>
                            <span className="text-[10px] text-slate-500">{m.progress_count}/{m.goal_count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200">
                            <div className={`h-full rounded-full ${m.completed ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${Math.min((m.progress_count / m.goal_count) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-bold">Quick Actions</h2>
                  <div className="flex flex-col gap-2">
                    <a href={topWeakTopic ? `/quiz?topic=${encodeURIComponent(topWeakTopic || "")}` : "/quiz"} className="rounded-xl bg-blue-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-800">Weak-Area Quiz</a>
                    <a href="/drill" className="rounded-xl bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-orange-600">Quick Drill</a>
                    <a href="/chat" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100">Talk to Lexi</a>
                    <a href="/history" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100">Quiz History</a>
                  </div>
                </div>

                {/* Next Unlocks */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-bold">Next Unlock Targets</h2>
                  <div className="space-y-2">
                    {[
                      "10 questions → Bronze Badge",
                      "25 questions → Nurse Cap",
                      "20 correct → Orange Stethoscope",
                    ].map((t) => (
                      <div key={t} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">{t}</div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
