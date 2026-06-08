"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../../components/Navbar";

type Difficulty = "easy" | "mixed" | "hard";

type Question = {
  question: string;
  questionType: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  clinicalTip: string;
};

type CaseStudy = {
  scenario: string;
  questions: Question[];
};

type Phase = "idle" | "loading" | "active" | "answered" | "case_complete" | "error";

const Q_TYPE_LABELS: Record<string, string> = {
  priority_assessment: "Priority Assessment",
  priority_action: "Priority Action",
  patient_education: "Patient Education",
  physician_notification: "Notify Physician",
  complication_watch: "Watch For",
};

const Q_TYPE_ICONS: Record<string, string> = {
  priority_assessment: "🔍",
  priority_action: "⚡",
  patient_education: "📚",
  physician_notification: "📞",
  complication_watch: "⚠️",
};

export default function ClinicalQuestionsPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState<CaseStudy | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [stats, setStats] = useState({ streak: 0, bestStreak: 0, total: 0, correct: 0 });
  const [nextCase, setNextCase] = useState<CaseStudy | null>(null);
  const [fetchingNext, setFetchingNext] = useState(false);
  const [error, setError] = useState("");
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const fetchCase = useCallback(async (): Promise<CaseStudy | null> => {
    try {
      const res = await fetch("/api/clinical-questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: difficultyRef.current }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      return data as CaseStudy;
    } catch {
      return null;
    }
  }, []);

  const prefetchNext = useCallback(async () => {
    if (fetchingNext) return;
    setFetchingNext(true);
    const c = await fetchCase();
    setNextCase(c);
    setFetchingNext(false);
  }, [fetchingNext, fetchCase]);

  async function startSession() {
    setStats({ streak: 0, bestStreak: 0, total: 0, correct: 0 });
    setNextCase(null);
    setError("");
    setPhase("loading");
    const c = await fetchCase();
    if (!c) { setError("Failed to load case. Please try again."); setPhase("error"); return; }
    setCurrent(c);
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
    if (next >= current.questions.length) { setPhase("case_complete"); return; }
    setQIndex(next);
    setSelected(null);
    setPhase("active");
  }

  async function nextCase_() {
    setQIndex(0);
    setSelected(null);
    if (nextCase) {
      setCurrent(nextCase);
      setNextCase(null);
      setPhase("active");
      prefetchNext();
    } else {
      setPhase("loading");
      const c = await fetchCase();
      if (!c) { setError("Failed to load next case."); setPhase("error"); return; }
      setCurrent(c);
      setPhase("active");
      prefetchNext();
    }
  }

  useEffect(() => {
    if (phase === "active" && !fetchingNext && !nextCase) prefetchNext();
  }, [phase, fetchingNext, nextCase, prefetchNext]);

  const q = current?.questions[qIndex];
  const isCorrect = selected !== null && q !== null && selected === q?.correctAnswer;
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700 bg-slate-900">
        <Navbar />
      </div>

      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-700 bg-violet-900/40 px-3 py-0.5 text-xs font-medium text-violet-300">
            Clinical Question Generator
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Clinical Question Generator</h1>
          <p className="mt-1 text-sm text-slate-400">
            One patient case, five clinical thinking questions. Lexi asks what you would assess, prioritize, teach, report, and anticipate.
          </p>
        </div>

        {/* Stats */}
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
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
              <p className="text-lg font-black text-white">{stats.total}</p>
            </div>
          </div>
        )}

        {/* Difficulty */}
        <div className="mb-4 flex gap-2">
          {(["easy", "mixed", "hard"] as Difficulty[]).map((d) => (
            <button key={d} onClick={() => { setDifficulty(d); setNextCase(null); }}
              className={`flex-1 rounded-xl py-2 text-xs font-bold capitalize transition ${
                difficulty === d
                  ? d === "easy" ? "bg-emerald-600 text-white" : d === "mixed" ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}>
              {d}
            </button>
          ))}
        </div>

        {/* Idle */}
        {phase === "idle" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <p className="mb-2 text-4xl">💡</p>
            <h2 className="mb-2 text-lg font-black">Think like a nurse</h2>
            <p className="mb-6 text-sm text-slate-400">
              Each case gives you a rich patient scenario and 5 questions: priority assessment, priority action, patient teaching, MD notification, and complication monitoring.
            </p>
            <button onClick={startSession} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              Start Case
            </button>
          </div>
        )}

        {phase === "loading" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-orange-500" />
            <p className="mt-3 text-sm text-slate-400">Building your patient case...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-2xl border border-red-800 bg-red-900/30 p-6 text-center">
            <p className="mb-3 text-sm text-red-300">{error}</p>
            <button onClick={startSession} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600">Try Again</button>
          </div>
        )}

        {(phase === "active" || phase === "answered") && current && q && (
          <div className="space-y-4">
            {/* Scenario */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Patient Case</p>
              <p className="text-sm leading-6 text-slate-200">{current.scenario}</p>
            </div>

            {/* Q header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400">Question {qIndex + 1} of {current.questions.length}</p>
              <span className="flex items-center gap-1 rounded-full border border-violet-700 bg-violet-900/30 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                {Q_TYPE_ICONS[q.questionType]} {Q_TYPE_LABELS[q.questionType] ?? q.questionType}
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
                  <button key={choice} onClick={() => selectAnswer(choice)} disabled={selected !== null}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${cls}`}>
                    {choice}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {phase === "answered" && (
              <div className={`rounded-2xl border p-5 ${isCorrect ? "border-emerald-700 bg-emerald-900/30" : "border-red-700 bg-red-900/20"}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">{isCorrect ? "✅" : "❌"}</span>
                  <p className={`font-black ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {isCorrect ? "Correct!" : `Correct answer: ${q.correctAnswer}`}
                  </p>
                </div>
                <p className="mb-3 text-sm leading-6 text-slate-300">{q.explanation}</p>
                <div className="rounded-xl border border-violet-800 bg-violet-900/30 p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-violet-400">Clinical Tip</p>
                  <p className="text-xs leading-5 text-violet-200">{q.clinicalTip}</p>
                </div>
              </div>
            )}

            {phase === "answered" && (
              <button onClick={nextQuestion}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
                {qIndex + 1 < current.questions.length ? "Next Question →" : "See Results →"}
              </button>
            )}
          </div>
        )}

        {/* Case complete */}
        {phase === "case_complete" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-violet-700 bg-violet-900/20 p-6 text-center">
              <p className="mb-1 text-3xl">🎓</p>
              <p className="mb-1 text-lg font-black text-violet-300">Case Complete</p>
              <p className="text-sm text-slate-400">{accuracy}% accuracy · {stats.streak} question streak</p>
            </div>
            <button onClick={nextCase_}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              {fetchingNext ? "Loading next case..." : "Next Case →"}
            </button>
          </div>
        )}

        {stats.total > 0 && (phase === "active" || phase === "answered" || phase === "case_complete") && (
          <div className="mt-4 flex justify-center">
            <button onClick={startSession} className="text-xs text-slate-600 transition hover:text-slate-400">Reset session</button>
          </div>
        )}
      </section>
    </main>
  );
}
