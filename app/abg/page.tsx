"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../../components/Navbar";

type Difficulty = "easy" | "mixed" | "hard";

type ABGQuestion = {
  scenario: string;
  values: {
    pH: number;
    PaCO2: number;
    HCO3: number;
    PaO2: number;
    SaO2: number;
  };
  correctAnswer: string;
  choices: string[];
  explanation: string;
  clinicalPearl: string;
};

type Phase = "idle" | "loading" | "question" | "answered" | "error";

const NORMAL: Record<string, [number, number]> = {
  pH: [7.35, 7.45],
  PaCO2: [35, 45],
  HCO3: [22, 26],
  PaO2: [80, 100],
  SaO2: [95, 100],
};

const UNITS: Record<string, string> = {
  pH: "",
  PaCO2: " mmHg",
  HCO3: " mEq/L",
  PaO2: " mmHg",
  SaO2: "%",
};

const DISPLAY_NAMES: Record<string, string> = {
  pH: "pH",
  PaCO2: "PaCO₂",
  HCO3: "HCO₃⁻",
  PaO2: "PaO₂",
  SaO2: "SaO₂",
};

function getValueStatus(key: string, val: number): "low" | "high" | "normal" {
  const [lo, hi] = NORMAL[key];
  if (val < lo) return "low";
  if (val > hi) return "high";
  return "normal";
}

function valueColor(key: string, val: number): string {
  const status = getValueStatus(key, val);
  if (status === "normal") return "text-emerald-400";
  if (key === "pH") return status === "low" ? "text-red-400" : "text-blue-400";
  if (key === "PaCO2") return status === "high" ? "text-amber-400" : "text-blue-400";
  if (key === "HCO3") return status === "high" ? "text-amber-400" : "text-orange-400";
  return "text-red-400"; // PaO2, SaO2 low
}

function arrowIndicator(key: string, val: number): string {
  const status = getValueStatus(key, val);
  if (status === "low") return "↓";
  if (status === "high") return "↑";
  return "→";
}

export default function ABGPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [queue, setQueue] = useState<ABGQuestion[]>([]);
  const [current, setCurrent] = useState<ABGQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats] = useState({ streak: 0, bestStreak: 0, total: 0, correct: 0 });
  const [showReference, setShowReference] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const fetchingRef = useRef(false);
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const fetchBatch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch("/api/abg/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: difficultyRef.current, count: 6 }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setQueue((prev) => [...prev, ...(data.questions as ABGQuestion[])]);
      setFetchError("");
    } catch {
      setFetchError("Failed to load questions. Check connection and retry.");
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Advance to next question from queue
  function advanceQuestion(q: ABGQuestion[], newStats: typeof stats) {
    if (q.length === 0) {
      setPhase("loading");
      fetchBatch();
      return;
    }
    const [next, ...rest] = q;
    setCurrent(next);
    setQueue(rest);
    setSelected(null);
    setPhase("question");
    // Pre-fetch when running low
    if (rest.length <= 2) fetchBatch();
  }

  function startSession() {
    setStats({ streak: 0, bestStreak: 0, total: 0, correct: 0 });
    setQueue([]);
    setCurrent(null);
    setSelected(null);
    setFetchError("");
    setPhase("loading");
    fetchBatch();
  }

  // When queue updates and we're in loading state, advance
  useEffect(() => {
    if (phase === "loading" && queue.length > 0) {
      advanceQuestion(queue, stats);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, phase]);

  function selectAnswer(choice: string) {
    if (phase !== "question" || !current) return;
    setSelected(choice);
    const correct = choice === current.correctAnswer;
    setStats((prev) => {
      const newStreak = correct ? prev.streak + 1 : 0;
      return {
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        total: prev.total + 1,
        correct: prev.correct + (correct ? 1 : 0),
      };
    });
    setPhase("answered");
  }

  function nextQuestion() {
    advanceQuestion(queue, stats);
  }

  function changeDifficulty(d: Difficulty) {
    setDifficulty(d);
    // Clear queue so next fetch uses new difficulty
    setQueue([]);
    if (phase === "idle") return;
    // If mid-session, keep current question but pre-fetch with new difficulty
    fetchingRef.current = false;
    setTimeout(() => fetchBatch(), 50);
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
  const isCorrect = selected !== null && current !== null && selected === current.correctAnswer;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700 bg-slate-900">
        <Navbar />
      </div>

      <section className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-700 bg-blue-900/50 px-3 py-0.5 text-xs font-medium text-blue-300">
            ABG Hot Lab
            <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">LIVE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">ABG Hot Lab</h1>
          <p className="mt-1 text-sm text-slate-400">
            Nonstop arterial blood gas interpretation. Read the values, pick the interpretation, get instant feedback.
          </p>
        </div>

        {/* Stats bar */}
        {stats.total > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Streak</p>
                <p className="text-lg font-black text-orange-400">{stats.streak}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Accuracy</p>
              <p className={`text-lg font-black ${accuracy !== null && accuracy >= 80 ? "text-emerald-400" : accuracy !== null && accuracy >= 60 ? "text-amber-400" : "text-red-400"}`}>
                {accuracy !== null ? `${accuracy}%` : "—"}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Answered</p>
              <p className="text-lg font-black text-white">{stats.total}</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Best Streak</p>
              <p className="text-lg font-black text-amber-400">{stats.bestStreak}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setShowReference((v) => !v)}
                className="rounded-xl border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-600"
              >
                {showReference ? "Hide ref" : "Quick ref"}
              </button>
            </div>
          </div>
        )}

        {/* Quick Reference */}
        {showReference && (
          <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-xs">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">ABG Quick Reference</p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="mb-1 font-bold text-slate-300">Normal Values</p>
                <p className="text-slate-400">pH: <span className="text-emerald-400">7.35–7.45</span></p>
                <p className="text-slate-400">PaCO₂: <span className="text-emerald-400">35–45 mmHg</span></p>
                <p className="text-slate-400">HCO₃⁻: <span className="text-emerald-400">22–26 mEq/L</span></p>
                <p className="text-slate-400">PaO₂: <span className="text-emerald-400">80–100 mmHg</span></p>
                <p className="text-slate-400">SaO₂: <span className="text-emerald-400">95–100%</span></p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
                <p className="mb-1 font-bold text-slate-300">ROME Rule</p>
                <p className="text-slate-400"><span className="font-semibold text-blue-400">R</span>espiratory = <span className="font-semibold text-blue-400">O</span>pposite</p>
                <p className="mb-2 text-slate-500">pH↓ CO₂↑ / pH↑ CO₂↓</p>
                <p className="text-slate-400"><span className="font-semibold text-amber-400">M</span>etabolic = <span className="font-semibold text-amber-400">E</span>qual</p>
                <p className="text-slate-500">pH↓ HCO₃↓ / pH↑ HCO₃↑</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="mb-1 font-bold text-slate-300">Compensation</p>
              <p className="text-slate-400">Resp Acidosis → kidneys <span className="text-amber-400">retain HCO₃</span> (HCO₃ rises)</p>
              <p className="text-slate-400">Resp Alkalosis → kidneys <span className="text-orange-400">dump HCO₃</span> (HCO₃ falls)</p>
              <p className="text-slate-400">Met Acidosis → lungs <span className="text-blue-400">blow off CO₂</span> (CO₂ falls)</p>
              <p className="text-slate-400">Met Alkalosis → lungs <span className="text-amber-400">hold CO₂</span> (CO₂ rises)</p>
            </div>
          </div>
        )}

        {/* Difficulty selector */}
        <div className="mb-4 flex gap-2">
          {(["easy", "mixed", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => changeDifficulty(d)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold capitalize transition ${
                difficulty === d
                  ? d === "easy" ? "bg-emerald-600 text-white"
                  : d === "mixed" ? "bg-blue-600 text-white"
                  : "bg-red-600 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {d === "easy" ? "Easy" : d === "mixed" ? "Mixed" : "Hard"}
            </button>
          ))}
        </div>

        {/* Idle / start state */}
        {phase === "idle" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <p className="mb-2 text-4xl">🫁</p>
            <h2 className="mb-2 text-lg font-black text-white">Ready to drill ABGs?</h2>
            <p className="mb-6 text-sm text-slate-400">
              Read the values. Identify the disorder. Get instant feedback with step-by-step reasoning. No time limits — just reps.
            </p>
            <button
              onClick={startSession}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Start Hot Lab
            </button>
            <button
              onClick={() => setShowReference((v) => !v)}
              className="mt-3 w-full rounded-xl border border-slate-700 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-700"
            >
              {showReference ? "Hide Quick Reference" : "View Quick Reference"}
            </button>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <div className="mb-3 flex justify-center">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-orange-500" />
            </div>
            <p className="text-sm text-slate-400">Loading next set of ABGs...</p>
          </div>
        )}

        {/* Error */}
        {fetchError && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 p-4 text-sm text-red-300">
            {fetchError}
            <button onClick={fetchBatch} className="ml-3 rounded-lg bg-red-800 px-3 py-1 text-xs font-semibold hover:bg-red-700">
              Retry
            </button>
          </div>
        )}

        {/* Question card */}
        {(phase === "question" || phase === "answered") && current && (
          <div className="space-y-4">
            {/* Clinical scenario */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Clinical Scenario</p>
              <p className="text-sm leading-6 text-slate-200">{current.scenario}</p>
            </div>

            {/* ABG values — dark monitor panel */}
            <div className="rounded-2xl border border-slate-600 bg-slate-950 p-5">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">Arterial Blood Gas Results</p>
              <div className="space-y-3">
                {(["pH", "PaCO2", "HCO3", "PaO2", "SaO2"] as const).map((key) => {
                  const val = current.values[key];
                  const [lo, hi] = NORMAL[key];
                  const color = valueColor(key, val);
                  const arrow = arrowIndicator(key, val);
                  const isAbnormal = getValueStatus(key, val) !== "normal";
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-16 text-xs font-bold text-slate-400">{DISPLAY_NAMES[key]}</span>
                      <span className={`w-20 text-xl font-black tabular-nums ${color}`}>
                        {val}{UNITS[key]}
                      </span>
                      <span className={`text-base font-bold ${isAbnormal ? color : "text-slate-600"}`}>{arrow}</span>
                      <span className="text-xs text-slate-600">
                        {lo}–{hi}{UNITS[key]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Answer choices */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What is your interpretation?</p>
              {current.choices.map((choice) => {
                let btnClass = "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700";
                if (selected !== null) {
                  if (choice === current.correctAnswer) {
                    btnClass = "border border-emerald-500 bg-emerald-900/40 text-emerald-300 font-bold";
                  } else if (choice === selected) {
                    btnClass = "border border-red-500 bg-red-900/40 text-red-300 line-through";
                  } else {
                    btnClass = "border border-slate-800 bg-slate-900 text-slate-600";
                  }
                }
                return (
                  <button
                    key={choice}
                    onClick={() => selectAnswer(choice)}
                    disabled={selected !== null}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${btnClass}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {/* Feedback panel */}
            {phase === "answered" && (
              <div className={`rounded-2xl border p-5 ${isCorrect ? "border-emerald-700 bg-emerald-900/30" : "border-red-700 bg-red-900/20"}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">{isCorrect ? "✅" : "❌"}</span>
                  <p className={`font-black ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {isCorrect ? "Correct!" : `Wrong — ${current.correctAnswer}`}
                  </p>
                </div>
                <p className="mb-3 text-sm leading-6 text-slate-300">{current.explanation}</p>
                <div className="rounded-xl border border-blue-800 bg-blue-900/30 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-400">Clinical Pearl</p>
                  <p className="text-xs leading-5 text-blue-200">{current.clinicalPearl}</p>
                </div>
              </div>
            )}

            {/* Next button */}
            {phase === "answered" && (
              <button
                onClick={nextQuestion}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-[0.98]"
              >
                Next ABG →
              </button>
            )}
          </div>
        )}

        {/* Session controls when active */}
        {(phase === "question" || phase === "answered") && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={startSession}
              className="text-xs text-slate-600 transition hover:text-slate-400"
            >
              Reset session
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
