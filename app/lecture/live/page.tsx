"use client";

import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import { useEffect, useMemo, useRef, useState } from "react";

type CompanionPrompt = {
  promptType: string;
  promptText: string;
  promptContext: string;
};

type LiveChunk = {
  id: string;
  chunk_index: number;
  original_filename: string | null;
  transcript: string | null;
  key_points: string[] | null;
  companion_prompts: CompanionPrompt[] | null;
  suggested_question: string | null;
  created_at: string;
};

function companionLabel(type: string) {
  if (type === "question_to_ask") return "Question to ask";
  if (type === "clarify_this") return "Clarify this";
  if (type === "class_contribution") return "Class contribution";
  if (type === "nclex_angle") return "NCLEX angle";
  if (type === "conversation_starter") return "Conversation starter";
  return "Lecture prompt";
}

function companionColor(type: string) {
  if (type === "question_to_ask") return "bg-blue-100 text-blue-800 border-blue-200";
  if (type === "clarify_this") return "bg-orange-100 text-orange-800 border-orange-200";
  if (type === "class_contribution") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (type === "nclex_angle") return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return "";
}

function choosePriorityPrompt(chunk: LiveChunk | null): CompanionPrompt | null {
  if (!chunk?.companion_prompts || chunk.companion_prompts.length === 0) {
    if (chunk?.suggested_question) {
      return {
        promptType: "question_to_ask",
        promptText: chunk.suggested_question,
        promptContext: "Lexi thinks this is the best live question to ask right now.",
      };
    }
    return null;
  }

  const prompts = chunk.companion_prompts;
  const priorityOrder = [
    "question_to_ask",
    "clarify_this",
    "class_contribution",
    "nclex_angle",
    "conversation_starter",
  ];

  for (const type of priorityOrder) {
    const found = prompts.find((p) => p.promptType === type);
    if (found) return found;
  }

  return prompts[0] || null;
}

function buildParticipationPack(chunk: LiveChunk | null) {
  if (!chunk) {
    return {
      safeAnswer: "Lexi is waiting for enough lecture context to build a safe answer.",
      sharperFollowUp: "Once Lexi hears more, a sharper follow-up will appear here.",
      classContribution: "A natural class contribution line will appear here.",
    };
  }

  const keyPoints = chunk.key_points || [];
  const prompts = chunk.companion_prompts || [];

  const classContributionPrompt =
    prompts.find((p) => p.promptType === "class_contribution") ||
    prompts.find((p) => p.promptType === "conversation_starter");

  const clarifyPrompt =
    prompts.find((p) => p.promptType === "clarify_this") ||
    prompts.find((p) => p.promptType === "question_to_ask");

  const safeAnswer =
    keyPoints[0] ||
    chunk.suggested_question ||
    "Based on what Lexi has heard so far, the main concept is still forming.";

  const sharperFollowUp =
    clarifyPrompt?.promptText ||
    chunk.suggested_question ||
    "What would be the highest-yield follow-up question for this concept?";

  const classContribution =
    classContributionPrompt?.promptText ||
    (keyPoints[1]
      ? `One connection I’m noticing is that ${keyPoints[1].charAt(0).toLowerCase()}${keyPoints[1].slice(1)}`
      : "It sounds like this concept matters because it directly affects clinical prioritization.");

  return {
    safeAnswer,
    sharperFollowUp,
    classContribution,
  };
}

export default function LiveLecturePage() {
  const [title, setTitle] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<LiveChunk[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [recordingSupported, setRecordingSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [autoMode, setAutoMode] = useState(false);
  const [chunkDurationSeconds, setChunkDurationSeconds] = useState(20);

  const [floatingPromptVisible, setFloatingPromptVisible] = useState(true);
  const [lastAnnouncedChunkId, setLastAnnouncedChunkId] = useState<string | null>(null);

  const [pinnedQuestionText, setPinnedQuestionText] = useState("");
  const [pinnedQuestionContext, setPinnedQuestionContext] = useState("");
  const [pinnedQuestionChunkId, setPinnedQuestionChunkId] = useState<string | null>(null);
  const [questionLocked, setQuestionLocked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const isAutoModeRef = useRef(false);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined";

    setRecordingSupported(supported);
  }, []);

  useEffect(() => {
    isAutoModeRef.current = autoMode;
  }, [autoMode]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      stopAutoCapture();
      stopTracks();
      clearRecordingTimer();
      clearStopTimeout();
    };
  }, []);

  useEffect(() => {
    if (sessionId) {
      refreshSession(sessionId);
    }
  }, [sessionId]);

  const latestChunk = useMemo(() => {
    if (chunks.length === 0) return null;
    return chunks[chunks.length - 1];
  }, [chunks]);

  const latestPriorityPrompt = useMemo(() => {
    return choosePriorityPrompt(latestChunk);
  }, [latestChunk]);

  const participationPack = useMemo(() => {
    return buildParticipationPack(latestChunk);
  }, [latestChunk]);

  useEffect(() => {
    if (!latestChunk) return;

    if (latestChunk.id !== lastAnnouncedChunkId) {
      setFloatingPromptVisible(true);
      setLastAnnouncedChunkId(latestChunk.id);
    }
  }, [latestChunk, lastAnnouncedChunkId]);

  useEffect(() => {
    if (!latestChunk || !latestPriorityPrompt) return;
    if (questionLocked) return;

    setPinnedQuestionText(latestPriorityPrompt.promptText);
    setPinnedQuestionContext(latestPriorityPrompt.promptContext);
    setPinnedQuestionChunkId(latestChunk.id);
  }, [latestChunk, latestPriorityPrompt, questionLocked]);

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function clearStopTimeout() {
    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }

  function stopTracks() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }

  function jumpToLatestChunk() {
    if (!latestChunk) return;
    const el = document.getElementById(`chunk-${latestChunk.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function jumpToPinnedChunk() {
    if (!pinnedQuestionChunkId) return;
    const el = document.getElementById(`chunk-${pinnedQuestionChunkId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function useLatestLiveQuestion() {
    if (!latestChunk || !latestPriorityPrompt) return;
    setPinnedQuestionText(latestPriorityPrompt.promptText);
    setPinnedQuestionContext(latestPriorityPrompt.promptContext);
    setPinnedQuestionChunkId(latestChunk.id);
    setQuestionLocked(false);
  }

  async function startSession() {
    setStarting(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setStarting(false);
        return;
      }

      const res = await fetch("/api/live-lecture/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          title: title || "Live Lecture Session",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start session.");
        setStarting(false);
        return;
      }

      setSessionId(data.id);
      setChunks([]);
      setLastAnnouncedChunkId(null);
      setFloatingPromptVisible(true);
      setPinnedQuestionText("");
      setPinnedQuestionContext("");
      setPinnedQuestionChunkId(null);
      setQuestionLocked(false);
    } catch {
      setError("Failed to connect to the server.");
    }

    setStarting(false);
  }

  async function refreshSession(targetSessionId?: string) {
    const id = targetSessionId || sessionId;
    if (!id) return;

    setRefreshing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRefreshing(false);
        return;
      }

      const res = await fetch("/api/live-lecture/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          sessionId: id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setChunks(data.chunks || []);
      }
    } catch {
      // ignore silently
    }

    if (!isUnmountedRef.current) {
      setRefreshing(false);
    }
  }

  async function uploadChunk(fileOverride?: File) {
    const fileToUpload = fileOverride || audioFile;

    if (!fileToUpload || !sessionId) {
      setError("Start a live lecture session and choose an audio clip first.");
      return false;
    }

    setProcessing(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setProcessing(false);
        return false;
      }

      const formData = new FormData();
      formData.append("audio", fileToUpload);
      formData.append("userId", user.id);
      formData.append("sessionId", sessionId);

      const res = await fetch("/api/live-lecture/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process chunk.");
        setProcessing(false);
        return false;
      }

      setAudioFile(null);
      await refreshSession(sessionId);
      setProcessing(false);
      return true;
    } catch {
      setError("Failed to connect to the server.");
      setProcessing(false);
      return false;
    }
  }

  async function beginRecordingCycle() {
    if (!recordingSupported) {
      setError("This browser does not support microphone recording here.");
      return;
    }

    if (!sessionId) {
      setError("Start a live lecture session first.");
      return;
    }

    if (processing || isRecording) {
      return;
    }

    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearRecordingTimer();
        clearStopTimeout();
        setIsRecording(false);

        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const extension = blobType.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(recordedChunksRef.current, { type: blobType });

        stopTracks();
        setRecordingSeconds(0);

        if (blob.size === 0) {
          if (isAutoModeRef.current) {
            window.setTimeout(() => {
              if (isAutoModeRef.current) {
                beginRecordingCycle();
              }
            }, 800);
          }
          return;
        }

        const file = new File([blob], `live-lecture-chunk-${Date.now()}.${extension}`, {
          type: blobType,
        });

        setAudioFile(file);
        const success = await uploadChunk(file);

        if (success && isAutoModeRef.current && !isUnmountedRef.current) {
          window.setTimeout(() => {
            if (isAutoModeRef.current) {
              beginRecordingCycle();
            }
          }, 1200);
        }
      };

      recorder.start();
      setRecordingSeconds(0);
      setIsRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      stopTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }, chunkDurationSeconds * 1000);
    } catch {
      stopTracks();
      clearRecordingTimer();
      clearStopTimeout();
      setIsRecording(false);
      setError("Microphone permission was denied or recording failed to start.");
      setAutoMode(false);
    }
  }

  function stopCurrentRecording() {
    clearStopTimeout();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      return;
    }

    setIsRecording(false);
    stopTracks();
    clearRecordingTimer();
  }

  async function startManualRecording() {
    setAutoMode(false);
    await beginRecordingCycle();
  }

  function stopManualRecording() {
    stopCurrentRecording();
  }

  async function startAutoCapture() {
    if (!sessionId) {
      setError("Start a live lecture session first.");
      return;
    }

    setAutoMode(true);
    await beginRecordingCycle();
  }

  function stopAutoCapture() {
    setAutoMode(false);
    isAutoModeRef.current = false;
    clearStopTimeout();

    if (isRecording) {
      stopCurrentRecording();
    } else {
      stopTracks();
      clearRecordingTimer();
      setRecordingSeconds(0);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      {sessionId && pinnedQuestionText && (
        <div className="sticky top-[76px] z-40 border-b border-fuchsia-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-fuchsia-200 bg-white px-3 py-1 text-xs font-semibold text-fuchsia-700">
                      Pinned Teacher Question
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        questionLocked ? "bg-slate-900 text-white" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {questionLocked ? "Locked" : "Live updating"}
                    </span>
                  </div>

                  <p className="font-semibold leading-7 text-slate-900">{pinnedQuestionText}</p>

                  {pinnedQuestionContext && (
                    <p className="mt-2 text-sm leading-7 text-slate-600">{pinnedQuestionContext}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyText(pinnedQuestionText)}
                    className="rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Copy Question
                  </button>

                  <button
                    onClick={jumpToPinnedChunk}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Jump to Source
                  </button>

                  <button
                    onClick={() => setQuestionLocked((prev) => !prev)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    {questionLocked ? "Unlock Live Updates" : "Lock This Question"}
                  </button>

                  <button
                    onClick={useLatestLiveQuestion}
                    className="rounded-2xl border border-fuchsia-300 bg-white px-4 py-2.5 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50"
                  >
                    Use Latest Recommendation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionId && latestChunk && latestPriorityPrompt && floatingPromptVisible && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[60] max-w-md">
          <div className="pointer-events-auto rounded-3xl border border-amber-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  New live side quest
                </div>
                <p className="text-sm text-slate-500">From clip {latestChunk.chunk_index}</p>
              </div>

              <button
                onClick={() => setFloatingPromptVisible(false)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>

            <div className="mb-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${companionColor(
                  latestPriorityPrompt.promptType
                )}`}
              >
                {companionLabel(latestPriorityPrompt.promptType)}
              </span>
            </div>

            <p className="font-semibold leading-7 text-slate-900">{latestPriorityPrompt.promptText}</p>

            <p className="mt-3 text-sm leading-7 text-slate-600">{latestPriorityPrompt.promptContext}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={jumpToLatestChunk}
                className="rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Jump to latest clip
              </button>

              <button
                onClick={() => copyText(latestPriorityPrompt.promptText)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Copy prompt
              </button>

              <button
                onClick={() => {
                  setPinnedQuestionText(latestPriorityPrompt.promptText);
                  setPinnedQuestionContext(latestPriorityPrompt.promptContext);
                  setPinnedQuestionChunkId(latestChunk.id);
                  setQuestionLocked(true);
                }}
                className="rounded-2xl border border-fuchsia-300 bg-white px-4 py-2.5 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50"
              >
                Pin this question
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-4 py-1 text-sm font-medium text-amber-800">
              Live Lecture Mode v0
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Lexi Live Lecture Companion
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-slate-600">
              Record short rolling class clips and let Lexi surface questions, clarifications,
              NCLEX angles, and real-time classroom prompts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/lecture"
              className="rounded-2xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-900 transition hover:bg-blue-50"
            >
              Back to Lecture Mode
            </a>
            <a
              href="/dashboard"
              className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Dashboard
            </a>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Start Live Session</h2>
              <p className="mt-2 text-sm text-slate-500">Create a session for your class before recording.</p>

              <div className="mt-6 space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Med-Surg Tuesday Lecture"
                  className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500"
                />

                <button
                  onClick={startSession}
                  disabled={starting}
                  className="w-full rounded-2xl bg-blue-900 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {starting ? "Starting..." : "Start Live Lecture Session"}
                </button>

                {sessionId && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    Live session started.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Live Capture Controls</h2>
              <p className="mt-2 text-sm text-slate-500">
                Use auto-capture for rolling classroom chunks, or manual mode for one clip at a time.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Chunk length</label>
                  <select
                    value={chunkDurationSeconds}
                    onChange={(e) => setChunkDurationSeconds(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900"
                    disabled={isRecording || processing}
                  >
                    <option value={15}>15 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Status</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        autoMode ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {autoMode ? "Auto capture on" : "Auto capture off"}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        isRecording ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isRecording ? "● Recording" : "Mic idle"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                      {recordingSeconds}s
                    </span>
                  </div>

                  {!recordingSupported && (
                    <p className="mt-3 text-sm text-orange-700">
                      In-browser recording is not supported here. Manual file upload still works below.
                    </p>
                  )}
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={startAutoCapture}
                    disabled={!recordingSupported || !sessionId || autoMode || isRecording || processing}
                    className="w-full rounded-2xl bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                  >
                    Start Auto Capture
                  </button>

                  <button
                    onClick={stopAutoCapture}
                    disabled={!autoMode && !isRecording}
                    className="w-full rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    Stop Auto Capture
                  </button>

                  <button
                    onClick={startManualRecording}
                    disabled={!recordingSupported || !sessionId || autoMode || isRecording || processing}
                    className="w-full rounded-2xl bg-blue-900 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    Start One Manual Recording
                  </button>

                  <button
                    onClick={stopManualRecording}
                    disabled={!isRecording || autoMode}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Stop Manual Recording
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Manual Audio Upload</h2>
              <p className="mt-2 text-sm text-slate-500">Still useful if you recorded a clip somewhere else.</p>

              <div className="mt-6 space-y-4">
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900"
                  disabled={isRecording}
                />

                {audioFile && <p className="text-sm text-slate-600">Loaded: {audioFile.name}</p>}

                <button
                  onClick={() => uploadChunk()}
                  disabled={processing || !audioFile || !sessionId || isRecording}
                  className="w-full rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {processing ? "Processing clip..." : "Upload Manual Clip"}
                </button>

                <button
                  onClick={() => refreshSession()}
                  disabled={refreshing || !sessionId}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  {refreshing ? "Refreshing..." : "Refresh Feed"}
                </button>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
                {error}
              </div>
            )}

            {sessionId && (
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl">
                <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Participation Mode
                </div>
                <h2 className="text-2xl font-bold">Cold Call Shield</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Lexi’s safest live response, sharper follow-up, and natural contribution line based on the latest class chunk.
                </p>

                <div className="mt-6 grid gap-4 xl:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                      Safe answer if called on
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-800">{participationPack.safeAnswer}</p>
                    <button
                      onClick={() => copyText(participationPack.safeAnswer)}
                      className="mt-4 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                    >
                      Copy safe answer
                    </button>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
                      Smarter follow-up
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-800">{participationPack.sharperFollowUp}</p>
                    <button
                      onClick={() => copyText(participationPack.sharperFollowUp)}
                      className="mt-4 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-100"
                    >
                      Copy follow-up
                    </button>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Natural class contribution
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-800">{participationPack.classContribution}</p>
                    <button
                      onClick={() => copyText(participationPack.classContribution)}
                      className="mt-4 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Copy contribution
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!sessionId && (
              <div className="rounded-3xl border border-blue-100 bg-white p-12 shadow-2xl">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                    🎧
                  </div>
                  <h2 className="text-2xl font-bold">Ready for live lecture mode?</h2>
                  <p className="mt-3 text-slate-600">
                    Start a session, then let Lexi record chunk after chunk automatically.
                  </p>
                </div>
              </div>
            )}

            {sessionId && chunks.length === 0 && (
              <div className="rounded-3xl border border-blue-100 bg-white p-12 shadow-2xl">
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className="text-2xl font-bold">Session is live</h2>
                  <p className="mt-3 text-slate-600">
                    Start auto capture or upload your first class clip and Lexi will begin building prompts.
                  </p>
                </div>
              </div>
            )}

            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                id={`chunk-${chunk.id}`}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                      Clip {chunk.chunk_index}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {chunk.original_filename || "Live audio"}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500">
                    {new Date(chunk.created_at).toLocaleTimeString()}
                  </span>
                </div>

                {chunk.suggested_question && (
                  <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Best question to ask right now
                    </p>
                    <p className="mt-2 font-semibold leading-7 text-slate-900">{chunk.suggested_question}</p>
                  </div>
                )}

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold text-slate-900">Transcript</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{chunk.transcript || "No transcript"}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold text-slate-900">Key points</h3>
                    <div className="mt-3 space-y-2">
                      {(chunk.key_points || []).map((point, index) => (
                        <div key={index} className="text-sm leading-7 text-slate-700">
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {(chunk.companion_prompts || []).map((prompt, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${companionColor(
                            prompt.promptType
                          )}`}
                        >
                          {companionLabel(prompt.promptType)}
                        </span>

                        <button
                          onClick={() => {
                            setPinnedQuestionText(prompt.promptText);
                            setPinnedQuestionContext(prompt.promptContext);
                            setPinnedQuestionChunkId(chunk.id);
                            setQuestionLocked(true);
                          }}
                          className="rounded-xl border border-fuchsia-300 bg-white px-3 py-1 text-xs font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50"
                        >
                          Pin to top
                        </button>
                      </div>

                      <p className="font-semibold leading-7 text-slate-900">{prompt.promptText}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{prompt.promptContext}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}