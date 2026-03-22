"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useState } from "react";

const avatarOptions = [
  {
    id: "starter-blue",
    name: "Starter Blue",
    bg: "from-blue-700 to-blue-500",
  },
  {
    id: "starter-orange",
    name: "Starter Orange",
    bg: "from-orange-500 to-amber-400",
  },
  {
    id: "starter-green",
    name: "Starter Green",
    bg: "from-emerald-600 to-green-400",
  },
];

export default function OnboardingPage() {
  const [educationLevel, setEducationLevel] = useState("Fundamentals");
  const [semesterLabel, setSemesterLabel] = useState("Semester 1");
  const [explanationStyle, setExplanationStyle] = useState("Simple first");
  const [avatarId, setAvatarId] = useState("starter-blue");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveProfile() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You must be logged in first.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      education_level: educationLevel,
      semester_label: semesterLabel,
      explanation_style: explanationStyle,
      avatar_id: avatarId,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const starterUnlocks = [
      { user_id: user.id, item_key: "starter-badge", item_type: "badge" },
      { user_id: user.id, item_key: "starter-stethoscope", item_type: "stethoscope" },
    ];

    await supabase.from("user_unlocks").upsert(starterUnlocks, {
      onConflict: "user_id,item_key",
    });

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
            Creator mode onboarding
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Set up your learning profile
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            Lexi will use this to teach at your level and adapt to you over time.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-xl">
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Where are you in your nursing education?
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-blue-50 p-3"
                >
                  <option>Pre-Nursing</option>
                  <option>Fundamentals</option>
                  <option>Med-Surg</option>
                  <option>Advanced</option>
                  <option>NCLEX Review</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  What semester are you in?
                </label>
                <select
                  value={semesterLabel}
                  onChange={(e) => setSemesterLabel(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-orange-50 p-3"
                >
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                  <option>Semester 3</option>
                  <option>Semester 4</option>
                  <option>Graduating Soon</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  How should Lexi explain things?
                </label>
                <select
                  value={explanationStyle}
                  onChange={(e) => setExplanationStyle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white p-3"
                >
                  <option>Simple first</option>
                  <option>NCLEX tips first</option>
                  <option>Step by step</option>
                  <option>Detailed reasoning</option>
                </select>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Choose your starter avatar
                </p>

                <div className="grid gap-4 sm:grid-cols-3">
                  {avatarOptions.map((avatar) => {
                    const active = avatarId === avatar.id;

                    return (
                      <button
                        key={avatar.id}
                        onClick={() => setAvatarId(avatar.id)}
                        className={`rounded-3xl border p-4 text-left transition ${
                          active
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${avatar.bg} text-2xl font-bold text-white`}
                        >
                          U
                        </div>
                        <p className="font-semibold text-slate-900">{avatar.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={loading}
                className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save and continue"}
              </button>

              {message && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                  {message}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Lexi preview</h2>
            <p className="mt-2 text-sm text-slate-500">
              Lexi will adapt to your level and style.
            </p>

            <div className="mt-6 rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-orange-500 text-2xl text-white">
                  🩺
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Lexi</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    I’ll remember your level, your weak areas, and how you like concepts explained.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-slate-700">
                Current setup
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Level: {educationLevel}</p>
                <p>Semester: {semesterLabel}</p>
                <p>Style: {explanationStyle}</p>
                <p>Avatar: {avatarId}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}