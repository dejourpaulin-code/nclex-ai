"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";

type Difficulty = "easy" | "mixed" | "hard";
type Phase = "idle" | "loading" | "active" | "submitted" | "error";

type ShiftPatient = {
  id: string;
  room: string;
  name: string;
  age: number;
  sex: string;
  diagnosis: string;
  report: string;
  acuityLevel: "CRITICAL" | "HIGH" | "MODERATE" | "STABLE";
  acuityReason: string;
};

type PriorityQuestion = {
  questionType: "priority_order";
  question: string;
  correctOrder: string[];
  explanation: string;
};

type LpnQuestion = {
  questionType: "lpn_delegation";
  question: string;
  correctAnswer: string;
  explanation: string;
};

type CnaQuestion = {
  questionType: "cna_task";
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
};

type ShiftScenario = {
  shiftContext: string;
  patients: ShiftPatient[];
  questions: [PriorityQuestion, LpnQuestion, CnaQuestion];
};

const ACUITY_STYLES: Record<string, string> = {
  CRITICAL: "border-red-600 bg-red-900/30 text-red-300",
  HIGH: "border-orange-600 bg-orange-900/30 text-orange-300",
  MODERATE: "border-amber-600 bg-amber-900/30 text-amber-300",
  STABLE: "border-emerald-700 bg-emerald-900/20 text-emerald-400",
};

export default function ShiftPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [phase, setPhase] = useState<Phase>("idle");
  const [scenario, setScenario] = useState<ShiftScenario | null>(null);
  const [priorityRanks, setPriorityRanks] = useState<Record<string, number>>({});
  const [lpnChoice, setLpnChoice] = useState<string>("");
  const [cnaChoice, setCnaChoice] = useState<string>("");
  const [showExplanations, setShowExplanations] = useState(false);
  const [error, setError] = useState("");

  async function loadScenario() {
    setError("");
    setPhase("loading");
    setPriorityRanks({});
    setLpnChoice("");
    setCnaChoice("");
    setShowExplanations(false);
    try {
      const res = await fetch("/api/shift/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setScenario(data);
      setPhase("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scenario.");
      setPhase("error");
    }
  }

  function setRank(patientId: string, rank: number) {
    setPriorityRanks((prev) => {
      const updated = { ...prev };
      // Remove old assignment for this rank
      Object.keys(updated).forEach((k) => {
        if (updated[k] === rank) delete updated[k];
      });
      updated[patientId] = rank;
      return updated;
    });
  }

  function submitAll() {
    if (!scenario) return;
    const rankCount = Object.keys(priorityRanks).length;
    if (rankCount < 4) { setError("Please rank all 4 patients before submitting."); return; }
    if (!lpnChoice) { setError("Please select a patient to delegate to the LPN."); return; }
    if (!cnaChoice) { setError("Please select a CNA task before submitting."); return; }
    setError("");
    setPhase("submitted");
    setShowExplanations(true);
  }

  const patients = scenario?.patients ?? [];
  const q = scenario?.questions;
  const priorityQ = q?.[0];
  const lpnQ = q?.[1];
  const cnaQ = q?.[2];

  // Scoring for submitted phase
  let score = 0;
  if (phase === "submitted" && scenario) {
    const correctOrder = priorityQ?.correctOrder ?? [];
    const myOrder = [1, 2, 3, 4].map((rank) => Object.keys(priorityRanks).find((k) => priorityRanks[k] === rank) ?? "");
    const exactMatch = JSON.stringify(myOrder) === JSON.stringify(correctOrder);
    const firstCorrect = myOrder[0] === correctOrder[0];
    if (exactMatch) score += 50;
    else if (firstCorrect) score += 20;
    else if (myOrder[0] === correctOrder[0] || myOrder[1] === correctOrder[0]) score += 10;
    if (lpnChoice === lpnQ?.correctAnswer) score += 25;
    if (cnaChoice === cnaQ?.correctAnswer) score += 25;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700 bg-slate-900">
        <Navbar />
      </div>

      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-700 bg-red-900/40 px-3 py-0.5 text-xs font-medium text-red-300">
            Shift Survival Mode
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Shift Survival Mode</h1>
          <p className="mt-1 text-sm text-slate-400">
            You have four patients. Prioritize who to see first, decide who to delegate to the LPN, and identify which task belongs to the CNA.
          </p>
        </div>

        {/* Difficulty */}
        <div className="mb-4 flex gap-2">
          {(["easy", "mixed", "hard"] as Difficulty[]).map((d) => (
            <button key={d} onClick={() => setDifficulty(d)} disabled={phase === "loading"}
              className={`flex-1 rounded-xl py-2 text-xs font-bold capitalize transition ${
                difficulty === d
                  ? d === "easy" ? "bg-emerald-600 text-white" : d === "mixed" ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                  : "border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}>
              {d}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>}

        {/* Idle */}
        {phase === "idle" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <p className="mb-2 text-4xl">🏥</p>
            <h2 className="mb-2 text-lg font-black">Start of shift</h2>
            <p className="mb-6 text-sm text-slate-400">
              You'll receive handoff for 4 patients. Rank them by priority, make delegation decisions, and show you know who needs you first.
            </p>
            <button onClick={loadScenario} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              Begin Shift
            </button>
          </div>
        )}

        {phase === "loading" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-orange-500" />
            <p className="mt-3 text-sm text-slate-400">Loading your patient assignments...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-2xl border border-red-800 bg-red-900/30 p-6 text-center">
            <p className="mb-3 text-sm text-red-300">{error}</p>
            <button onClick={loadScenario} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600">Try Again</button>
          </div>
        )}

        {(phase === "active" || phase === "submitted") && scenario && (
          <div className="space-y-5">
            {/* Shift context */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3">
              <p className="text-xs text-slate-400">{scenario.shiftContext}</p>
            </div>

            {/* Score */}
            {phase === "submitted" && (
              <div className={`rounded-2xl border p-4 text-center ${score >= 75 ? "border-emerald-700 bg-emerald-900/20" : score >= 50 ? "border-amber-700 bg-amber-900/20" : "border-red-700 bg-red-900/20"}`}>
                <p className={`text-3xl font-black ${score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {score}/100
                </p>
                <p className={`text-sm font-semibold ${score >= 75 ? "text-emerald-300" : score >= 50 ? "text-amber-300" : "text-red-300"}`}>
                  {score >= 90 ? "Excellent clinical judgment" : score >= 75 ? "Good prioritization" : score >= 50 ? "Review delegation principles" : "Study NCLEX prioritization frameworks"}
                </p>
              </div>
            )}

            {/* Patient cards */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Your 4 Patients</p>
              <div className="space-y-3">
                {patients.map((pat) => (
                  <div key={pat.id} className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-white">Room {pat.room} — {pat.name}, {pat.age} y/o {pat.sex}</p>
                        <p className="text-xs text-slate-400">{pat.diagnosis}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ACUITY_STYLES[pat.acuityLevel]}`}>
                        {pat.acuityLevel}
                      </span>
                    </div>
                    <p className="mb-2 text-xs leading-5 text-slate-300">{pat.report}</p>

                    {/* Rank selector */}
                    {phase === "active" && (
                      <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Priority rank</p>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((rank) => (
                            <button key={rank} onClick={() => setRank(pat.id, rank)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition ${
                                priorityRanks[pat.id] === rank
                                  ? rank === 1 ? "border-red-500 bg-red-600 text-white"
                                  : rank === 2 ? "border-orange-500 bg-orange-600 text-white"
                                  : rank === 3 ? "border-amber-500 bg-amber-600 text-white"
                                  : "border-slate-500 bg-slate-600 text-white"
                                  : "border-slate-700 bg-slate-900 text-slate-500 hover:bg-slate-700"
                              }`}>
                              {rank}
                            </button>
                          ))}
                          {priorityRanks[pat.id] && (
                            <span className="ml-1 self-center text-[10px] text-slate-500">
                              {priorityRanks[pat.id] === 1 ? "See FIRST" : priorityRanks[pat.id] === 4 ? "See LAST" : `See ${priorityRanks[pat.id]}${priorityRanks[pat.id] === 2 ? "nd" : "rd"}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submitted rank */}
                    {phase === "submitted" && priorityQ && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Your rank: <span className="font-bold text-white">{priorityRanks[pat.id]}</span></span>
                        {priorityQ.correctOrder[priorityRanks[pat.id] - 1] === pat.id
                          ? <span className="text-xs text-emerald-400">✓ correct position</span>
                          : <span className="text-xs text-red-400">✗ should be #{priorityQ.correctOrder.indexOf(pat.id) + 1}</span>
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Priority explanation */}
            {phase === "submitted" && priorityQ && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Priority Order Reasoning</p>
                <p className="mb-2 text-xs font-semibold text-slate-300">
                  Correct order: {priorityQ.correctOrder.map((id) => {
                    const pt = patients.find((p) => p.id === id);
                    return pt ? `${id} (${pt.name})` : id;
                  }).join(" → ")}
                </p>
                <p className="text-sm leading-6 text-slate-300">{priorityQ.explanation}</p>
              </div>
            )}

            {/* LPN Delegation */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">LPN Delegation</p>
              <p className="mb-3 text-sm font-semibold text-white">{lpnQ?.question}</p>
              <div className="space-y-2">
                {patients.map((pat) => {
                  const selected = lpnChoice === pat.id;
                  const isCorrect = phase === "submitted" && pat.id === lpnQ?.correctAnswer;
                  const isWrong = phase === "submitted" && selected && !isCorrect;
                  return (
                    <button key={pat.id} onClick={() => phase === "active" && setLpnChoice(pat.id)} disabled={phase === "submitted"}
                      className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                        isCorrect ? "border-emerald-500 bg-emerald-900/40 text-emerald-300 font-bold"
                        : isWrong ? "border-red-500 bg-red-900/40 text-red-300 line-through"
                        : selected ? "border-blue-500 bg-blue-900/40 text-blue-300"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-700"
                      }`}>
                      Room {pat.room} — {pat.name} ({pat.diagnosis})
                    </button>
                  );
                })}
              </div>
              {phase === "submitted" && lpnQ && (
                <div className="mt-3">
                  <p className={`mb-1 text-xs font-bold ${lpnChoice === lpnQ.correctAnswer ? "text-emerald-400" : "text-red-400"}`}>
                    {lpnChoice === lpnQ.correctAnswer ? "✅ Correct" : "❌ Incorrect"}
                  </p>
                  <p className="text-xs leading-5 text-slate-300">{lpnQ.explanation}</p>
                </div>
              )}
            </div>

            {/* CNA Task */}
            {cnaQ && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">CNA Delegation</p>
                <p className="mb-3 text-sm font-semibold text-white">{cnaQ.question}</p>
                <div className="space-y-2">
                  {cnaQ.choices.map((choice) => {
                    const selected = cnaChoice === choice;
                    const isCorrect = phase === "submitted" && choice === cnaQ.correctAnswer;
                    const isWrong = phase === "submitted" && selected && !isCorrect;
                    return (
                      <button key={choice} onClick={() => phase === "active" && setCnaChoice(choice)} disabled={phase === "submitted"}
                        className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                          isCorrect ? "border-emerald-500 bg-emerald-900/40 text-emerald-300 font-bold"
                          : isWrong ? "border-red-500 bg-red-900/40 text-red-300 line-through"
                          : selected ? "border-amber-500 bg-amber-900/40 text-amber-300"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-700"
                        }`}>
                        {choice}
                      </button>
                    );
                  })}
                </div>
                {phase === "submitted" && (
                  <div className="mt-3">
                    <p className={`mb-1 text-xs font-bold ${cnaChoice === cnaQ.correctAnswer ? "text-emerald-400" : "text-red-400"}`}>
                      {cnaChoice === cnaQ.correctAnswer ? "✅ Correct" : "❌ Incorrect"}
                    </p>
                    <p className="text-xs leading-5 text-slate-300">{cnaQ.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Submit / Next */}
            {phase === "active" && (
              <button onClick={submitAll}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
                Submit Shift Decisions
              </button>
            )}

            {phase === "submitted" && (
              <button onClick={loadScenario}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
                New Shift →
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
