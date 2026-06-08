"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";

type Difficulty = "easy" | "mixed" | "hard";
type NoteType = "DAR" | "SOAP" | "narrative" | "SBAR";
type Step = "setup" | "loading_scenario" | "write" | "grading" | "results";

type PatientContext = {
  name: string;
  age: number;
  sex: string;
  room: string;
  diagnosis: string;
  allergies: string;
  vitals: Record<string, string>;
  currentMeds: string[];
  assessment: string;
  interventions: string;
  patientResponse: string;
};

type ScenarioData = {
  patientContext: PatientContext;
  documentationContext: string;
  keyDocumentationPoints: string[];
};

type RubricItem = { score: number; feedback: string };

type GradeResult = {
  overallScore: number;
  overallGrade: string;
  summary: string;
  rubric: {
    clarity: RubricItem;
    objectivity: RubricItem;
    completeness: RubricItem;
    organization: RubricItem;
    legalSafety: RubricItem;
  };
  strengths: string[];
  improvements: string[];
  missedItems: string[];
  sampleNote: string;
};

const NOTE_TYPES: { value: NoteType; label: string; desc: string }[] = [
  { value: "DAR", label: "DAR", desc: "Data · Action · Response" },
  { value: "SOAP", label: "SOAP", desc: "Subjective · Objective · Assessment · Plan" },
  { value: "narrative", label: "Narrative", desc: "Chronological story note" },
  { value: "SBAR", label: "SBAR", desc: "Situation · Background · Assessment · Recommendation" },
];

function gradeColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 80) return "text-green-400";
  if (score >= 70) return "text-amber-400";
  if (score >= 60) return "text-orange-400";
  return "text-red-400";
}

function scoreBarColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.9) return "bg-emerald-500";
  if (pct >= 0.75) return "bg-green-500";
  if (pct >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

export default function ChartingPage() {
  const [step, setStep] = useState<Step>("setup");
  const [noteType, setNoteType] = useState<NoteType>("DAR");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [note, setNote] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [error, setError] = useState("");

  async function generateScenario() {
    setError("");
    setStep("loading_scenario");
    try {
      const res = await fetch("/api/charting/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType, difficulty }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setScenario(data);
      setNote("");
      setGrade(null);
      setShowSample(false);
      setStep("write");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scenario.");
      setStep("setup");
    }
  }

  async function submitNote() {
    if (!scenario || note.trim().length < 20) { setError("Please write a more complete note before submitting."); return; }
    setError("");
    setStep("grading");
    try {
      const res = await fetch("/api/charting/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteType,
          patientContext: scenario.patientContext,
          documentationContext: scenario.documentationContext,
          keyDocumentationPoints: scenario.keyDocumentationPoints,
          studentNote: note,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed");
      setGrade(data);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grade note.");
      setStep("write");
    }
  }

  function tryAnother() {
    setStep("setup");
    setScenario(null);
    setNote("");
    setGrade(null);
    setShowSample(false);
    setError("");
  }

  const p = scenario?.patientContext;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-slate-700 bg-slate-900">
        <Navbar />
      </div>

      <section className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-700 bg-teal-900/40 px-3 py-0.5 text-xs font-medium text-teal-300">
            Charting Coach
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Charting Coach</h1>
          <p className="mt-1 text-sm text-slate-400">
            Get a patient scenario, write your nurse note, and receive detailed feedback on clarity, completeness, objectivity, and legal safety.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</div>
        )}

        {/* Setup */}
        {step === "setup" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-3 text-sm font-bold text-slate-300">Select note format</p>
              <div className="grid grid-cols-2 gap-2">
                {NOTE_TYPES.map((n) => (
                  <button key={n.value} onClick={() => setNoteType(n.value)}
                    className={`rounded-xl border p-3 text-left transition ${noteType === n.value ? "border-teal-500 bg-teal-900/40" : "border-slate-700 bg-slate-900 hover:bg-slate-700"}`}>
                    <p className="font-bold text-white">{n.label}</p>
                    <p className="text-xs text-slate-400">{n.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-3 text-sm font-bold text-slate-300">Difficulty</p>
              <div className="flex gap-2">
                {(["easy", "mixed", "hard"] as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold capitalize transition ${
                      difficulty === d
                        ? d === "easy" ? "bg-emerald-600 text-white" : d === "mixed" ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                        : "border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-700"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateScenario}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              Generate Scenario
            </button>
          </div>
        )}

        {/* Loading */}
        {step === "loading_scenario" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-orange-500" />
            <p className="mt-3 text-sm text-slate-400">Building your documentation scenario...</p>
          </div>
        )}

        {step === "grading" && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-teal-500" />
            <p className="mt-3 text-sm text-slate-400">Lexi is reviewing your note...</p>
          </div>
        )}

        {/* Write */}
        {step === "write" && scenario && p && (
          <div className="space-y-4">
            {/* Patient context */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-white">{p.name}, {p.age} y/o {p.sex} — Room {p.room}</p>
                  <p className="text-sm text-slate-400">{p.diagnosis}</p>
                </div>
                <span className="shrink-0 rounded-full border border-teal-700 bg-teal-900/30 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                  {noteType}
                </span>
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
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Allergies</p>
                <p className="text-xs text-slate-300">{p.allergies}</p>
              </div>

              <div className="mb-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Current Medications</p>
                <p className="text-xs text-slate-300">{p.currentMeds.join(", ")}</p>
              </div>

              <div className="mb-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Assessment Findings</p>
                <p className="text-xs leading-5 text-slate-300">{p.assessment}</p>
              </div>

              <div className="mb-2">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Interventions This Shift</p>
                <p className="text-xs leading-5 text-slate-300">{p.interventions}</p>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Patient Response</p>
                <p className="text-xs leading-5 text-slate-300">{p.patientResponse}</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-800 bg-amber-900/20 px-4 py-2">
              <p className="text-xs text-amber-300">
                <span className="font-bold">Documentation context:</span> {scenario.documentationContext}
              </p>
            </div>

            {/* Text area */}
            <div>
              <p className="mb-2 text-sm font-bold text-slate-300">Write your {noteType} note</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`Write your complete ${noteType} note here based on the scenario above...`}
                rows={12}
                className="w-full rounded-2xl border border-slate-600 bg-slate-900 p-4 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-teal-500 resize-y"
              />
              <p className="mt-1 text-right text-xs text-slate-600">{note.length} characters</p>
            </div>

            <div className="flex gap-3">
              <button onClick={tryAnother} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-700">
                New Scenario
              </button>
              <button onClick={submitNote} disabled={note.trim().length < 20}
                className="flex-[2] rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-40">
                Submit for Grading →
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {step === "results" && grade && scenario && p && (
          <div className="space-y-4">
            {/* Score header */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{noteType} Note · {scenario.documentationContext}</p>
              <p className={`mb-1 text-5xl font-black ${gradeColor(grade.overallScore)}`}>{grade.overallGrade}</p>
              <p className={`text-lg font-bold ${gradeColor(grade.overallScore)}`}>{grade.overallScore}/100</p>
              <p className="mt-2 text-sm text-slate-400">{grade.summary}</p>
            </div>

            {/* Rubric */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">Grading Rubric</p>
              <div className="space-y-4">
                {([
                  { key: "clarity", label: "Clarity", max: 20 },
                  { key: "objectivity", label: "Objectivity", max: 20 },
                  { key: "completeness", label: "Completeness", max: 25 },
                  { key: "organization", label: "Organization", max: 20 },
                  { key: "legalSafety", label: "Legal Safety", max: 15 },
                ] as { key: keyof typeof grade.rubric; label: string; max: number }[]).map(({ key, label, max }) => {
                  const item = grade.rubric[key];
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-300">{label}</p>
                        <p className={`text-xs font-bold ${gradeColor((item.score / max) * 100)}`}>
                          {item.score}/{max}
                        </p>
                      </div>
                      <div className="mb-1.5 h-1.5 w-full rounded-full bg-slate-700">
                        <div className={`h-1.5 rounded-full transition-all ${scoreBarColor(item.score, max)}`} style={{ width: `${(item.score / max) * 100}%` }} />
                      </div>
                      <p className="text-xs leading-5 text-slate-400">{item.feedback}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths */}
            {grade.strengths.length > 0 && (
              <div className="rounded-2xl border border-emerald-800 bg-emerald-900/20 p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-400">Strengths</p>
                <ul className="space-y-1">
                  {grade.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-200">
                      <span className="mt-0.5 text-emerald-400">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {grade.improvements.length > 0 && (
              <div className="rounded-2xl border border-amber-800 bg-amber-900/20 p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-400">To Improve</p>
                <ul className="space-y-1">
                  {grade.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-200">
                      <span className="mt-0.5 text-amber-400">→</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missed items */}
            {grade.missedItems.length > 0 && (
              <div className="rounded-2xl border border-red-800 bg-red-900/20 p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-red-400">Missing from Your Note</p>
                <ul className="space-y-1">
                  {grade.missedItems.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-200">
                      <span className="mt-0.5 text-red-400">✗</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample note toggle */}
            <button onClick={() => setShowSample((v) => !v)}
              className="w-full rounded-xl border border-slate-600 bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700">
              {showSample ? "Hide" : "Show"} Model Note
            </button>

            {showSample && (
              <div className="rounded-2xl border border-teal-800 bg-teal-900/20 p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-teal-400">Model {noteType} Note</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-teal-100">{grade.sampleNote}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setStep("write"); setGrade(null); setShowSample(false); }}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-700">
                Revise Note
              </button>
              <button onClick={tryAnother}
                className="flex-[2] rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600">
                New Scenario →
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
