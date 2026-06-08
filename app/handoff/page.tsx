"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Navbar from "../../components/Navbar";

type Mode = "give" | "receive" | "isbar" | "build";
type Difficulty = "beginner" | "intermediate" | "advanced";
type Phase =
  | "idle"
  | "loading_scenario"
  | "ready"
  | "intro_loading"
  | "intro_speaking"
  | "student_turn"
  | "recording"
  | "transcribing"
  | "thinking"
  | "persona_speaking"
  | "complete"
  | "grading"
  | "graded";

type ConvMessage = {
  role: "nurse" | "doctor" | "student";
  text: string;
  audioUrl?: string;
  hideText?: boolean; // used for receive-mode report — audio only, no visible text
};

type DimensionResult = { score: number; max: number; feedback: string };

type GradeResult = {
  overallScore: number;
  grade: string;
  dimensions: Record<string, DimensionResult>;
  criticalMisses?: string[];
  strengths?: string[];
  correctlyCaptured?: string[];
  questionsShouldHaveAsked?: string[];
  followUpQuestionsShouldHaveAsked?: string[];
  coachingNote: string;
  modelSnippet?: string;
  modelIsbarSnippet?: string;
  modelPriorities?: string[];
};

type BuildForm = {
  patientName: string; age: string; sex: string; room: string;
  diagnosis: string; codeStatus: string; allergies: string;
  bp: string; hr: string; rr: string; spo2: string; temp: string; pain: string;
  physicalAssessment: string; currentMeds: string; shiftEvents: string;
  pendingItems: string; safetyNotes: string;
};

type BuildResult = {
  spokenReport: string;
  structuredSbar: { situation: string; background: string; assessment: string; recommendation: string };
  prioritizationNotes: string;
  safetyHighlights: string[];
};

const EMPTY_BUILD_FORM: BuildForm = {
  patientName: "", age: "", sex: "female", room: "",
  diagnosis: "", codeStatus: "Full Code", allergies: "None known",
  bp: "", hr: "", rr: "", spo2: "", temp: "", pain: "",
  physicalAssessment: "", currentMeds: "", shiftEvents: "", pendingItems: "", safetyNotes: "",
};

function gradeColor(g: string) {
  if (g === "A") return "text-emerald-600";
  if (g === "B") return "text-blue-600";
  if (g === "C") return "text-amber-600";
  return "text-red-600";
}

function barColor(pct: number) {
  if (pct >= 0.8) return "bg-emerald-500";
  if (pct >= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

function DimensionBar({ label, score, max, feedback }: { label: string; score: number; max: number; feedback: string }) {
  const pct = max > 0 ? score / max : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>{label}</span>
        <span>{score}/{max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all ${barColor(pct)}`} style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
      <p className="text-xs leading-5 text-slate-500">{feedback}</p>
    </div>
  );
}

const DIMENSION_LABELS: Record<string, string> = {
  keyFacts: "Key Facts (25 pts)",
  organization: "SBAR Organization (20 pts)",
  safetyCritical: "Safety-Critical Items (25 pts)",
  responseToQuestions: "Response to Questions (15 pts)",
  clinicalTone: "Clinical Tone (15 pts)",
  criticalCapture: "Critical Capture (30 pts)",
  followUpQuestions: "Follow-Up Questions (30 pts)",
  prioritization: "Prioritization (25 pts)",
  signalToNoise: "Signal vs Noise (15 pts)",
  identification: "Identification (15 pts)",
  situation: "Situation (20 pts)",
  background: "Background (15 pts)",
  assessment: "Assessment (20 pts)",
  recommendation: "Recommendation (20 pts)",
  responseToPhysician: "Response to Physician (10 pts)",
};

const PERSONA_LABEL: Record<Mode, string> = {
  give: "Nurse",
  receive: "Nurse",
  isbar: "Dr.",
  build: "Lexi",
};

export default function HandoffPage() {
  const [mode, setMode] = useState<Mode>("give");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scenario, setScenario] = useState<Record<string, any> | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [conversation, setConversation] = useState<ConvMessage[]>([]);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Report Builder state
  const [buildForm, setBuildForm] = useState<BuildForm>(EMPTY_BUILD_FORM);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildSpeaking, setBuildSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convRef = useRef<ConvMessage[]>([]);
  convRef.current = conversation;

  // Keep handleRecordingComplete in a ref so startRecording never has stale closure issues
  const handleRecordingCompleteRef = useRef<(blob: Blob) => Promise<void>>(async () => {});

  // Unlock AudioContext for iOS/Safari autoplay — must be called in a synchronous user gesture
  function unlockAudio() {
    try {
      type AnyWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctx = window.AudioContext ?? (window as AnyWindow).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.close();
    } catch {}
  }

  // Safe speak: deduplicates onEnd, stores callback in ref for skip button
  async function speakText(text: string, onEnd: () => void): Promise<string | null> {
    let called = false;
    function safeEnd() {
      if (!called) { called = true; onEndRef.current = null; onEnd(); }
    }
    onEndRef.current = safeEnd;

    try {
      const persona = mode === "isbar" ? "doctor" : "nurse";
      const res = await fetch("/api/handoff/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, persona }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = safeEnd;
      audio.onerror = safeEnd;
      audio.play().catch(safeEnd);
      return url;
    } catch {
      safeEnd();
      return null;
    }
  }

  // Skip button — fires the onEnd callback immediately and pauses audio
  function skipSpeaking() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const cb = onEndRef.current;
    onEndRef.current = null;
    if (cb) cb();
  }

  // --- scenario generation ---

  async function generateScenario() {
    setPhase("loading_scenario");
    setErrorMsg("");
    setScenario(null);
    setConversation([]);
    setGradeResult(null);
    setShowAnswerKey(false);
    try {
      const res = await fetch("/api/handoff/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || "Failed to generate."); setPhase("idle"); return; }
      setScenario(data);
      setPhase("ready");
    } catch {
      setErrorMsg("Failed to connect to server.");
      setPhase("idle");
    }
  }

  // --- start conversation (called synchronously from button click to keep audio unlock in same gesture) ---

  async function startConversation() {
    unlockAudio(); // must be synchronous within the user gesture
    setPhase("intro_loading");
    setConversation([]);
    setGradeResult(null);
    setShowAnswerKey(false);

    let initialText = "";
    if (mode === "receive") {
      initialText = (scenario?.reportText as string) || "";
    } else if (mode === "give") {
      initialText = (scenario?.nurseGreeting as string) || "Ready for your report whenever you are.";
    } else {
      initialText = (scenario?.doctorGreeting as string) || "Dr. speaking.";
    }

    if (!initialText) { setPhase("student_turn"); return; }

    const role: "nurse" | "doctor" = mode === "isbar" ? "doctor" : "nurse";
    // In receive mode we hide the text — student must listen only
    const hideText = mode === "receive";

    setPhase("intro_speaking");
    const url = await speakText(initialText, () => setPhase("student_turn"));
    setConversation([{ role, text: initialText, audioUrl: url || undefined, hideText }]);
  }

  // --- recording ---

  const startRecording = useCallback(async () => {
    unlockAudio();
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingSeconds(0);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        // Always use the ref so we never capture a stale closure
        await handleRecordingCompleteRef.current(blob);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setPhase("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setErrorMsg("Microphone access denied. Please allow mic access and try again.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // Defined as a regular function (re-created each render) and assigned to ref so startRecording always calls latest
  async function handleRecordingComplete(blob: Blob) {
    setPhase("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", blob, "handoff.webm");
      formData.append("sessionTitle", mode === "isbar" ? "ISBAR call" : "Nursing handoff");

      const transcribeRes = await fetch("/api/live-lecture/transcribe", { method: "POST", body: formData });
      const transcribeData = await transcribeRes.json();

      if (!transcribeRes.ok || transcribeData.error) {
        setErrorMsg("Transcription failed. Try again.");
        setPhase("student_turn");
        return;
      }

      const text: string = transcribeData.text?.trim();
      if (!text) {
        setErrorMsg("Nothing was captured. Speak clearly and try again.");
        setPhase("student_turn");
        return;
      }

      const studentMsg: ConvMessage = { role: "student", text };
      setConversation((prev) => [...prev, studentMsg]);

      setPhase("thinking");
      // Use the snapshot of history BEFORE the student message (we pass studentMessage separately)
      const currentHistory = [...convRef.current];
      const chatRes = await fetch("/api/handoff/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, scenario, history: currentHistory, studentMessage: text }),
      });
      const chatData = await chatRes.json();

      if (!chatRes.ok || chatData.error) {
        setErrorMsg("Response generation failed. Try again.");
        setPhase("student_turn");
        return;
      }

      const personaRole: "nurse" | "doctor" = mode === "isbar" ? "doctor" : "nurse";

      if (chatData.isComplete) {
        setPhase("persona_speaking");
        const url = await speakText(chatData.response, () => setPhase("complete"));
        setConversation((prev) => [...prev, { role: personaRole, text: chatData.response, audioUrl: url || undefined }]);
      } else {
        setPhase("persona_speaking");
        const url = await speakText(chatData.response, () => setPhase("student_turn"));
        setConversation((prev) => [...prev, { role: personaRole, text: chatData.response, audioUrl: url || undefined }]);
      }
    } catch {
      setErrorMsg("Something went wrong. Try again.");
      setPhase("student_turn");
    }
  }

  // Keep the ref always pointing to the current function
  useEffect(() => {
    handleRecordingCompleteRef.current = handleRecordingComplete;
  });

  // --- replay audio ---

  function replayAudio(url: string) {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }

  // --- grade ---

  async function gradeConversation() {
    setPhase("grading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/handoff/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, scenario, conversationHistory: conversation }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || "Grading failed."); setPhase("complete"); return; }
      setGradeResult(data);
      setPhase("graded");
    } catch {
      setErrorMsg("Failed to grade. Try again.");
      setPhase("complete");
    }
  }

  // --- report builder ---

  async function buildReport() {
    setBuildLoading(true);
    setBuildResult(null);
    setErrorMsg("");
    try {
      const res = await fetch("/api/handoff/build-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildForm),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || "Failed to generate report."); return; }
      setBuildResult(data);
    } catch {
      setErrorMsg("Failed to connect to server.");
    } finally {
      setBuildLoading(false);
    }
  }

  async function speakBuiltReport() {
    if (!buildResult?.spokenReport) return;
    unlockAudio();
    setBuildSpeaking(true);
    try {
      const res = await fetch("/api/handoff/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: buildResult.spokenReport, persona: "nurse" }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setBuildSpeaking(false);
      audio.onerror = () => setBuildSpeaking(false);
      audio.play().catch(() => setBuildSpeaking(false));
    } catch {
      setBuildSpeaking(false);
    }
  }

  // --- reset ---

  function resetMode(newMode: Mode) {
    if (audioRef.current) audioRef.current.pause();
    setMode(newMode);
    setScenario(null);
    setConversation([]);
    setGradeResult(null);
    setPhase("idle");
    setErrorMsg("");
    setBuildResult(null);
    setBuildSpeaking(false);
  }

  const isLoading = phase === "loading_scenario";
  const isBusy = ["intro_loading", "intro_speaking", "transcribing", "thinking", "persona_speaking", "grading"].includes(phase);
  const isSpeaking = phase === "intro_speaking" || phase === "persona_speaking";
  const personaName = mode === "isbar"
    ? (scenario?.doctorName as string) || "Dr."
    : mode === "receive" ? "Night Nurse" : "Charge Nurse";

  // --- render ---

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
            Clinical Handoff Lab
            <span className="rounded-full bg-blue-800 px-1.5 py-0.5 text-[10px] font-bold text-white">PREMIUM</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Clinical Handoff Lab</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real voice. Real handoffs. Lexi grades your clinical communication.
          </p>
        </div>

        {/* Mode tabs */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 grid grid-cols-2 gap-2">
            {(["give", "receive", "isbar", "build"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => resetMode(m)}
                disabled={isBusy || buildLoading}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${
                  mode === m
                    ? m === "build" ? "bg-orange-500 text-white" : "bg-blue-900 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m === "give" ? "Give Report" : m === "receive" ? "Receive Report" : m === "isbar" ? "ISBAR to Doctor" : "Report Builder"}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs text-slate-500">
            {mode === "give"
              ? "Read the patient chart. When you start, the relief nurse greets you — then speak your full SBAR handoff."
              : mode === "receive"
              ? "Hit start and listen to the night nurse speak report. No text — just audio. Ask follow-up questions, then get graded."
              : mode === "isbar"
              ? "Read the situation. Call the attending and deliver your ISBAR. The doctor will ask you questions."
              : "Enter your patient's vitals and physical assessment. Lexi writes a polished SBAR report and reads it back to you in Brianna's voice."}
          </p>

          {mode !== "build" && (
            <div className="mb-3 flex gap-2">
              {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={isBusy || phase !== "idle"}
                  className={`flex-1 rounded-xl py-1.5 text-xs font-semibold capitalize transition ${
                    difficulty === d
                      ? d === "beginner" ? "bg-emerald-100 text-emerald-800"
                      : d === "intermediate" ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                      : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {mode !== "build" && (
            <button
              onClick={generateScenario}
              disabled={isLoading || isBusy}
              className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {isLoading ? "Generating..." : scenario ? "Generate New Scenario" : "Generate Scenario"}
            </button>
          )}
          {errorMsg && <p className="mt-2 text-xs text-red-600">{errorMsg}</p>}
        </div>

        {/* Report Builder */}
        {mode === "build" && (
          <BuildReportSection
            form={buildForm}
            setForm={setBuildForm}
            result={buildResult}
            loading={buildLoading}
            speaking={buildSpeaking}
            onGenerate={buildReport}
            onSpeak={speakBuiltReport}
            onStopSpeak={() => { if (audioRef.current) { audioRef.current.pause(); setBuildSpeaking(false); } }}
            onReset={() => { setBuildResult(null); setBuildForm(EMPTY_BUILD_FORM); }}
          />
        )}

        {/* Patient Chart — give / isbar */}
        {scenario && (mode === "give" || mode === "isbar") && phase !== "graded" && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-blue-900">
                {mode === "isbar" ? "Patient Situation" : "Patient Chart"}
              </h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{scenario.setting}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{scenario.context}</span>
            </div>

            {mode === "give" && scenario.criticalAlert && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-red-600">Critical Alert</p>
                <p className="mt-0.5 text-sm text-red-800">{scenario.criticalAlert}</p>
              </div>
            )}

            {mode === "isbar" && (
              <>
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Why You&apos;re Calling</p>
                  <p className="mt-0.5 text-sm text-amber-900">{scenario.situation}</p>
                </div>
                <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Background</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-700">{scenario.background}</p>
                </div>
                {scenario.nursingActionsTaken && (
                  <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Already Done</p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-800">{scenario.nursingActionsTaken}</p>
                  </div>
                )}
              </>
            )}

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoCell label="Patient" value={scenario.patient?.name ?? "—"} />
              <InfoCell label="Age / Sex" value={`${scenario.patient?.age ?? "—"}y ${scenario.patient?.sex ?? ""}`} />
              <InfoCell label="Room" value={scenario.patient?.room ?? "—"} />
              <InfoCell label="Diagnosis" value={scenario.patient?.admittingDiagnosis ?? "—"} />
              <InfoCell label="Code" value={scenario.patient?.code ?? "—"} />
              <InfoCell
                label="Allergies"
                value={scenario.patient?.allergies ?? "—"}
                highlight={!!scenario.patient?.allergies && scenario.patient.allergies !== "None known" && scenario.patient.allergies !== "NKDA"}
              />
            </div>

            {(scenario.vitals || scenario.currentVitals) && (
              <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Vitals</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {Object.entries(scenario.vitals ?? scenario.currentVitals ?? {}).map(([k, v]) => (
                    <div key={k} className="text-center">
                      <p className="text-[10px] font-semibold text-slate-400">{k}</p>
                      <p className="text-xs font-bold text-slate-800">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(scenario.currentMeds ?? scenario.relevantMeds)?.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {mode === "isbar" ? "Relevant Meds" : "Current Meds"}
                </p>
                <ul className="space-y-0.5">
                  {(scenario.currentMeds ?? scenario.relevantMeds).map((m: string, i: number) => (
                    <li key={i} className="text-xs text-slate-700">• {m}</li>
                  ))}
                </ul>
              </div>
            )}

            {mode === "isbar" && scenario.recentLabs?.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Recent Labs</p>
                <ul className="space-y-0.5">
                  {scenario.recentLabs.map((l: string, i: number) => (
                    <li key={i} className="text-xs text-slate-700">• {l}</li>
                  ))}
                </ul>
              </div>
            )}

            {mode === "give" && (
              <>
                {scenario.recentEvents && (
                  <div className="mb-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">This Shift</p>
                    <p className="text-xs leading-5 text-slate-700">{scenario.recentEvents}</p>
                  </div>
                )}
                {scenario.pendingItems?.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Pending</p>
                    <ul className="space-y-0.5">
                      {scenario.pendingItems.map((p: string, i: number) => (
                        <li key={i} className="text-xs text-slate-700">• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {scenario.safetyNotes && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Safety Notes</p>
                    <p className="mt-0.5 text-xs text-amber-800">{scenario.safetyNotes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Receive mode: just show patient summary — chart is hidden */}
        {scenario && mode === "receive" && (phase === "ready" || phase === "intro_loading") && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-blue-900">Ready to receive report</p>
            <p className="mt-1 text-xs text-slate-500">
              When you start, the night nurse will speak her handoff to you. No text — just audio. Take mental notes, then ask your follow-up questions verbally.
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-600">{scenario.patientSummary}</p>
            </div>
          </div>
        )}

        {/* Start button */}
        {scenario && phase === "ready" && (
          <div className="mb-5">
            <button
              onClick={startConversation}
              className="w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              {mode === "give" ? "Start — Your relief is ready" : mode === "receive" ? "Start — Listen to night nurse" : "Start — Call the physician"}
            </button>
          </div>
        )}

        {/* Conversation panel */}
        {conversation.length > 0 && (
          <div className="mb-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Conversation</h2>
            {conversation.map((msg, i) => (
              <ConvBubble
                key={i}
                msg={msg}
                personaName={personaName}
                onReplay={msg.audioUrl ? () => replayAudio(msg.audioUrl!) : undefined}
              />
            ))}

            {/* Speaking state — show pulsing indicator + skip button */}
            {isSpeaking && (
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  <span className="text-xs text-blue-700">
                    {PERSONA_LABEL[mode]} is speaking...
                  </span>
                </div>
                <button
                  onClick={skipSpeaking}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Done listening →
                </button>
              </div>
            )}

            {phase === "intro_loading" && <StatusPill text="Connecting..." />}
            {phase === "transcribing" && <StatusPill text="Transcribing your voice..." />}
            {phase === "thinking" && <StatusPill text={`${PERSONA_LABEL[mode]} is thinking...`} />}
            {phase === "grading" && <StatusPill text="Lexi is grading your interaction..." />}
          </div>
        )}

        {/* Recording controls */}
        {(phase === "student_turn" || phase === "recording") && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-center text-sm font-semibold text-slate-700">
              {mode === "give"
                ? phase === "recording" ? "Recording your report..." : "Your turn — speak your SBAR"
                : mode === "receive"
                ? phase === "recording" ? "Recording your response..." : "Ask a follow-up or give your assessment"
                : phase === "recording" ? "Recording your ISBAR..." : "Your turn — deliver your ISBAR"}
            </p>
            <div className="flex justify-center">
              <button
                onClick={phase === "recording" ? stopRecording : startRecording}
                className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-all ${
                  phase === "recording"
                    ? "animate-pulse bg-red-600 hover:bg-red-700"
                    : "bg-blue-900 hover:bg-blue-800 active:scale-95"
                }`}
              >
                {phase === "recording" ? (
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 9v-2.07A7.001 7.001 0 0019 11h-2a5 5 0 01-10 0H5a7.001 7.001 0 006 6.93V20H8v2h8v-2h-4z"/>
                  </svg>
                )}
              </button>
            </div>
            {phase === "recording" && (
              <p className="mt-3 text-center text-xs text-slate-500">{recordingSeconds}s — tap ■ to stop</p>
            )}
            {phase === "student_turn" && (
              <p className="mt-3 text-center text-xs text-slate-400">Tap the mic to start speaking. Tap ■ when done.</p>
            )}
          </div>
        )}

        {/* End & Grade */}
        {phase === "complete" && !gradeResult && (
          <div className="mb-5">
            <button
              onClick={gradeConversation}
              className="w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Get Lexi&apos;s Grade
            </button>
          </div>
        )}

        {/* Grade Results */}
        {gradeResult && phase === "graded" && (
          <GradePanel
            result={gradeResult}
            mode={mode}
            scenario={scenario}
            showAnswerKey={showAnswerKey}
            setShowAnswerKey={setShowAnswerKey}
            onRetry={generateScenario}
            onReplay={replayAudio}
          />
        )}
      </section>
    </main>
  );
}

// --- Sub-components ---

function ConvBubble({
  msg,
  personaName,
  onReplay,
}: {
  msg: ConvMessage;
  personaName: string;
  onReplay?: () => void;
}) {
  const isStudent = msg.role === "student";
  return (
    <div className={`flex gap-3 ${isStudent ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
          isStudent ? "bg-orange-500" : msg.role === "doctor" ? "bg-slate-700" : "bg-blue-700"
        }`}
      >
        {isStudent ? "You" : msg.role === "doctor" ? "Dr" : "RN"}
      </div>
      <div className={`max-w-[80%] space-y-1 flex flex-col ${isStudent ? "items-end" : "items-start"}`}>
        <p className={`text-[10px] font-semibold text-slate-400 ${isStudent ? "text-right" : ""}`}>
          {isStudent ? "You" : personaName}
        </p>
        {msg.hideText ? (
          // Receive mode — show audio indicator instead of report text
          <div className="rounded-2xl rounded-tl-sm border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-500">🔊</span>
              <span className="text-sm italic text-blue-700">Audio report playing...</span>
            </div>
            {onReplay && (
              <button onClick={onReplay} className="mt-1 text-[10px] text-blue-400 hover:text-blue-600 transition">
                ▶ Replay report
              </button>
            )}
          </div>
        ) : (
          <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            isStudent ? "rounded-tr-sm bg-orange-50 text-slate-800" : "rounded-tl-sm bg-blue-50 text-slate-800"
          }`}>
            {msg.text}
          </div>
        )}
        {!msg.hideText && onReplay && (
          <button onClick={onReplay} className="text-[10px] text-slate-400 hover:text-blue-600 transition">
            ▶ replay
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ text }: { text: string }) {
  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{text}</span>
    </div>
  );
}

function InfoCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-2 ${highlight ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${highlight ? "text-red-500" : "text-slate-400"}`}>{label}</p>
      <p className={`text-xs font-bold ${highlight ? "text-red-800" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function GradePanel({
  result,
  mode,
  scenario,
  showAnswerKey,
  setShowAnswerKey,
  onRetry,
  onReplay,
}: {
  result: GradeResult;
  mode: Mode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenario: Record<string, any> | null;
  showAnswerKey: boolean;
  setShowAnswerKey: (v: boolean) => void;
  onRetry: () => void;
  onReplay: (url: string) => void;
}) {
  void onReplay; // available for future use

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full border-4 border-slate-100 bg-slate-50">
            <span className={`text-4xl font-black ${gradeColor(result.grade)}`}>{result.grade}</span>
          </div>
          <div>
            <p className="text-3xl font-black">
              {result.overallScore}
              <span className="text-lg font-semibold text-slate-400">/100</span>
            </p>
            <p className="text-sm text-slate-500">
              {result.overallScore >= 90 ? "Excellent clinical communication"
                : result.overallScore >= 80 ? "Strong — a few things to sharpen"
                : result.overallScore >= 70 ? "Passing, but gaps to address"
                : result.overallScore >= 60 ? "Needs improvement"
                : "Major gaps — review critical misses below"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">Score Breakdown</h2>
        <div className="space-y-5">
          {Object.entries(result.dimensions).map(([key, dim]) => (
            <DimensionBar key={key} label={DIMENSION_LABELS[key] ?? key} score={dim.score} max={dim.max} feedback={dim.feedback} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(result.criticalMisses ?? []).length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-red-700">Critical Misses</h2>
            <ul className="space-y-1">
              {result.criticalMisses!.map((m, i) => <li key={i} className="text-xs leading-5 text-slate-700">• {m}</li>)}
            </ul>
          </div>
        )}
        {(result.strengths ?? result.correctlyCaptured ?? []).length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-emerald-700">
              {result.correctlyCaptured ? "Correctly Captured" : "Strengths"}
            </h2>
            <ul className="space-y-1">
              {(result.strengths ?? result.correctlyCaptured ?? []).map((s, i) => (
                <li key={i} className="text-xs leading-5 text-slate-700">• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(result.questionsShouldHaveAsked ?? result.followUpQuestionsShouldHaveAsked ?? []).length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-amber-700">Questions You Should Have Asked</h2>
          <ul className="space-y-1">
            {(result.questionsShouldHaveAsked ?? result.followUpQuestionsShouldHaveAsked ?? []).map((q, i) => (
              <li key={i} className="text-xs leading-5 text-slate-700">• {q}</li>
            ))}
          </ul>
        </div>
      )}

      {(result.modelPriorities ?? []).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold">Shift Priorities</h2>
          <ol className="space-y-1">
            {result.modelPriorities!.map((p, i) => <li key={i} className="text-xs leading-5 text-slate-700">{i + 1}. {p}</li>)}
          </ol>
        </div>
      )}

      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-blue-900">Lexi&apos;s Coaching</h2>
        <p className="mb-4 text-sm leading-6 text-slate-700">{result.coachingNote}</p>
        {(result.modelSnippet ?? result.modelIsbarSnippet) && (
          <>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {result.modelIsbarSnippet ? "How your ISBAR should have sounded" : "How this section should have sounded"}
            </p>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-sm italic leading-6 text-blue-800">&ldquo;{result.modelSnippet ?? result.modelIsbarSnippet}&rdquo;</p>
            </div>
          </>
        )}
      </div>

      {mode === "receive" && scenario?.answerKey && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            onClick={() => setShowAnswerKey(!showAnswerKey)}
            className="flex w-full items-center justify-between text-sm font-semibold text-slate-700"
          >
            <span>View Full Report &amp; Answer Key</span>
            <span className="text-xs text-slate-400">{showAnswerKey ? "Hide ▲" : "Show ▼"}</span>
          </button>
          {showAnswerKey && (
            <div className="mt-4 space-y-4">
              {scenario.reportText && (
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Full Report Text</p>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{scenario.reportText}</p>
                  </div>
                </div>
              )}
              {[
                { key: "criticalFindings", label: "Critical Findings", color: "text-red-600" },
                { key: "shouldHavePrioritized", label: "Should Have Prioritized", color: "text-blue-600" },
                { key: "essentialFollowUpQuestions", label: "Follow-Up Questions", color: "text-amber-600" },
                { key: "unnecessaryInfo", label: "Low-Value Filler", color: "text-slate-400" },
              ].map(({ key, label, color }) =>
                scenario.answerKey[key]?.length > 0 ? (
                  <div key={key}>
                    <p className={`mb-1 text-[11px] font-bold uppercase tracking-wide ${color}`}>{label}</p>
                    <ul className="space-y-0.5">
                      {scenario.answerKey[key].map((f: string, i: number) => (
                        <li key={i} className="text-xs text-slate-700">• {f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onRetry}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Try Another Scenario
      </button>
    </div>
  );
}

// --- Report Builder Section ---

function BuildFormField({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
      />
    </div>
  );
}

function BuildFormTextarea({
  label, value, onChange, placeholder, rows = 3,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 outline-none transition focus:border-blue-400 focus:bg-white"
      />
    </div>
  );
}

function BuildReportSection({
  form, setForm, result, loading, speaking, onGenerate, onSpeak, onStopSpeak, onReset,
}: {
  form: BuildForm;
  setForm: (f: BuildForm) => void;
  result: BuildResult | null;
  loading: boolean;
  speaking: boolean;
  onGenerate: () => void;
  onSpeak: () => void;
  onStopSpeak: () => void;
  onReset: () => void;
}) {
  function set(key: keyof BuildForm) {
    return (v: string) => setForm({ ...form, [key]: v });
  }

  if (result) {
    return (
      <div className="space-y-4">
        {/* Spoken report */}
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-blue-900">Lexi&apos;s SBAR Report</h2>
            <button
              onClick={speaking ? onStopSpeak : onSpeak}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                speaking
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-blue-900 text-white hover:bg-blue-800"
              }`}
            >
              {speaking ? (
                <><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" /> Stop</>
              ) : (
                <><span>🔊</span> Hear it spoken</>
              )}
            </button>
          </div>
          <div className="rounded-xl border border-blue-50 bg-blue-50 p-4">
            <p className="text-sm italic leading-6 text-blue-900">&ldquo;{result.spokenReport}&rdquo;</p>
          </div>
        </div>

        {/* SBAR breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">SBAR Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: "S — Situation", value: result.structuredSbar.situation, color: "border-red-100 bg-red-50 text-red-800" },
              { label: "B — Background", value: result.structuredSbar.background, color: "border-slate-100 bg-slate-50 text-slate-700" },
              { label: "A — Assessment", value: result.structuredSbar.assessment, color: "border-amber-100 bg-amber-50 text-amber-800" },
              { label: "R — Recommendation", value: result.structuredSbar.recommendation, color: "border-emerald-100 bg-emerald-50 text-emerald-800" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl border p-3 ${color}`}>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
                <p className="text-xs leading-5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety highlights */}
        {result.safetyHighlights.length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-red-700">Safety Highlights</h2>
            <p className="mb-2 text-xs text-slate-500">The incoming nurse absolutely cannot miss these:</p>
            <ul className="space-y-1">
              {result.safetyHighlights.map((h, i) => (
                <li key={i} className="text-xs font-semibold leading-5 text-red-800">⚠ {h}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Prioritization note */}
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-bold text-amber-700">Why It Was Structured This Way</h2>
          <p className="text-xs leading-5 text-slate-700">{result.prioritizationNotes}</p>
        </div>

        <button
          onClick={onReset}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          Build Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Patient basics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Patient Basics</h2>
        <div className="grid grid-cols-2 gap-3">
          <BuildFormField label="Patient Name" value={form.patientName} onChange={set("patientName")} placeholder="e.g. Maria G." />
          <BuildFormField label="Room" value={form.room} onChange={set("room")} placeholder="e.g. 412A" />
          <BuildFormField label="Age" value={form.age} onChange={set("age")} placeholder="e.g. 68" type="number" />
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sex</label>
            <select
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div className="col-span-2">
            <BuildFormField label="Admitting Diagnosis" value={form.diagnosis} onChange={set("diagnosis")} placeholder="e.g. COPD exacerbation" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Code Status</label>
            <select
              value={form.codeStatus}
              onChange={(e) => setForm({ ...form, codeStatus: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
            >
              <option>Full Code</option>
              <option>DNR</option>
              <option>DNR/DNI</option>
              <option>Comfort Care</option>
            </select>
          </div>
          <BuildFormField label="Allergies" value={form.allergies} onChange={set("allergies")} placeholder="e.g. Penicillin, Sulfa" />
        </div>
      </div>

      {/* Vital signs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Vital Signs</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BuildFormField label="BP" value={form.bp} onChange={set("bp")} placeholder="e.g. 148/92" />
          <BuildFormField label="HR" value={form.hr} onChange={set("hr")} placeholder="e.g. 98 bpm" />
          <BuildFormField label="RR" value={form.rr} onChange={set("rr")} placeholder="e.g. 20/min" />
          <BuildFormField label="SpO2" value={form.spo2} onChange={set("spo2")} placeholder="e.g. 94% on 2L NC" />
          <BuildFormField label="Temp" value={form.temp} onChange={set("temp")} placeholder="e.g. 38.2°C" />
          <BuildFormField label="Pain" value={form.pain} onChange={set("pain")} placeholder="e.g. 4/10 chest" />
        </div>
      </div>

      {/* Assessment */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Physical Assessment</h2>
        <div className="space-y-3">
          <BuildFormTextarea
            label="Assessment Findings"
            value={form.physicalAssessment}
            onChange={set("physicalAssessment")}
            placeholder="e.g. Lung sounds: diminished at bases bilaterally with mild crackles R lower lobe. Heart sounds S1/S2, no murmur. Abdomen soft, non-tender. Pedal edema 2+ bilateral. Alert and oriented x3. Skin warm, dry..."
            rows={5}
          />
          <BuildFormTextarea
            label="Current Medications"
            value={form.currentMeds}
            onChange={set("currentMeds")}
            placeholder="e.g. Albuterol neb q4h PRN, Prednisone 40mg PO daily, Lisinopril 10mg PO daily, Furosemide 40mg IV BID"
            rows={3}
          />
        </div>
      </div>

      {/* Shift events */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Shift Events &amp; Safety</h2>
        <div className="space-y-3">
          <BuildFormTextarea
            label="Events This Shift"
            value={form.shiftEvents}
            onChange={set("shiftEvents")}
            placeholder="e.g. SpO2 dropped to 88% at 1500, repositioned and increased O2 to 3L, recovered to 94%. Albuterol neb given x2 with moderate relief."
            rows={3}
          />
          <BuildFormTextarea
            label="Pending Items"
            value={form.pendingItems}
            onChange={set("pendingItems")}
            placeholder="e.g. Chest X-ray results pending (ordered at 1600), pulmonologist consult in AM, CBC drawn at 1800"
            rows={2}
          />
          <BuildFormTextarea
            label="Safety Notes"
            value={form.safetyNotes}
            onChange={set("safetyNotes")}
            placeholder="e.g. Fall risk Morse score 55 — bed alarm on. IV access: 20g R forearm patent. Isolation: none."
            rows={2}
          />
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading || (!form.physicalAssessment.trim() && !form.diagnosis.trim())}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? "Lexi is writing your report..." : "Generate SBAR Report"}
      </button>
      {!form.physicalAssessment.trim() && !form.diagnosis.trim() && (
        <p className="text-center text-xs text-slate-400">Add at least a diagnosis or physical assessment to generate.</p>
      )}
    </div>
  );
}
