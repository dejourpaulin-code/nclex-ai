"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";

type Difficulty = "easy" | "mixed" | "hard";
type MedDecision = "GIVE" | "HOLD" | "ASSESS FIRST" | "NOTIFY MD";

type Medication = {
  name: string;
  scheduledTime: string;
  indication: string;
  correctDecision: MedDecision;
  holdParameter: string | null;
  reason: string;
  adverseEffect: string;
  patientEducation: string;
};

type Patient = {
  name: string;
  age: number;
  sex: string;
  room: string;
  diagnosis: string;
  allergies: string;
  vitals: Record<string, string>;
  relevantLabs: string;
  clinicalNotes: string;
};

type MedPassScenario = {
  patient: Patient;
  medications: Medication[];
  clinicalContext: string;
};

type Phase = "idle" | "loading" | "active" | "submitted" | "error";

const DECISION_OPTIONS: MedDecision[] = ["GIVE", "HOLD", "ASSESS FIRST", "NOTIFY MD"];

const DECISION_COLORS: Record<MedDecision, string> = {
  GIVE: "border-emerald-600 bg-emerald-900/40 text-emerald-300",
  HOLD: "border-red-600 bg-red-900/40 text-red-300",
  "ASSESS FIRST": "border-amber-600 bg-amber-900/40 text-amber-300",
  "NOTIFY MD": "border-blue-600 bg-blue-900/40 text-blue-300",
};

const DECISION_IDLE: Record<MedDecision, string> = {
  GIVE: "border-emerald-800/60 bg-emerald-900/10 text-emerald-600 hover:bg-emerald-900/30",
  HOLD: "border-red-800/60 bg-red-900/10 text-red-600 hover:bg-red-900/30",
  "ASSESS FIRST": "border-amber-800/60 bg-amber-900/10 text-amber-600 hover:bg-amber-900/30",
  "NOTIFY MD": "border-blue-800/60 bg-blue-900/10 text-blue-600 hover:bg-blue-900/30",
};

export default function MedPassPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [phase, setPhase] = useState<Phase>("idle");
  const [scenario, setScenario] = useState<MedPassScenario | null>(null);
  const [decisions, setDecisions] = useState<Record<number, MedDecision>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState("");

  async function loadScenario() {
    setError("");
    setPhase("loading");
    setDecisions({});
    setShowFeedback(false);
    try {
      const res = await fetch("/api/medpass/generate", {
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

  function setDecision(i: number, d: MedDecision) {
    setDecisions((prev) => ({ ...prev, [i]: d }));
  }

  function submitAll() {
    if (!scenario) return;
    const answered = Object.keys(decisions).length;
    if (answered < scenario.medications.length) {
      setError(`Please make a decision for all ${scenario.medications.length} medications.`);
      return;
    }
    setError("");
    setShowFeedback(true);
    setPhase("submitted");
  }

  const p = scenario?.patient;
  const meds = scenario?.medications ?? [];
  const answeredCount = Object.keys(decisions).length;
  const totalCount = meds.length;

  const correctCount = phase === "submitted"
    ? meds.filter((m, i) => decisions[i] === m.correctDecision).length
    : 0;
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700 bg-slate-900">
        <Navbar />
      </div>

      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/40 px-3 py-0.5 text-xs font-medium text-emerald-300">
            Med Pass Simulation
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Med Pass Simulation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Review the patient and their scheduled medications. Decide: Give, Hold, Assess First, or Notify MD — then see how you did.
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

        {error && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>
        )}

        {/* Idle */}
        {phase === "idle" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <p className="mb-2 text-4xl">💊</p>
            <h2 className="mb-2 text-lg font-black">Ready for med pass?</h2>
            <p className="mb-6 text-sm text-slate-400">
              You'll get a patient with scheduled medications. Review their vitals, labs, and allergies, then decide what to do with each med. One shot — just like the real thing.
            </p>
            <button onClick={loadScenario} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              Load Patient
            </button>
          </div>
        )}

        {phase === "loading" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-orange-500" />
            <p className="mt-3 text-sm text-slate-400">Preparing medication scenario...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-2xl border border-red-800 bg-red-900/30 p-6 text-center">
            <p className="mb-3 text-sm text-red-300">{error}</p>
            <button onClick={loadScenario} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600">Try Again</button>
          </div>
        )}

        {/* Active + Submitted */}
        {(phase === "active" || phase === "submitted") && scenario && p && (
          <div className="space-y-4">
            {/* Submitted score */}
            {phase === "submitted" && (
              <div className={`rounded-2xl border p-4 text-center ${score >= 80 ? "border-emerald-700 bg-emerald-900/20" : score >= 60 ? "border-amber-700 bg-amber-900/20" : "border-red-700 bg-red-900/20"}`}>
                <p className={`text-3xl font-black ${score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {correctCount}/{totalCount} correct
                </p>
                <p className={`text-sm font-semibold ${score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-red-300"}`}>
                  {score}% — {score >= 90 ? "Excellent!" : score >= 80 ? "Good job" : score >= 60 ? "Keep practicing" : "Review medication safety"}
                </p>
              </div>
            )}

            {/* Patient card */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <div className="mb-3">
                <p className="font-bold text-white">{p.name}, {p.age} y/o {p.sex} — Room {p.room}</p>
                <p className="text-sm text-slate-400">{p.diagnosis}</p>
                <p className="mt-1 text-xs text-slate-500">{scenario.clinicalContext}</p>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs">
                {Object.entries(p.vitals).map(([k, v]) => (
                  <div key={k}>
                    <p className="font-bold uppercase tracking-wide text-slate-500">{k}</p>
                    <p className="text-white">{v}</p>
                  </div>
                ))}
              </div>

              <div className="mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Allergies</p>
                <p className="text-xs text-red-300 font-semibold">{p.allergies}</p>
              </div>
              <div className="mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Relevant Labs</p>
                <p className="text-xs text-slate-300">{p.relevantLabs}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Clinical Notes</p>
                <p className="text-xs text-slate-300">{p.clinicalNotes}</p>
              </div>
            </div>

            {/* Med cards */}
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Scheduled Medications — {phase === "active" ? `${answeredCount}/${totalCount} decided` : "Results"}
            </p>

            {meds.map((med, i) => {
              const myDecision = decisions[i];
              const correct = phase === "submitted" ? myDecision === med.correctDecision : null;

              return (
                <div key={i} className={`rounded-2xl border p-5 transition ${
                  phase === "submitted"
                    ? correct ? "border-emerald-700 bg-emerald-900/10" : "border-red-700 bg-red-900/10"
                    : myDecision ? "border-slate-600 bg-slate-800" : "border-slate-700 bg-slate-800"
                }`}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">{med.name}</p>
                      <p className="text-xs text-slate-400">{med.scheduledTime} · {med.indication}</p>
                    </div>
                    {myDecision && (
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${DECISION_COLORS[myDecision]}`}>
                        {myDecision}
                      </span>
                    )}
                  </div>

                  {/* Decision buttons */}
                  {phase === "active" && (
                    <div className="grid grid-cols-2 gap-2">
                      {DECISION_OPTIONS.map((opt) => (
                        <button key={opt} onClick={() => setDecision(i, opt)}
                          className={`rounded-xl border py-2 text-xs font-bold transition ${
                            myDecision === opt ? DECISION_COLORS[opt] : DECISION_IDLE[opt]
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Feedback */}
                  {phase === "submitted" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span>{correct ? "✅" : "❌"}</span>
                        <p className={`text-xs font-bold ${correct ? "text-emerald-400" : "text-red-400"}`}>
                          {correct ? "Correct" : `Should be: ${med.correctDecision}`}
                          {med.holdParameter && ` — ${med.holdParameter}`}
                        </p>
                      </div>
                      <p className="text-xs leading-5 text-slate-300">{med.reason}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-red-900 bg-red-900/20 p-2">
                          <p className="mb-0.5 font-bold text-red-400">Watch for</p>
                          <p className="text-red-200">{med.adverseEffect}</p>
                        </div>
                        <div className="rounded-lg border border-blue-900 bg-blue-900/20 p-2">
                          <p className="mb-0.5 font-bold text-blue-400">Teach patient</p>
                          <p className="text-blue-200">{med.patientEducation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit / Next */}
            {phase === "active" && (
              <button onClick={submitAll}
                className={`w-full rounded-xl py-3 text-sm font-bold transition ${
                  answeredCount === totalCount
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "cursor-not-allowed bg-slate-700 text-slate-500"
                }`}>
                Submit Med Pass ({answeredCount}/{totalCount} answered)
              </button>
            )}

            {phase === "submitted" && (
              <button onClick={loadScenario}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
                New Patient →
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
