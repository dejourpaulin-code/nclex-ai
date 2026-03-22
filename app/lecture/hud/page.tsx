"use client";

import Navbar from "../../../components/Navbar";
import { useEffect, useMemo, useState } from "react";

type LiveAnalysisPrompt = {
  promptType: string;
  promptText: string;
  promptContext: string;
};

type LiveAnalysisResponse = {
  heading?: string;
  cleanedTranscript?: string;
  summary: string;
  keyPoints: string[];
  bestQuestion: string;
  safeAnswer: string;
  sharperFollowUp: string;
  classContribution: string;
  prompts: LiveAnalysisPrompt[];
};

type HudState = {
  sessionId: string | null;
  listening: boolean;
  secondsLive: number;
  fullTranscript: string;
  liveText: string;
  analysis: LiveAnalysisResponse | null;
  updatedAt: number;
};

type LegacyHudPayload = {
  summary: string;
  keyPoints: string[];
  bestQuestion: string;
  safeAnswer: string;
  sharperFollowUp: string;
  classContribution: string;
  prompts: LiveAnalysisPrompt[];
};

function secondsToClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function LectureHudPage() {
  const [hudState, setHudState] = useState<HudState | null>(null);
  const [legacyPayload, setLegacyPayload] = useState<LegacyHudPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const readHudState = () => {
      try {
        const rawHud = window.localStorage.getItem("lexi-live-hud");
        if (rawHud) {
          const parsedHud = JSON.parse(rawHud) as HudState;
          setHudState(parsedHud);
        } else {
          setHudState(null);
        }
      } catch {
        setHudState(null);
      }

      try {
        const rawAnalysis = window.localStorage.getItem("lexi-live-analysis");
        if (rawAnalysis) {
          const parsedAnalysis = JSON.parse(rawAnalysis) as LegacyHudPayload;
          setLegacyPayload(parsedAnalysis);
        } else {
          setLegacyPayload(null);
        }
      } catch {
        setLegacyPayload(null);
      }
    };

    readHudState();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "lexi-live-hud" || event.key === "lexi-live-analysis") {
        readHudState();
      }
    };

    window.addEventListener("storage", onStorage);

    const interval = window.setInterval(readHudState, 800);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, []);

  const payload = useMemo(() => {
    if (hudState?.analysis) return hudState.analysis;
    return legacyPayload;
  }, [hudState, legacyPayload]);

  const topSideQuest = useMemo(() => {
    return payload?.prompts?.[0] || null;
  }, [payload]);

  const transcriptPreview = useMemo(() => {
    const full = hudState?.fullTranscript?.trim() || "";
    const live = hudState?.liveText?.trim() || "";
    return [full, live].filter(Boolean).join(" ").trim();
  }, [hudState]);

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function refreshHud() {
    setLoading(true);

    try {
      const rawHud = window.localStorage.getItem("lexi-live-hud");
      if (rawHud) {
        setHudState(JSON.parse(rawHud));
      }

      const rawAnalysis = window.localStorage.getItem("lexi-live-analysis");
      if (rawAnalysis) {
        setLegacyPayload(JSON.parse(rawAnalysis));
      }
    } catch {
      //
    }

    window.setTimeout(() => setLoading(false), 400);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-300">
              Lecture HUD
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Live Classroom Prompt Board
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-slate-300">
              Fast-glance classroom mode for real participation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/lecture/live-full"
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Back to Live Full
            </a>
            <button
              onClick={refreshHud}
              className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              {loading ? "Refreshing..." : "Refresh HUD"}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</p>
            <p className="mt-2 text-lg font-bold text-white">
              {hudState?.listening ? "● Listening live" : "Idle"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Timer</p>
            <p className="mt-2 text-lg font-bold text-white">
              {secondsToClock(hudState?.secondsLive || 0)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Session</p>
            <p className="mt-2 truncate text-sm font-semibold text-white">
              {hudState?.sessionId || "No active session"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">HUD Sync</p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              {hudState?.updatedAt ? "Live updating" : "Fallback mode"}
            </p>
          </div>
        </div>

        {!payload ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-2xl font-bold">No live lecture data yet</h2>
            <p className="mt-3 text-slate-300">
              Start Full Live Lecture Mode first, then open this HUD page.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[28px] border border-fuchsia-400/30 bg-fuchsia-500/10 p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-300">
                  Ask this
                </p>
                <p className="mt-4 text-2xl font-black leading-relaxed text-white md:text-3xl">
                  {payload.bestQuestion || "No live question yet."}
                </p>
                <button
                  onClick={() => copyText(payload.bestQuestion || "")}
                  className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Copy Question
                </button>
              </div>

              <div className="rounded-[28px] border border-blue-400/30 bg-blue-500/10 p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-300">
                  Say this if called on
                </p>
                <p className="mt-4 text-2xl font-black leading-relaxed text-white md:text-3xl">
                  {payload.safeAnswer || "No safe answer yet."}
                </p>
                <button
                  onClick={() => copyText(payload.safeAnswer || "")}
                  className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Copy Safe Answer
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[28px] border border-orange-400/30 bg-orange-500/10 p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">
                  Follow with this
                </p>
                <p className="mt-4 text-xl font-bold leading-relaxed text-white md:text-2xl">
                  {payload.sharperFollowUp || "No follow-up yet."}
                </p>
                <button
                  onClick={() => copyText(payload.sharperFollowUp || "")}
                  className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Copy Follow-Up
                </button>
              </div>

              <div className="rounded-[28px] border border-emerald-400/30 bg-emerald-500/10 p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
                  Add this to discussion
                </p>
                <p className="mt-4 text-xl font-bold leading-relaxed text-white md:text-2xl">
                  {payload.classContribution || "No class contribution yet."}
                </p>
                <button
                  onClick={() => copyText(payload.classContribution || "")}
                  className="mt-5 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Copy Contribution
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-cyan-400/30 bg-cyan-500/10 p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
                  Current lecture read
                </p>
                <p className="mt-4 text-lg leading-8 text-white">
                  {payload.summary || "No summary yet."}
                </p>

                <div className="mt-6 space-y-3">
                  {(payload.keyPoints || []).map((point, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 text-base leading-7 text-slate-100"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-purple-400/30 bg-purple-500/10 p-6 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
                  Side quest
                </p>
                <p className="mt-4 text-xl font-black leading-relaxed text-white">
                  {topSideQuest?.promptText || "No side quest yet."}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {topSideQuest?.promptContext || "Lexi will surface a side quest here."}
                </p>

                <div className="mt-6 space-y-3">
                  {(payload.prompts || []).slice(0, 4).map((prompt, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                        {prompt.promptType.replaceAll("_", " ")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white">
                        {prompt.promptText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-300">
                Live transcript preview
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                {transcriptPreview || "No live transcript yet."}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}