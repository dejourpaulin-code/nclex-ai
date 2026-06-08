"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../../components/Navbar";

type Difficulty = "easy" | "mixed" | "hard";

type Question = {
  question: string;
  questionType: string;
  framework: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

type Scenario = {
  scenario: string;
  questions: Question[];
};

type Phase = "idle" | "loading" | "active" | "answered" | "scenario_complete" | "error";

const FRAMEWORK_COLORS: Record<string, string> = {
  ABCs: "border-red-700 bg-red-900/30 text-red-300",
  Maslow: "border-purple-700 bg-purple-900/30 text-purple-300",
  Safety: "border-amber-700 bg-amber-900/30 text-amber-300",
  Delegation: "border-blue-700 bg-blue-900/30 text-blue-300",
  "Pattern Recognition": "border-emerald-700 bg-emerald-900/30 text-emerald-300",
};

const Q_TYPE_LABELS: Record<string, string> = {
  first_action: "First Action",
  concerning_finding: "Most Concerning",
  notify_md: "Notify Physician",
  delegate_or_wait: "Delegate / Wait",
};

export default function PriorityPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState<Scenario | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats] = useState({ streak: 0, bestStreak: 0, total: 0, correct: 0 });
  const [nextScenario, setNextScenario] = useState<Scenario | null>(null);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [error, setError] = useState("");
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const fetchScenario = useCallback(async (): Promise<Scenario | null> => {
    try {
      const res = await fetch("/api/priority/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: difficultyRef.current }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      return data as Scenario;
    } catch {
      return null;
    }
  }, []);

  const prefetchNext = useCallback(async () => {
    if (fetchingNext) return;
    setFetchingNext(true);
    const s = await fetchScenario();
    setNextScenario(s);
    setFetchingNext(false);
  }, [fetchingNext, fetchScenario]);

  async function startSession() {
    setStats({ streak: 0, bestStreak: 0, total: 0, correct: 0 });
    setNextScenario(null);
    setError("");
    setPhase("loading");
    const s = await fetchScenario();
    if (!s) {
      setError("Failed to load scenario. Please try again.");
      setPhase("error");
      return;
    }
    setCurrent(s);
    setQIndex(0);
    setSelected(null);
    setPhase("active");
    prefetchNext();
  }

  function selectAnswer(choice: string) {
    if (phase !== "active" || !current) return;
    const q = current.questions[qIndex];
    const correct = choice === q.correctAnswer;
    setSelected(choice);
    setStats((prev) => {
      const streak = correct ? prev.streak + 1 : 0;
      return { streak, bestStreak: Math.max(prev.bestStreak, streak), total: prev.total + 1, correct: prev.correct + (correct ? 1 : 0) };
    });
    setPhase("answered");
  }

  function nextQuestion() {
    if (!current) return;
    const next = qIndex + 1;
    if (next >= current.questions.length) {
      setPhase("scenario_complete");
    } else {
      setQIndex(next);
      setSelected(null);
      setPhase("active");
    }
  }

  async function nextPatient() {
    setQIndex(0);
    setSelected(null);
    if (nextScenario) {
      setCurrent(nextScenario);
      setNextScenario(null);
      setPhase("active");
      prefetchNext();
    } else {
      setPhase("loading");
      const s = await fetchScenario();
      if (!s) {
        setError("Failed to load next scenario.");
        setPhase("error");
        return;
      }
      setCurrent(s);
      setPhase("active");
      prefetchNext();
    }
  }

  useEffect(() => {
    if (phase === "active" && !fetchingNext && !nextScenario) {
      prefetchNext();
    }
  }, [phase, fetchingNext, nextScenario, prefetchNext]);

  const q = current?.questions[qIndex];
  const isCorrect = selected !== null && q !== null && selected === q?.correctAnswer;
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
  const frameworkStyle = q ? (FRAMEWORK_COLORS[q.framework] ?? "border-slate-700 bg-slate-800 text-slate-400") : "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700 bg-slate-900">
        <Navbar />
      </div>

      <section className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-orange-700 bg-orange-900/40 px-3 py-0.5 text-xs font-medium text-orange-300">
            Priority Judgment Trainer
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Priority Judgment Trainer</h1>
          <p className="mt-1 text-sm text-slate-400">
            Read the patient scenario, answer four NCLEX-style prioritization questions. Build the clinical reasoning muscle that NCLEX tests hardest.
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
          </div>
        )}

        {/* Difficulty */}
        <div className="mb-4 flex gap-2">
          {(["easy", "mixed", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); setNextScenario(null); }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold capitalize transition ${
                difficulty === d
                  ? d === "easy" ? "bg-emerald-600 text-white"
                  : d === "mixed" ? "bg-blue-600 text-white"
                  : "bg-red-600 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Idle */}
        {phase === "idle" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <p className="mb-2 text-4xl">🧠</p>
            <h2 className="mb-2 text-lg font-black">Ready to drill priorities?</h2>
            <p className="mb-6 text-sm text-slate-400">
              You'll get a patient scenario and 4 NCLEX-style prioritization questions — first action, most concerning finding, when to call the MD, and what can be delegated.
            </p>
            <button onClick={startSession} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              Start Drill
            </button>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <div className="mb-3 flex justify-center">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-orange-500" />
            </div>
            <p className="text-sm text-slate-400">Loading patient scenario...</p>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="rounded-2xl border border-red-800 bg-red-900/30 p-6 text-center">
            <p className="mb-3 text-sm text-red-300">{error}</p>
            <button onClick={startSession} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600">
              Try Again
            </button>
          </div>
        )}

        {/* Active + Answered */}
        {(phase === "active" || phase === "answered") && current && q && (
          <div className="space-y-4">
            {/* Scenario card */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Patient Scenario</p>
              <p className="text-sm leading-6 text-slate-200">{current.scenario}</p>
            </div>

            {/* Question progress + framework */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400">
                Question {qIndex + 1} of {current.questions.length}
                <span className="ml-2 text-slate-600">— {Q_TYPE_LABELS[q.questionType] ?? q.questionType}</span>
              </p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${frameworkStyle}`}>
                {q.framework}
              </span>
            </div>

            {/* Question */}
            <div className="rounded-2xl border border-slate-600 bg-slate-900 p-4">
              <p className="text-sm font-semibold leading-6 text-white">{q.question}</p>
            </div>

            {/* Choices */}
            <div className="space-y-2">
              {q.choices.map((choice) => {
                let cls = "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700";
                if (selected !== null) {
                  if (choice === q.correctAnswer) cls = "border border-emerald-500 bg-emerald-900/40 text-emerald-300 font-bold";
                  else if (choice === selected) cls = "border border-red-500 bg-red-900/40 text-red-300 line-through";
                  else cls = "border border-slate-800 bg-slate-900 text-slate-600";
                }
                return (
                  <button
                    key={choice}
                    onClick={() => selectAnswer(choice)}
                    disabled={selected !== null}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${cls}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {phase === "answered" && (
              <div className={`rounded-2xl border p-5 ${isCorrect ? "border-emerald-700 bg-emerald-900/30" : "border-red-700 bg-red-900/20"}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">{isCorrect ? "✅" : "❌"}</span>
                  <p className={`font-black ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {isCorrect ? "Correct!" : `The correct answer is: ${q.correctAnswer}`}
                  </p>
                </div>
                <p className="text-sm leading-6 text-slate-300">{q.explanation}</p>
              </div>
            )}

            {phase === "answered" && (
              <button
                onClick={nextQuestion}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                {qIndex + 1 < current.questions.length ? "Next Question →" : "See Results →"}
              </button>
            )}
          </div>
        )}

        {/* Scenario complete */}
        {phase === "scenario_complete" && current && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Patient Scenario</p>
              <p className="text-sm leading-6 text-slate-400">{current.scenario}</p>
            </div>
            <div className="rounded-2xl border border-emerald-700 bg-emerald-900/20 p-6 text-center">
              <p className="mb-1 text-3xl">🎯</p>
              <p className="mb-1 text-lg font-black text-emerald-400">Scenario Complete</p>
              <p className="text-sm text-slate-400">
                Overall: {accuracy}% accuracy · {stats.streak} question streak
              </p>
            </div>
            <button
              onClick={nextPatient}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              {fetchingNext ? "Loading next patient..." : "Next Patient →"}
            </button>
          </div>
        )}

        {stats.total > 0 && (phase === "active" || phase === "answered" || phase === "scenario_complete") && (
          <div className="mt-4 flex justify-center">
            <button onClick={startSession} className="text-xs text-slate-600 transition hover:text-slate-400">
              Reset session
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
