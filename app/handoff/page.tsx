"use client";

import { useState, useRef, useCallback } from "react";
import Navbar from "../../components/Navbar";

type Mode = "give" | "receive" | "isbar";
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
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convRef = useRef<ConvMessage[]>([]);
  convRef.current = conversation;

  // --- helpers ---

  function appendMessage(msg: ConvMessage) {
    setConversation((prev) => [...prev, msg]);
  }

  async function speakText(text: string, onEnd: () => void): Promise<string | null> {
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
      setCurrentAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        onEnd();
      };
      audio.onerror = () => onEnd();
      audio.play().catch(() => onEnd());
      return url;
    } catch {
      onEnd();
      return null;
    }
  }

  async function generateInitialPersonaMessage(): Promise<string> {
    if (mode === "receive") {
      return (scenario?.reportText as string) || "";
    }
    if (mode === "give") {
      return (scenario?.nurseGreeting as string) || "Ready for report whenever you are.";
    }
    // isbar
    return (scenario?.doctorGreeting as string) || "Dr. speaking.";
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

  // --- start conversation ---

  async function startConversation() {
    setPhase("intro_loading");
    setConversation([]);
    setGradeResult(null);
    setShowAnswerKey(false);

    const initialText = await generateInitialPersonaMessage();
    if (!initialText) { setPhase("student_turn"); return; }

    const role: "nurse" | "doctor" = mode === "isbar" ? "doctor" : "nurse";
    setPhase("intro_speaking");
    const url = await speakText(initialText, () => {
      setPhase("student_turn");
    });
    appendMessage({ role, text: initialText, audioUrl: url || undefined });
  }

  // --- recording ---

  const startRecording = useCallback(async () => {
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
        await handleRecordingComplete(blob);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setPhase("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setErrorMsg("Microphone access denied. Please allow mic access and try again.");
    }
  }, [mode, scenario, conversation]); // eslint-disable-line react-hooks/exhaustive-deps

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }

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
        setErrorMsg("Nothing was transcribed. Please speak clearly and try again.");
        setPhase("student_turn");
        return;
      }

      const studentMsg: ConvMessage = { role: "student", text };
      setConversation((prev) => [...prev, studentMsg]);

      // get persona response
      setPhase("thinking");
      const currentHistory = [...convRef.current];
      const chatRes = await fetch("/api/handoff/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          scenario,
          history: currentHistory,
          studentMessage: text,
        }),
      });
      const chatData = await chatRes.json();

      if (!chatRes.ok || chatData.error) {
        setErrorMsg("Response generation failed. Try again.");
        setPhase("student_turn");
        return;
      }

      const personaRole: "nurse" | "doctor" = mode === "isbar" ? "doctor" : "nurse";
      const personaMsg: ConvMessage = { role: personaRole, text: chatData.response };

      if (chatData.isComplete) {
        setPhase("persona_speaking");
        const url = await speakText(chatData.response, () => setPhase("complete"));
        setConversation((prev) => [...prev, { ...personaMsg, audioUrl: url || undefined }]);
      } else {
        setPhase("persona_speaking");
        const url = await speakText(chatData.response, () => setPhase("student_turn"));
        setConversation((prev) => [...prev, { ...personaMsg, audioUrl: url || undefined }]);
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setPhase("student_turn");
    }
  }

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

  // --- reset ---

  function resetMode(newMode: Mode) {
    if (audioRef.current) audioRef.current.pause();
    setMode(newMode);
    setScenario(null);
    setConversation([]);
    setGradeResult(null);
    setPhase("idle");
    setErrorMsg("");
    setCurrentAudioUrl(null);
  }

  const isLoading = phase === "loading_scenario";
  const isBusy = ["intro_loading", "intro_speaking", "transcribing", "thinking", "persona_speaking", "grading"].includes(phase);
  const personaName = mode === "isbar"
    ? (scenario?.doctorName as string) || "Dr."
    : mode === "receive"
    ? "Night Nurse"
    : "Charge Nurse";

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
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(["give", "receive", "isbar"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => resetMode(m)}
                disabled={isBusy}
                className={`rounded-xl py-2.5 text-xs font-bold transition ${
                  mode === m
                    ? "bg-blue-900 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {m === "give" ? "Give Report" : m === "receive" ? "Receive Report" : "ISBAR to Doctor"}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs text-slate-500">
            {mode === "give"
              ? "Read the patient chart, then speak your SBAR handoff to your relief nurse. She may ask follow-up questions."
              : mode === "receive"
              ? "Listen to the night nurse's handoff. Ask any follow-up questions you have — then Lexi grades what you caught and what you missed."
              : "Read the patient situation, then call the attending physician and deliver your ISBAR. The doctor will ask questions."}
          </p>

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

          <button
            onClick={generateScenario}
            disabled={isLoading || isBusy}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {isLoading ? "Generating..." : scenario ? "Generate New Scenario" : "Generate Scenario"}
          </button>
          {errorMsg && <p className="mt-2 text-xs text-red-600">{errorMsg}</p>}
        </div>

        {/* Patient Chart — give / isbar */}
        {scenario && (mode === "give" || mode === "isbar") && phase !== "graded" && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-blue-900">
                {mode === "isbar" ? "Patient Situation" : "Patient Chart"}
              </h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {scenario.setting}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {scenario.context}
              </span>
            </div>

            {/* Critical Alert — give mode */}
            {mode === "give" && scenario.criticalAlert && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-red-600">Critical Alert</p>
                <p className="mt-0.5 text-sm text-red-800">{scenario.criticalAlert}</p>
              </div>
            )}

            {/* ISBAR situation */}
            {mode === "isbar" && (
              <>
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Situation — Why You&apos;re Calling</p>
                  <p className="mt-0.5 text-sm text-amber-900">{scenario.situation}</p>
                </div>
                <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Background</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-700">{scenario.background}</p>
                </div>
                {scenario.nursingActionsTaken && (
                  <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Nursing Actions Already Taken</p>
                    <p className="mt-0.5 text-xs leading-5 text-blue-800">{scenario.nursingActionsTaken}</p>
                  </div>
                )}
              </>
            )}

            {/* Patient info grid */}
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoCell label="Patient" value={scenario.patient?.name ?? "—"} />
              <InfoCell label="Age / Sex" value={`${scenario.patient?.age ?? "—"}y ${scenario.patient?.sex ?? ""}`} />
              <InfoCell label="Room" value={scenario.patient?.room ?? "—"} />
              <InfoCell label="Diagnosis" value={scenario.patient?.admittingDiagnosis ?? "—"} />
              <InfoCell label="Code" value={scenario.patient?.code ?? "—"} />
              <InfoCell
                label="Allergies"
                value={scenario.patient?.allergies ?? "—"}
                highlight={
                  scenario.patient?.allergies &&
                  scenario.patient.allergies !== "None known" &&
                  scenario.patient.allergies !== "NKDA"
                }
              />
            </div>

            {/* Vitals */}
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

            {/* Meds */}
            {(scenario.currentMeds ?? scenario.relevantMeds)?.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {mode === "isbar" ? "Relevant Medications" : "Current Medications"}
                </p>
                <ul className="space-y-0.5">
                  {(scenario.currentMeds ?? scenario.relevantMeds).map((m: string, i: number) => (
                    <li key={i} className="text-xs text-slate-700">• {m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ISBAR labs */}
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

            {/* Give mode extras */}
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

        {/* Receive mode: patient summary (chart hidden — student must listen) */}
        {scenario && mode === "receive" && phase === "ready" && (
          <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-blue-900">Ready to receive report</p>
            <p className="mt-1 text-xs text-slate-500">
              Hit Start below. The night nurse will speak her handoff report to you. Listen carefully — you won&apos;t see the report text. Take notes if you want, then ask any follow-up questions you have.
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{scenario.patientSummary}</p>
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
              {mode === "give"
                ? "Start — Your relief nurse is ready for report"
                : mode === "receive"
                ? "Start — Listen to the night nurse's report"
                : "Start — Call the physician"}
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

            {/* Status indicators */}
            {phase === "intro_loading" && <StatusPill text="Connecting..." />}
            {phase === "intro_speaking" && <StatusPill text={`${PERSONA_LABEL[mode]} is speaking...`} pulse />}
            {phase === "transcribing" && <StatusPill text="Transcribing your voice..." />}
            {phase === "thinking" && <StatusPill text={`${PERSONA_LABEL[mode]} is responding...`} />}
            {phase === "persona_speaking" && <StatusPill text={`${PERSONA_LABEL[mode]} is speaking...`} pulse />}
            {phase === "grading" && <StatusPill text="Lexi is grading your interaction..." />}
          </div>
        )}

        {/* Recording controls */}
        {(phase === "student_turn" || phase === "recording") && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-center text-sm font-semibold text-slate-700">
              {mode === "give"
                ? phase === "recording" ? "Recording your report..." : "Speak your SBAR handoff report"
                : mode === "receive"
                ? phase === "recording" ? "Recording your response..." : "Ask a follow-up question or give your assessment"
                : phase === "recording" ? "Recording your ISBAR..." : "Deliver your ISBAR to the physician"}
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
                  <span className="text-2xl">⏹</span>
                ) : (
                  <span className="text-2xl">🎙</span>
                )}
              </button>
            </div>
            {phase === "recording" && (
              <p className="mt-3 text-center text-xs text-slate-500">
                {recordingSeconds}s — tap to stop
              </p>
            )}
            {phase === "student_turn" && (
              <p className="mt-3 text-center text-xs text-slate-400">
                Tap the mic to speak. Tap again to stop.
              </p>
            )}
          </div>
        )}

        {/* End & Grade button */}
        {phase === "complete" && !gradeResult && (
          <div className="mb-5 space-y-2">
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
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          isStudent ? "bg-orange-500" : msg.role === "doctor" ? "bg-slate-700" : "bg-blue-700"
        }`}
      >
        {isStudent ? "You" : msg.role === "doctor" ? "Dr" : "RN"}
      </div>
      <div className={`max-w-[80%] space-y-1 ${isStudent ? "items-end" : "items-start"} flex flex-col`}>
        <p className={`text-[10px] font-semibold text-slate-400 ${isStudent ? "text-right" : ""}`}>
          {isStudent ? "You" : personaName}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            isStudent
              ? "rounded-tr-sm bg-orange-50 text-slate-800"
              : "rounded-tl-sm bg-blue-50 text-slate-800"
          }`}
        >
          {msg.text}
        </div>
        {onReplay && (
          <button
            onClick={onReplay}
            className="text-[10px] text-slate-400 hover:text-blue-600 transition"
          >
            ▶ replay
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ text, pulse = false }: { text: string; pulse?: boolean }) {
  return (
    <div className={`flex justify-center ${pulse ? "animate-pulse" : ""}`}>
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
}: {
  result: GradeResult;
  mode: Mode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenario: Record<string, any> | null;
  showAnswerKey: boolean;
  setShowAnswerKey: (v: boolean) => void;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Score card */}
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
                : "Major gaps — review critical misses"}
            </p>
          </div>
        </div>
      </div>

      {/* Dimension bars */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">Score Breakdown</h2>
        <div className="space-y-5">
          {Object.entries(result.dimensions).map(([key, dim]) => (
            <DimensionBar
              key={key}
              label={DIMENSION_LABELS[key] ?? key}
              score={dim.score}
              max={dim.max}
              feedback={dim.feedback}
            />
          ))}
        </div>
      </div>

      {/* Misses + Strengths */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(result.criticalMisses ?? []).length > 0 && (
          <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-red-700">Critical Misses</h2>
            <ul className="space-y-1">
              {result.criticalMisses!.map((m, i) => (
                <li key={i} className="text-xs leading-5 text-slate-700">• {m}</li>
              ))}
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

      {/* Questions / follow-up */}
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

      {/* Model priorities */}
      {(result.modelPriorities ?? []).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold">Shift Priorities</h2>
          <ol className="space-y-1">
            {result.modelPriorities!.map((p, i) => (
              <li key={i} className="text-xs leading-5 text-slate-700">{i + 1}. {p}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Coaching + model snippet */}
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-blue-900">Lexi&apos;s Coaching</h2>
        <p className="mb-4 text-sm leading-6 text-slate-700">{result.coachingNote}</p>
        {(result.modelSnippet || result.modelIsbarSnippet) && (
          <>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {result.modelIsbarSnippet ? "How your ISBAR should have sounded" : "How the critical section should have sounded"}
            </p>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-sm italic leading-6 text-blue-800">
                &ldquo;{result.modelSnippet ?? result.modelIsbarSnippet}&rdquo;
              </p>
            </div>
          </>
        )}
      </div>

      {/* Receive mode answer key */}
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
