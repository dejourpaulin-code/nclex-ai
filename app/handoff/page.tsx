"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";

type Mode = "give" | "receive";
type Difficulty = "beginner" | "intermediate" | "advanced";

// Give Report types
type GiveScenario = {
  difficulty: string;
  setting: string;
  context: string;
  patient: {
    name: string;
    age: number;
    sex: string;
    room: string;
    code: string;
    allergies: string;
    admittingDiagnosis: string;
    daysInHospital: number;
  };
  vitals: {
    BP: string;
    HR: string;
    RR: string;
    SpO2: string;
    Temp: string;
    Pain: string;
  };
  currentMeds: string[];
  recentEvents: string;
  pendingItems: string[];
  criticalAlert: string;
  safetyNotes: string;
};

type GiveDimension = { score: number; max: number; feedback: string };

type GiveResult = {
  overallScore: number;
  grade: string;
  dimensions: {
    keyFacts: GiveDimension;
    organization: GiveDimension;
    safetyCritical: GiveDimension;
    conciseness: GiveDimension;
    clinicalUsability: GiveDimension;
  };
  criticalMisses: string[];
  strengths: string[];
  coachingNote: string;
  modelReportSnippet: string;
};

// Receive Report types
type ReceiveScenario = {
  difficulty: string;
  setting: string;
  context: string;
  patientSummary: string;
  reportText: string;
  answerKey: {
    criticalFindings: string[];
    shouldHavePrioritized: string[];
    essentialFollowUpQuestions: string[];
    unnecessaryInfo: string[];
  };
};

type ReceiveDimension = { score: number; max: number; feedback: string };

type ReceiveResult = {
  overallScore: number;
  grade: string;
  dimensions: {
    criticalCapture: ReceiveDimension;
    prioritization: ReceiveDimension;
    followUpQuestions: ReceiveDimension;
    signalToNoise: ReceiveDimension;
  };
  criticalMisses: string[];
  correctlyCaptured: string[];
  followUpQuestionsShouldHaveAsked: string[];
  coachingNote: string;
  modelPriorities: string[];
};

type AnyScenario = GiveScenario | ReceiveScenario;
type AnyResult = GiveResult | ReceiveResult;

function gradeColor(grade: string) {
  if (grade === "A") return "text-emerald-600";
  if (grade === "B") return "text-blue-600";
  if (grade === "C") return "text-amber-600";
  return "text-red-600";
}

function scoreBarColor(pct: number) {
  if (pct >= 0.8) return "bg-emerald-500";
  if (pct >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

function DimensionBar({
  label,
  score,
  max,
  feedback,
}: {
  label: string;
  score: number;
  max: number;
  feedback: string;
}) {
  const pct = max > 0 ? score / max : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <span>
          {score}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all ${scoreBarColor(pct)}`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
      <p className="text-xs leading-5 text-slate-500">{feedback}</p>
    </div>
  );
}

export default function HandoffPage() {
  const [mode, setMode] = useState<Mode>("give");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [scenario, setScenario] = useState<AnyScenario | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState("");
  const [response, setResponse] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<AnyResult | null>(null);
  const [gradeError, setGradeError] = useState("");
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  async function generateScenario() {
    setScenarioLoading(true);
    setScenarioError("");
    setScenario(null);
    setResult(null);
    setResponse("");
    setShowAnswerKey(false);
    try {
      const res = await fetch("/api/handoff/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScenarioError(data.error || "Failed to generate scenario.");
        return;
      }
      setScenario(data);
    } catch {
      setScenarioError("Failed to connect to server.");
    } finally {
      setScenarioLoading(false);
    }
  }

  async function submitResponse() {
    if (!response.trim() || !scenario) return;
    setGrading(true);
    setGradeError("");
    setResult(null);
    try {
      const res = await fetch("/api/handoff/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, scenario, studentResponse: response }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGradeError(data.error || "Failed to grade response.");
        return;
      }
      setResult(data);
    } catch {
      setGradeError("Failed to connect to server.");
    } finally {
      setGrading(false);
    }
  }

  const giveScenario = mode === "give" ? (scenario as GiveScenario | null) : null;
  const receiveScenario = mode === "receive" ? (scenario as ReceiveScenario | null) : null;
  const giveResult = mode === "give" && result ? (result as GiveResult) : null;
  const receiveResult = mode === "receive" && result ? (result as ReceiveResult) : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
            <span>Clinical Handoff Lab</span>
            <span className="rounded-full bg-blue-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
              PREMIUM
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Clinical Handoff Lab
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Practice the #1 highest-risk moment in nursing — the handoff. Give
            report or receive report. Lexi grades your clinical judgment.
          </p>
        </div>

        {/* Mode + Difficulty controls */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => {
                setMode("give");
                setScenario(null);
                setResult(null);
                setResponse("");
              }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "give"
                  ? "bg-blue-900 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Give Report
            </button>
            <button
              onClick={() => {
                setMode("receive");
                setScenario(null);
                setResult(null);
                setResponse("");
              }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "receive"
                  ? "bg-blue-900 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Receive Report
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            {(["beginner", "intermediate", "advanced"] as Difficulty[]).map(
              (d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-xl py-1.5 text-xs font-semibold capitalize transition ${
                    difficulty === d
                      ? d === "beginner"
                        ? "bg-emerald-100 text-emerald-800"
                        : d === "intermediate"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                      : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {d}
                </button>
              )
            )}
          </div>

          <p className="mb-4 text-xs text-slate-500">
            {mode === "give"
              ? "You will receive a patient chart. Write your SBAR handoff report as if giving report to the incoming nurse."
              : "You will read a nurse-to-nurse handoff. Write down what matters, your priorities, and any follow-up questions you would ask."}
          </p>

          <button
            onClick={generateScenario}
            disabled={scenarioLoading}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {scenarioLoading
              ? "Generating scenario..."
              : scenario
              ? "Generate New Scenario"
              : "Generate Scenario"}
          </button>
          {scenarioError && (
            <p className="mt-2 text-xs text-red-600">{scenarioError}</p>
          )}
        </div>

        {/* Give Report — Patient Chart */}
        {giveScenario && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-blue-900">Patient Chart</h2>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                  {giveScenario.setting}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  {giveScenario.context}
                </span>
              </div>
            </div>

            {/* Critical Alert */}
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">
                Critical Alert
              </p>
              <p className="mt-0.5 text-sm text-red-800">{giveScenario.criticalAlert}</p>
            </div>

            {/* Patient Info */}
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoCell label="Patient" value={giveScenario.patient.name} />
              <InfoCell
                label="Age / Sex"
                value={`${giveScenario.patient.age}y ${giveScenario.patient.sex}`}
              />
              <InfoCell label="Room" value={giveScenario.patient.room} />
              <InfoCell label="Diagnosis" value={giveScenario.patient.admittingDiagnosis} />
              <InfoCell
                label="Day"
                value={`HD ${giveScenario.patient.daysInHospital}`}
              />
              <InfoCell label="Code Status" value={giveScenario.patient.code} />
              <InfoCell
                label="Allergies"
                value={giveScenario.patient.allergies}
                highlight={
                  giveScenario.patient.allergies !== "None known" &&
                  giveScenario.patient.allergies !== "NKDA"
                }
              />
            </div>

            {/* Vitals */}
            <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Vitals
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {Object.entries(giveScenario.vitals).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <p className="text-[10px] font-semibold text-slate-400">{k}</p>
                    <p className="text-xs font-bold text-slate-800">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Meds */}
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Current Medications
              </p>
              <ul className="space-y-0.5">
                {giveScenario.currentMeds.map((med, i) => (
                  <li key={i} className="text-xs text-slate-700">
                    • {med}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Events */}
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                This Shift
              </p>
              <p className="text-xs leading-5 text-slate-700">
                {giveScenario.recentEvents}
              </p>
            </div>

            {/* Pending */}
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Pending
              </p>
              <ul className="space-y-0.5">
                {giveScenario.pendingItems.map((item, i) => (
                  <li key={i} className="text-xs text-slate-700">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Safety */}
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                Safety Notes
              </p>
              <p className="mt-0.5 text-xs text-amber-800">{giveScenario.safetyNotes}</p>
            </div>
          </div>
        )}

        {/* Receive Report — Report Text */}
        {receiveScenario && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-blue-900">Incoming Report</h2>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                  {receiveScenario.setting}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  {receiveScenario.context}
                </span>
              </div>
            </div>
            <p className="mb-3 text-xs font-semibold text-slate-500">
              {receiveScenario.patientSummary}
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {receiveScenario.reportText}
              </p>
            </div>
          </div>
        )}

        {/* Response Area */}
        {scenario && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-sm font-bold">
              {mode === "give" ? "Your Handoff Report" : "Your Notes"}
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              {mode === "give"
                ? "Write your SBAR handoff as if speaking to the incoming nurse. Include everything they need to safely take over care."
                : "Write down what you think matters most, your priorities for the shift, and any follow-up questions you would ask."}
            </p>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={
                mode === "give"
                  ? "Situation: I'm giving you report on [patient name] in room [X]...\nBackground: The patient was admitted for...\nAssessment: Currently...\nRecommendation: Tonight I would watch for..."
                  : "Key findings:\n- \n\nPriorities for my shift:\n1. \n\nFollow-up questions I would ask:\n- "
              }
              rows={10}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none transition focus:border-blue-400 focus:bg-white"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={submitResponse}
                disabled={grading || !response.trim()}
                className="rounded-xl bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
              >
                {grading ? "Grading..." : "Submit for Grading"}
              </button>
              {grading && (
                <p className="text-xs text-slate-500">
                  Lexi is reviewing your report...
                </p>
              )}
            </div>
            {gradeError && (
              <p className="mt-2 text-xs text-red-600">{gradeError}</p>
            )}
          </div>
        )}

        {/* Give Report Results */}
        {giveResult && (
          <div className="space-y-4">
            {/* Score header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-4 border-slate-100 bg-slate-50">
                  <span
                    className={`text-4xl font-black ${gradeColor(giveResult.grade)}`}
                  >
                    {giveResult.grade}
                  </span>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">
                    {giveResult.overallScore}
                    <span className="text-lg font-semibold text-slate-400">/100</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {giveResult.overallScore >= 90
                      ? "Excellent clinical handoff"
                      : giveResult.overallScore >= 80
                      ? "Strong — a few things to sharpen"
                      : giveResult.overallScore >= 70
                      ? "Passing, but gaps to address"
                      : giveResult.overallScore >= 60
                      ? "Needs improvement — review the misses"
                      : "Major gaps — patient safety at risk"}
                  </p>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold">Score Breakdown</h2>
              <div className="space-y-5">
                <DimensionBar
                  label="Key Facts (25 pts)"
                  score={giveResult.dimensions.keyFacts.score}
                  max={giveResult.dimensions.keyFacts.max}
                  feedback={giveResult.dimensions.keyFacts.feedback}
                />
                <DimensionBar
                  label="Organization / SBAR (20 pts)"
                  score={giveResult.dimensions.organization.score}
                  max={giveResult.dimensions.organization.max}
                  feedback={giveResult.dimensions.organization.feedback}
                />
                <DimensionBar
                  label="Safety-Critical Items (25 pts)"
                  score={giveResult.dimensions.safetyCritical.score}
                  max={giveResult.dimensions.safetyCritical.max}
                  feedback={giveResult.dimensions.safetyCritical.feedback}
                />
                <DimensionBar
                  label="Conciseness (15 pts)"
                  score={giveResult.dimensions.conciseness.score}
                  max={giveResult.dimensions.conciseness.max}
                  feedback={giveResult.dimensions.conciseness.feedback}
                />
                <DimensionBar
                  label="Clinical Usability (15 pts)"
                  score={giveResult.dimensions.clinicalUsability.score}
                  max={giveResult.dimensions.clinicalUsability.max}
                  feedback={giveResult.dimensions.clinicalUsability.feedback}
                />
              </div>
            </div>

            {/* Misses + Strengths */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {giveResult.criticalMisses.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 text-sm font-bold text-red-700">
                    Critical Misses
                  </h2>
                  <ul className="space-y-1">
                    {giveResult.criticalMisses.map((m, i) => (
                      <li key={i} className="text-xs leading-5 text-slate-700">
                        • {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {giveResult.strengths.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 text-sm font-bold text-emerald-700">
                    Strengths
                  </h2>
                  <ul className="space-y-1">
                    {giveResult.strengths.map((s, i) => (
                      <li key={i} className="text-xs leading-5 text-slate-700">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Coaching + Model */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-bold text-blue-900">
                Lexi&apos;s Coaching
              </h2>
              <p className="mb-4 text-sm leading-6 text-slate-700">
                {giveResult.coachingNote}
              </p>
              {giveResult.modelReportSnippet && (
                <>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    How the critical section should have sounded
                  </p>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-sm italic leading-6 text-blue-800">
                      &ldquo;{giveResult.modelReportSnippet}&rdquo;
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={generateScenario}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Try Another Scenario
            </button>
          </div>
        )}

        {/* Receive Report Results */}
        {receiveResult && (
          <div className="space-y-4">
            {/* Score header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-4 border-slate-100 bg-slate-50">
                  <span
                    className={`text-4xl font-black ${gradeColor(receiveResult.grade)}`}
                  >
                    {receiveResult.grade}
                  </span>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">
                    {receiveResult.overallScore}
                    <span className="text-lg font-semibold text-slate-400">/100</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {receiveResult.overallScore >= 90
                      ? "You received report like a seasoned nurse"
                      : receiveResult.overallScore >= 80
                      ? "Solid — sharpening your filter will help"
                      : receiveResult.overallScore >= 70
                      ? "Passing, but missed some key items"
                      : "Gaps in critical capture — review missed items"}
                  </p>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold">Score Breakdown</h2>
              <div className="space-y-5">
                <DimensionBar
                  label="Critical Capture (30 pts)"
                  score={receiveResult.dimensions.criticalCapture.score}
                  max={receiveResult.dimensions.criticalCapture.max}
                  feedback={receiveResult.dimensions.criticalCapture.feedback}
                />
                <DimensionBar
                  label="Prioritization (25 pts)"
                  score={receiveResult.dimensions.prioritization.score}
                  max={receiveResult.dimensions.prioritization.max}
                  feedback={receiveResult.dimensions.prioritization.feedback}
                />
                <DimensionBar
                  label="Follow-Up Questions (25 pts)"
                  score={receiveResult.dimensions.followUpQuestions.score}
                  max={receiveResult.dimensions.followUpQuestions.max}
                  feedback={receiveResult.dimensions.followUpQuestions.feedback}
                />
                <DimensionBar
                  label="Signal vs Noise (20 pts)"
                  score={receiveResult.dimensions.signalToNoise.score}
                  max={receiveResult.dimensions.signalToNoise.max}
                  feedback={receiveResult.dimensions.signalToNoise.feedback}
                />
              </div>
            </div>

            {/* What they got + missed */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {receiveResult.correctlyCaptured.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 text-sm font-bold text-emerald-700">
                    Correctly Captured
                  </h2>
                  <ul className="space-y-1">
                    {receiveResult.correctlyCaptured.map((s, i) => (
                      <li key={i} className="text-xs leading-5 text-slate-700">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {receiveResult.criticalMisses.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-2 text-sm font-bold text-red-700">
                    Critical Misses
                  </h2>
                  <ul className="space-y-1">
                    {receiveResult.criticalMisses.map((m, i) => (
                      <li key={i} className="text-xs leading-5 text-slate-700">
                        • {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Follow-up + Model Priorities */}
            {receiveResult.followUpQuestionsShouldHaveAsked.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-bold text-amber-700">
                  Questions You Should Have Asked
                </h2>
                <ul className="space-y-1">
                  {receiveResult.followUpQuestionsShouldHaveAsked.map((q, i) => (
                    <li key={i} className="text-xs leading-5 text-slate-700">
                      • {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-bold">Shift Priorities</h2>
              <p className="mb-2 text-xs text-slate-500">
                What the incoming nurse should do first:
              </p>
              <ol className="space-y-1">
                {receiveResult.modelPriorities.map((p, i) => (
                  <li key={i} className="text-xs leading-5 text-slate-700">
                    {i + 1}. {p}
                  </li>
                ))}
              </ol>
            </div>

            {/* Coaching */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-bold text-blue-900">
                Lexi&apos;s Coaching
              </h2>
              <p className="text-sm leading-6 text-slate-700">
                {receiveResult.coachingNote}
              </p>
            </div>

            {/* Answer Key toggle */}
            {receiveScenario?.answerKey && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <button
                  onClick={() => setShowAnswerKey((v) => !v)}
                  className="flex w-full items-center justify-between text-sm font-semibold text-slate-700"
                >
                  <span>View Full Answer Key</span>
                  <span className="text-xs text-slate-400">
                    {showAnswerKey ? "Hide ▲" : "Show ▼"}
                  </span>
                </button>
                {showAnswerKey && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-red-600">
                        Critical Findings
                      </p>
                      <ul className="space-y-0.5">
                        {receiveScenario.answerKey.criticalFindings.map(
                          (f, i) => (
                            <li key={i} className="text-xs text-slate-700">
                              • {f}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-600">
                        Should Have Prioritized
                      </p>
                      <ul className="space-y-0.5">
                        {receiveScenario.answerKey.shouldHavePrioritized.map(
                          (f, i) => (
                            <li key={i} className="text-xs text-slate-700">
                              • {f}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-600">
                        Follow-Up Questions
                      </p>
                      <ul className="space-y-0.5">
                        {receiveScenario.answerKey.essentialFollowUpQuestions.map(
                          (f, i) => (
                            <li key={i} className="text-xs text-slate-700">
                              • {f}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Low-Value / Filler
                      </p>
                      <ul className="space-y-0.5">
                        {receiveScenario.answerKey.unnecessaryInfo.map(
                          (f, i) => (
                            <li key={i} className="text-xs text-slate-500">
                              • {f}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={generateScenario}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Try Another Scenario
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function InfoCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-2 ${
        highlight
          ? "border-red-200 bg-red-50"
          : "border-slate-100 bg-slate-50"
      }`}
    >
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${highlight ? "text-red-500" : "text-slate-400"}`}>
        {label}
      </p>
      <p className={`text-xs font-bold ${highlight ? "text-red-800" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}
