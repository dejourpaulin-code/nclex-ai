"use client";

import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from "react";

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

type LectureUploadResponse = {
  success?: boolean;
  sessionId?: string;
  transcript?: string;
  summary?: string;
  keyPoints?: string[];
  likelyTestableConcepts?: string[];
  studyPlan?: string[];
  quizQuestions?: string[];
  error?: string;
};

export default function LectureUploadPage() {
  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LectureUploadResponse | null>(null);

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

  async function handleUpload() {
    if (!audioFile) {
      setError("Please choose an audio file first.");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("userId", user.id);
      formData.append("title", title || "Lecture Upload Session");

      const res = await fetch("/api/lecture-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process lecture.");
        setUploading(false);
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to connect to the server.");
    }

    setUploading(false);
  }

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
              Loading your lecture upload permissions now.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const canUseLecture = !!access?.features?.lecture;

  if (!canUseLecture) {
    const loggedIn = !!access?.loggedIn;

    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />

        <section className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="rounded-[36px] border border-purple-200 bg-white p-8 shadow-2xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-4 py-1 text-sm font-semibold text-purple-800">
                  Lecture Upload locked
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  Lecture upload is available on
                  <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                    Starter and above
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Upload recorded lecture audio and let Lexi turn it into a transcript,
                  summary, key points, study plan, and quiz-ready review.
                </p>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  {[
                    "Lecture transcript generation",
                    "Lecture summary",
                    "Key point extraction",
                    "Likely testable concepts",
                    "Lecture study planning",
                    "Reusable lecture review",
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
                      href="/checkout?plan=starter-monthly&source=lecture-upload-gate"
                      className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
                    >
                      Upgrade to Starter
                    </a>
                  )}

                  <a
                    href="/lecture"
                    className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-center text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Back to Lecture Hub
                  </a>
                </div>

                <p className="mt-5 text-sm text-slate-500">
                  {loggedIn
                    ? `Your current access level: ${access?.accessLevel || "guest"}`
                    : "You are currently browsing as a guest."}
                </p>
              </div>

              <div className="rounded-[32px] border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-slate-900">What Starter unlocks</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Recorded lecture processing</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Upload outside class and turn the lecture into usable study material.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Lecture history</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Keep processed sessions saved so your work stays reusable.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-700">Core difference</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Core adds Live Full real-time lecture intelligence during class.
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

      <section className="mx-auto max-w-[1400px] px-6 py-10 xl:px-10">
        <div className="mb-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
              Lecture Upload Mode
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl xl:text-6xl">
              Turn recorded lectures into
              <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                study assets
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Upload class audio and let Lexi transform it into a transcript, summary,
              key concepts, study plan, and quiz-ready review.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Transcript</p>
              <p className="mt-2 text-2xl font-black">Yes</p>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Study Plan</p>
              <p className="mt-2 text-2xl font-black">Yes</p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Quiz Review</p>
              <p className="mt-2 text-2xl font-black">Yes</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold">How it works</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="font-semibold text-slate-900">1. Upload audio</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Add a recorded class lecture file.
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="font-semibold text-slate-900">2. Lexi processes it</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Transcript, summary, key points, and likely testable concepts are generated.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="font-semibold text-slate-900">3. Study smarter</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Use the output to review faster and build follow-up quizzes.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl">
              <h2 className="text-2xl font-bold">Upload lecture audio</h2>
              <p className="mt-2 text-sm text-slate-500">
                Choose an audio file and optionally give the session a title.
              </p>

              <div className="mt-6 grid gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Lecture title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Example: Med Surg Cardiac Lecture 4"
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Audio file
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900"
                  />
                  {audioFile && (
                    <p className="mt-2 text-sm text-slate-500">
                      Selected: {audioFile.name}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="rounded-2xl bg-orange-500 px-6 py-4 text-lg font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {uploading ? "Processing Lecture..." : "Upload and Process"}
                </button>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {result && (
              <>
                <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-2xl">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Lecture Summary</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Your lecture has been processed and saved.
                      </p>
                    </div>

                    {result.sessionId && (
                      <a
                        href={`/lecture/history/${result.sessionId}`}
                        className="rounded-2xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        Open Saved Session
                      </a>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="whitespace-pre-wrap leading-7 text-slate-800">
                      {result.summary || "No summary returned yet."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl">
                    <h2 className="text-2xl font-bold">Key Points</h2>
                    <div className="mt-4 space-y-3">
                      {(result.keyPoints?.length ? result.keyPoints : ["No key points returned yet."]).map(
                        (item, index) => (
                          <div
                            key={index}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                          >
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-2xl">
                    <h2 className="text-2xl font-bold">Likely Testable Concepts</h2>
                    <div className="mt-4 space-y-3">
                      {(
                        result.likelyTestableConcepts?.length
                          ? result.likelyTestableConcepts
                          : ["No likely testable concepts returned yet."]
                      ).map((item, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[32px] border border-indigo-100 bg-white p-6 shadow-2xl">
                    <h2 className="text-2xl font-bold">Study Plan</h2>
                    <div className="mt-4 space-y-3">
                      {(result.studyPlan?.length ? result.studyPlan : ["No study plan returned yet."]).map(
                        (item, index) => (
                          <div
                            key={index}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                          >
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-purple-100 bg-white p-6 shadow-2xl">
                    <h2 className="text-2xl font-bold">Quiz Seeds</h2>
                    <div className="mt-4 space-y-3">
                      {(
                        result.quizQuestions?.length ? result.quizQuestions : ["No quiz seeds returned yet."]
                      ).map((item, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl">
                  <h2 className="text-2xl font-bold">Transcript</h2>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="whitespace-pre-wrap leading-7 text-slate-800">
                      {result.transcript || "No transcript returned yet."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}