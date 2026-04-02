"use client";

import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AccessResponse = {
  loggedIn: boolean;
  accessLevel: string;
  plan: string | null;
  status: string;
  endsAt?: string | null;
  features: {
    quiz: boolean;
    lexi: boolean;
    history: boolean;
    study: boolean;
    dashboard: boolean;
    dashboardAdvanced?: boolean;
    weakAreas: boolean;
    weakAreasAdvanced?: boolean;
    lecture: boolean;
    liveFull: boolean;
    catExam: boolean;
  };
};

type LiveAnalysisPrompt = {
  promptType: string;
  promptText: string;
  promptContext: string;
};

type ProfessorEmphasis = {
  detected: boolean;
  headline: string;
  emphasizedPoint: string;
  whyLexiFlaggedIt: string;
  studentAction: string;
  confidence: number;
};

type TopicShift = {
  shiftDetected: boolean;
  previousTopic: string;
  currentTopic: string;
  confidence: number;
  reason: string;
  examRelevance: string;
};

type ExamNugget = {
  label: string;
  whyItMatters: string;
  studentUse: string;
  confidence: number;
};

type AnalyzerEvent = {
  event_type: string;
  label: string;
  description: string;
  confidence: number;
};

type LiveAnalysisResponse = {
  heading?: string;
  cleanedTranscript?: string;
  summary: string;
  keyPoints: string[];
  bestQuestion: string;
  safeAnswer: string;
  sharperFollowUp: string;
  classContribution: string;
  topicShift?: TopicShift;
  examNuggets?: ExamNugget[];
  professorEmphasis?: ProfessorEmphasis;
  prompts: LiveAnalysisPrompt[];
  events?: AnalyzerEvent[];
};

type LiveHudPayload = {
  sessionId: string | null;
  listening: boolean;
  secondsLive: number;
  fullTranscript: string;
  liveText: string;
  analysis: LiveAnalysisResponse | null;
  updatedAt: number;
};

type RecorderMimeInfo = {
  mimeType: string;
  extension: string;
};

const TRANSCRIBE_INTERVAL_MS = 20000;
const ANALYZE_INTERVAL_MS = 12000;
const MIN_ANALYZE_CHARS = 140;

function promptColor(type: string) {
  if (type === "question_to_ask") return "bg-blue-100 text-blue-800 border-blue-200";
  if (type === "clarify_this") return "bg-orange-100 text-orange-800 border-orange-200";
  if (type === "class_contribution") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (type === "nclex_angle") return "bg-purple-100 text-purple-800 border-purple-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function promptLabel(type: string) {
  if (type === "question_to_ask") return "Question to ask";
  if (type === "clarify_this") return "Clarify this";
  if (type === "class_contribution") return "Class contribution";
  if (type === "nclex_angle") return "NCLEX angle";
  if (type === "conversation_starter") return "Conversation starter";
  return "Live prompt";
}

function nuggetColor(confidence: number) {
  if (confidence >= 85) return "bg-red-100 text-red-700 border-red-200";
  if (confidence >= 70) return "bg-orange-100 text-orange-700 border-orange-200";
  if (confidence >= 50) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function shiftBadgeColor(confidence: number) {
  if (confidence >= 85) return "bg-red-100 text-red-700";
  if (confidence >= 70) return "bg-orange-100 text-orange-700";
  if (confidence >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function emphasisColor(confidence: number) {
  if (confidence >= 85) return "bg-red-100 text-red-700 border-red-200";
  if (confidence >= 70) return "bg-orange-100 text-orange-700 border-orange-200";
  if (confidence >= 50) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function secondsToClock(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function canUseMediaRecorder() {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

function getSupportedRecorderMime(): RecorderMimeInfo | null {
  if (
    typeof window === "undefined" ||
    typeof window.MediaRecorder === "undefined" ||
    typeof window.MediaRecorder.isTypeSupported !== "function"
  ) {
    return null;
  }

  const candidates: RecorderMimeInfo[] = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/mp4", extension: "mp4" },
    { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  ];

  for (const candidate of candidates) {
    if (window.MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return null;
}

function isMp4ChunkMode(mimeInfo: RecorderMimeInfo | null) {
  if (!mimeInfo) return false;
  return mimeInfo.extension === "mp4" || mimeInfo.mimeType.includes("mp4");
}

export default function LiveFullLecturePage() {
  const [title, setTitle] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [supported, setSupported] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [listening, setListening] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [error, setError] = useState("");

  const [fullTranscript, setFullTranscript] = useState("");
  const [liveText, setLiveText] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analysis, setAnalysis] = useState<LiveAnalysisResponse | null>(null);
  const [secondsLive, setSecondsLive] = useState(0);
  const [showShiftPulse, setShowShiftPulse] = useState(false);

  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const analyzeIntervalRef = useRef<number | null>(null);
  const requestChunkIntervalRef = useRef<number | null>(null);

  const mountedRef = useRef(true);
  const lastShiftSignatureRef = useRef("");
  const chunkIndexRef = useRef(0);
  const lastSavedTranscriptLengthRef = useRef(0);
  const analysisInFlightRef = useRef(false);
  const transcribeInFlightRef = useRef(false);
  const isStoppingRef = useRef(false);

  const sessionIdRef = useRef<string | null>(null);
  const fullTranscriptRef = useRef("");
  const secondsLiveRef = useRef(0);
  const autoAnalyzeRef = useRef(true);

  const pendingAudioChunksRef = useRef<Blob[]>([]);
  const currentMimeInfoRef = useRef<RecorderMimeInfo | null>(null);
  const mp4ChunkModeRef = useRef(false);

  const canUseLiveFull = !!access?.features?.liveFull;

  const requireLiveFullAccess = useCallback(() => {
    if (!canUseLiveFull) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  }, [canUseLiveFull]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    fullTranscriptRef.current = fullTranscript;
  }, [fullTranscript]);

  useEffect(() => {
    secondsLiveRef.current = secondsLive;
  }, [secondsLive]);

  useEffect(() => {
    autoAnalyzeRef.current = autoAnalyze;
  }, [autoAnalyze]);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const res = await fetch("/api/access/me", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user?.id || null }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setAccess(null);
          setAccessLoading(false);
          return;
        }

        setAccess(data);
        setAccessLoading(false);
      } catch {
        if (!isMounted) return;
        setAccess(null);
        setAccessLoading(false);
      }
    }

    void checkAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSupported(canUseMediaRecorder() && !!getSupportedRecorderMime());

    return () => {
      mountedRef.current = false;

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (analyzeIntervalRef.current) {
        window.clearInterval(analyzeIntervalRef.current);
        analyzeIntervalRef.current = null;
      }

      if (requestChunkIntervalRef.current) {
        window.clearInterval(requestChunkIntervalRef.current);
        requestChunkIntervalRef.current = null;
      }

      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        //
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hudPayload: LiveHudPayload = {
      sessionId,
      listening,
      secondsLive,
      fullTranscript,
      liveText,
      analysis,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem("lexi-live-hud", JSON.stringify(hudPayload));
    window.localStorage.setItem("lexi-live-analysis", JSON.stringify(analysis));
  }, [sessionId, listening, secondsLive, fullTranscript, liveText, analysis]);

  const combinedTranscript = useMemo(() => {
    return fullTranscript.trim();
  }, [fullTranscript]);

  useEffect(() => {
    const shift = analysis?.topicShift;
    if (!shift?.shiftDetected) return;

    const signature = `${shift.previousTopic}__${shift.currentTopic}__${shift.reason}`;
    if (signature !== lastShiftSignatureRef.current) {
      lastShiftSignatureRef.current = signature;
      setShowShiftPulse(true);

      const timeout = window.setTimeout(() => {
        setShowShiftPulse(false);
      }, 3500);

      return () => window.clearTimeout(timeout);
    }
  }, [analysis]);

  const getCurrentTranscript = useCallback(() => {
    return fullTranscriptRef.current.trim();
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;

    timerRef.current = window.setInterval(() => {
      setSecondsLive((prev) => {
        const next = prev + 1;
        secondsLiveRef.current = next;
        return next;
      });
    }, 1000);
  }, []);

  const stopAnalyzeLoop = useCallback(() => {
    if (analyzeIntervalRef.current) {
      window.clearInterval(analyzeIntervalRef.current);
      analyzeIntervalRef.current = null;
    }
  }, []);

  const clearRequestChunkLoop = useCallback(() => {
    if (requestChunkIntervalRef.current) {
      window.clearInterval(requestChunkIntervalRef.current);
      requestChunkIntervalRef.current = null;
    }
  }, []);

  const saveLiveLectureChunk = useCallback(
    async ({
      sessionId,
      chunkIndex,
      startedAtSeconds,
      endedAtSeconds,
      heading,
      body,
      events,
    }: {
      sessionId: string;
      chunkIndex: number;
      startedAtSeconds: number;
      endedAtSeconds: number;
      heading: string;
      body: string;
      events: {
        event_type: string;
        label?: string;
        description?: string;
        confidence?: number;
        started_at_seconds?: number;
        ended_at_seconds?: number;
        transcript_chunk_index?: number;
      }[];
    }) => {
      const res = await fetch("/api/lecture-save-timeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          chunks: [
            {
              chunk_index: chunkIndex,
              started_at_seconds: startedAtSeconds,
              ended_at_seconds: endedAtSeconds,
              heading,
              body,
            },
          ],
          events: events.map((event) => ({
            ...event,
            transcript_chunk_index: chunkIndex,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to save live lecture chunk:", data);
        return null;
      }

      return data;
    },
    []
  );

  const analyzeTranscript = useCallback(
    async (transcriptText: string, force = false) => {
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) return;

      const transcriptToAnalyze = transcriptText.trim();
      if (!transcriptToAnalyze) return;
      if (analysisInFlightRef.current) return;

      const newChunkText = transcriptToAnalyze.slice(lastSavedTranscriptLengthRef.current).trim();

      if (!newChunkText) return;
      if (!force && newChunkText.length < MIN_ANALYZE_CHARS) return;

      analysisInFlightRef.current = true;
      setAnalysisLoading(true);

      try {
        const chunkIndex = chunkIndexRef.current;
        const endedAtSeconds = secondsLiveRef.current;
        const startedAtSeconds = Math.max(0, endedAtSeconds - 14);

        const analyzeRes = await fetch("/api/lecture-live-analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcriptText: newChunkText,
            chunkIndex,
            startedAtSeconds,
            endedAtSeconds,
            sessionTitle: title || "Full Live Lecture Session",
          }),
        });

        const analyzeData = await analyzeRes.json();

        if (!analyzeRes.ok) {
          console.error("LIVE ANALYZE ERROR:", analyzeData);
          setError(analyzeData?.error || "Live analyze failed");
          return;
        }

        const normalizedEvents: AnalyzerEvent[] = [
          ...(Array.isArray(analyzeData.events) ? analyzeData.events : []),

          ...(analyzeData.topicShift?.shiftDetected
            ? [
                {
                  event_type: "topic_shift",
                  label: "Topic Shift",
                  description:
                    analyzeData.topicShift.reason ||
                    `Professor moved from ${
                      analyzeData.topicShift.previousTopic || "one concept"
                    } into ${analyzeData.topicShift.currentTopic || "a new concept"}.`,
                  confidence: analyzeData.topicShift.confidence || 80,
                },
              ]
            : []),

          ...(analyzeData.professorEmphasis?.detected
            ? [
                {
                  event_type: "professor_emphasis",
                  label: "Professor Emphasis",
                  description:
                    analyzeData.professorEmphasis.whyLexiFlaggedIt ||
                    analyzeData.professorEmphasis.emphasizedPoint ||
                    "Lexi detected strong emphasis from the professor.",
                  confidence: analyzeData.professorEmphasis.confidence || 85,
                },
              ]
            : []),

          ...((analyzeData.examNuggets || []).map((nugget: ExamNugget) => ({
            event_type: "exam_nugget",
            label: nugget.label || "Exam Nugget",
            description: nugget.whyItMatters || nugget.studentUse || "This sounded testable.",
            confidence: nugget.confidence || 80,
          })) as AnalyzerEvent[]),
        ];

        const fallbackSummary =
          analyzeData.summary || newChunkText.slice(0, 220) || "Live lecture is being analyzed.";

        const mergedData: LiveAnalysisResponse = {
          ...analyzeData,
          summary: fallbackSummary,
          keyPoints:
            Array.isArray(analyzeData.keyPoints) && analyzeData.keyPoints.length > 0
              ? analyzeData.keyPoints
              : [fallbackSummary],
          safeAnswer:
            analyzeData.safeAnswer ||
            "Based on what was just covered, the safest answer is the core concept the professor is emphasizing.",
          sharperFollowUp:
            analyzeData.sharperFollowUp || "Can you clarify how this applies clinically?",
          classContribution:
            analyzeData.classContribution ||
            "This seems important because it connects directly to patient care and exam questions.",
          bestQuestion:
            analyzeData.bestQuestion || "What is the main takeaway from this concept?",
          prompts: Array.isArray(analyzeData.prompts) ? analyzeData.prompts : [],
          events: normalizedEvents,
        };

        if (!mountedRef.current) return;

        setAnalysis(mergedData);

        const saveResult = await saveLiveLectureChunk({
          sessionId: currentSessionId,
          chunkIndex,
          startedAtSeconds,
          endedAtSeconds,
          heading: analyzeData.heading || `Lecture chunk ${chunkIndex + 1}`,
          body: analyzeData.cleanedTranscript || fallbackSummary || newChunkText,
          events: normalizedEvents.map((event) => ({
            ...event,
            started_at_seconds: startedAtSeconds,
            ended_at_seconds: endedAtSeconds,
            transcript_chunk_index: chunkIndex,
          })),
        });

        if (saveResult) {
          chunkIndexRef.current += 1;
        }

        lastSavedTranscriptLengthRef.current = transcriptToAnalyze.length;
      } catch (err) {
        console.error("analyzeTranscript error:", err);
        setError("Failed to analyze lecture.");
      } finally {
        analysisInFlightRef.current = false;
        if (mountedRef.current) {
          setAnalysisLoading(false);
        }
      }
    },
    [saveLiveLectureChunk, title]
  );

  const startAnalyzeLoop = useCallback(() => {
    if (analyzeIntervalRef.current) return;

    analyzeIntervalRef.current = window.setInterval(() => {
      if (!autoAnalyzeRef.current) return;
      if (!canUseLiveFull) return;
      if (transcribeInFlightRef.current) return;

      const latestTranscript = getCurrentTranscript();
      void analyzeTranscript(latestTranscript, false);
    }, ANALYZE_INTERVAL_MS);
  }, [analyzeTranscript, canUseLiveFull, getCurrentTranscript]);

  const runAnalysis = useCallback(
    async (force = false) => {
      if (!requireLiveFullAccess()) return;
      await analyzeTranscript(getCurrentTranscript(), force);
    },
    [analyzeTranscript, getCurrentTranscript, requireLiveFullAccess]
  );

  const processAudioQueue = useCallback(async () => {
    if (transcribeInFlightRef.current) return;

    const nextBlob = pendingAudioChunksRef.current.shift();
    if (!nextBlob) {
      if (mountedRef.current) {
        setTranscribing(false);
        setLiveText("");
      }
      return;
    }

    transcribeInFlightRef.current = true;
    setTranscribing(true);
    setLiveText(
      pendingAudioChunksRef.current.length > 0
        ? `Transcribing audio... (${pendingAudioChunksRef.current.length + 1} queued)`
        : "Transcribing audio..."
    );

    try {
      const mimeInfo = currentMimeInfoRef.current;
      const blobType = nextBlob.type || mimeInfo?.mimeType || "audio/webm";
      const extension = mimeInfo?.extension || "webm";

      const file = new File([nextBlob], `lecture.${extension}`, {
        type: blobType,
      });

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("recentContext", fullTranscriptRef.current.slice(-500));
      formData.append("sessionTitle", title || "Full Live Lecture Session");

      const res = await fetch("/api/live-lecture/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.warn("Transcription failed:", data);
        setError(data?.error || "Transcription failed.");
        return;
      }

      const text = String(data?.text || "").trim();
      if (!text) return;

      setFullTranscript((prev) => {
        const next = `${prev} ${text}`.replace(/\s+/g, " ").trim();
        fullTranscriptRef.current = next;
        return next;
      });

      setLiveText("Lecture heard. Updating analysis...");
    } catch (err) {
      console.error("Chunk transcription error:", err);
      setError("Failed to transcribe live audio.");
    } finally {
      transcribeInFlightRef.current = false;

      if (mountedRef.current) {
        if (pendingAudioChunksRef.current.length > 0) {
          void processAudioQueue();
        } else {
          setTranscribing(false);
          setLiveText("");
        }
      }
    }
  }, [title]);

  const enqueueAudioChunk = useCallback(
    (blob: Blob) => {
      if (!blob || blob.size === 0) return;
      pendingAudioChunksRef.current.push(blob);
      void processAudioQueue();
    },
    [processAudioQueue]
  );

  const waitForAudioQueueToFlush = useCallback(async () => {
    let attempts = 0;

    while (
      (transcribeInFlightRef.current || pendingAudioChunksRef.current.length > 0) &&
      attempts < 250
    ) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      attempts += 1;
    }
  }, []);

  const createRecorder = useCallback(
    (stream: MediaStream, mimeInfo: RecorderMimeInfo) => {
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeInfo.mimeType,
      });

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          enqueueAudioChunk(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Live audio recording failed.");
      };

      recorder.onstop = () => {
        if (!mountedRef.current) return;

        if (isStoppingRef.current) {
          setListening(false);
          return;
        }

        if (mp4ChunkModeRef.current && mediaStreamRef.current && currentMimeInfoRef.current) {
          try {
            const nextRecorder = createRecorder(mediaStreamRef.current, currentMimeInfoRef.current);
            mediaRecorderRef.current = nextRecorder;
            nextRecorder.start();
          } catch (err) {
            console.error("Failed to restart MP4 recorder:", err);
            setError("Failed to restart live audio recorder.");
            setListening(false);
          }
        }
      };

      return recorder;
    },
    [enqueueAudioChunk]
  );

  const stopMediaCapture = useCallback(() => {
    clearRequestChunkLoop();

    const recorder = mediaRecorderRef.current;
    const mimeInfo = currentMimeInfoRef.current;

    if (recorder) {
      try {
        if (recorder.state === "recording") {
          if (!isMp4ChunkMode(mimeInfo)) {
            recorder.requestData();
          }
          recorder.stop();
        }
      } catch {
        //
      }
    }

    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, [clearRequestChunkLoop]);

  const stopListening = useCallback(async () => {
    isStoppingRef.current = true;

    stopMediaCapture();
    setListening(false);
    stopTimer();
    stopAnalyzeLoop();

    await waitForAudioQueueToFlush();

    const finalTranscript = getCurrentTranscript();
    setLiveText("");

    if (sessionIdRef.current && finalTranscript && canUseLiveFull) {
      try {
        await analyzeTranscript(finalTranscript, true);
      } catch (err) {
        console.error("Final live analysis failed:", err);
      }
    }

    isStoppingRef.current = false;
  }, [
    analyzeTranscript,
    canUseLiveFull,
    getCurrentTranscript,
    stopAnalyzeLoop,
    stopMediaCapture,
    stopTimer,
    waitForAudioQueueToFlush,
  ]);

  const startListening = useCallback(async () => {
    if (!requireLiveFullAccess()) return;

    setError("");

    if (!canUseMediaRecorder()) {
      setError("Live audio capture is not supported in this browser.");
      return;
    }

    if (!sessionIdRef.current) {
      setError("Start a live lecture session first.");
      return;
    }

    try {
      stopMediaCapture();
      pendingAudioChunksRef.current = [];
      transcribeInFlightRef.current = false;
      currentMimeInfoRef.current = null;
      isStoppingRef.current = false;
      setLiveText("");
      setTranscribing(false);

      const mimeInfo = getSupportedRecorderMime();
      if (!mimeInfo) {
        setError("This browser does not support a usable audio recording format.");
        return;
      }

      currentMimeInfoRef.current = mimeInfo;
      mp4ChunkModeRef.current = isMp4ChunkMode(mimeInfo);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;

      const recorder = createRecorder(stream, mimeInfo);
      mediaRecorderRef.current = recorder;
      recorder.start();

      clearRequestChunkLoop();
      requestChunkIntervalRef.current = window.setInterval(() => {
        const activeRecorder = mediaRecorderRef.current;
        if (!activeRecorder || activeRecorder.state !== "recording") return;

        try {
          if (mp4ChunkModeRef.current) {
            activeRecorder.stop();
          } else {
            activeRecorder.requestData();
          }
        } catch (err) {
          console.error("Chunk request failed:", err);
        }
      }, TRANSCRIBE_INTERVAL_MS);

      setListening(true);
      startTimer();
      startAnalyzeLoop();
    } catch (err) {
      console.error("Could not start microphone recording:", err);
      setError("Could not start microphone recording.");
    }
  }, [
    clearRequestChunkLoop,
    createRecorder,
    requireLiveFullAccess,
    startAnalyzeLoop,
    startTimer,
    stopMediaCapture,
  ]);

  function resetLecture() {
    analysisInFlightRef.current = false;
    transcribeInFlightRef.current = false;
    isStoppingRef.current = false;
    pendingAudioChunksRef.current = [];
    currentMimeInfoRef.current = null;
    mp4ChunkModeRef.current = false;

    stopMediaCapture();
    setListening(false);
    stopTimer();
    stopAnalyzeLoop();

    setFullTranscript("");
    setLiveText("");
    setAnalysis(null);
    setSecondsLive(0);
    setShowShiftPulse(false);
    setError("");
    setTranscribing(false);

    fullTranscriptRef.current = "";
    secondsLiveRef.current = 0;
    lastShiftSignatureRef.current = "";
    chunkIndexRef.current = 0;
    lastSavedTranscriptLengthRef.current = 0;

    window.localStorage.removeItem("lexi-live-analysis");
    window.localStorage.removeItem("lexi-live-hud");
  }

  async function startSession() {
    analysisInFlightRef.current = false;
    transcribeInFlightRef.current = false;
    isStoppingRef.current = false;
    pendingAudioChunksRef.current = [];
    currentMimeInfoRef.current = null;
    mp4ChunkModeRef.current = false;

    stopAnalyzeLoop();
    stopTimer();
    stopMediaCapture();

    if (!requireLiveFullAccess()) return;

    setStartingSession(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setShowUpgradeModal(true);
        setStartingSession(false);
        return;
      }

      const res = await fetch("/api/live-lecture/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          title: title || "Full Live Lecture Session",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start live session.");
        setStartingSession(false);
        return;
      }

      setSessionId(data.id);
      sessionIdRef.current = data.id;

      chunkIndexRef.current = 0;
      lastSavedTranscriptLengthRef.current = 0;
      lastShiftSignatureRef.current = "";

      setFullTranscript("");
      setLiveText("");
      setAnalysis(null);
      setSecondsLive(0);
      setShowShiftPulse(false);
      setListening(false);
      setTranscribing(false);

      fullTranscriptRef.current = "";
      secondsLiveRef.current = 0;

      window.localStorage.removeItem("lexi-live-analysis");
      window.localStorage.removeItem("lexi-live-hud");
    } catch {
      setError("Failed to connect to the server.");
    }

    setStartingSession(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      {/* Sticky best question banner */}
      {analysis?.bestQuestion && (
        <div className="sticky top-[76px] z-40 border-b border-fuchsia-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-2">
              <div className="min-w-0 flex-1">
                <span className="mr-2 rounded-full border border-fuchsia-200 bg-white px-2 py-0.5 text-xs font-semibold text-fuchsia-700">Pinned Q</span>
                <span className="text-sm font-semibold text-slate-900">{analysis.bestQuestion}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.bestQuestion).catch(() => {})}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
                >
                  Copy
                </button>
                <button
                  onClick={() => void runAnalysis(true)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-4 py-5">

        {/* Compact header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center rounded-full border border-cyan-200 bg-cyan-100 px-3 py-0.5 text-xs font-medium text-cyan-800">
              Full Live Lecture Mode
            </div>
            <h1 className="text-2xl font-black tracking-tight">Lexi Continuous Lecture Listener</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/lecture/live" className="rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 transition hover:bg-blue-50">Clip Mode</a>
            <a href="/lecture/hud" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-900 transition hover:bg-purple-50">Open HUD</a>
            <a href="/lecture" className="rounded-xl bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800">Lecture Hub</a>
          </div>
        </div>

        {!canUseLiveFull && !accessLoading && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
            Preview mode — starting sessions and real-time analysis require Core.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Session Setup */}
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-bold">Session Setup</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pharmacology Monday Lecture"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => void startSession()}
                  disabled={startingSession}
                  className="w-full rounded-xl bg-blue-900 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {startingSession ? "Starting..." : "Start Full Live Session"}
                </button>
                {sessionId && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    <p className="font-semibold">Session started.</p>
                    <a href={`/lecture/history/${sessionId}`} className="mt-1 inline-flex rounded-lg bg-white px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100">
                      Open this session
                    </a>
                  </div>
                )}
                {!supported && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
                    Live audio recorder not supported in this browser.
                  </div>
                )}
              </div>
            </div>

            {/* Live Controls */}
            <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-bold">Live Controls</h2>

              {/* Status row */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${listening ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                  {listening ? "● Listening" : "Mic idle"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${autoAnalyze ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                  {autoAnalyze ? "Auto on" : "Auto off"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${transcribing ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                  {transcribing ? "Transcribing" : "Ready"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${analysisLoading ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                  {analysisLoading ? "Thinking..." : "Analyzed"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {secondsToClock(secondsLive)}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => void startListening()}
                  disabled={!supported || !sessionId || listening}
                  className="w-full rounded-xl bg-purple-600 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                >
                  Start Live Listening
                </button>
                <button
                  onClick={() => void stopListening()}
                  disabled={!listening}
                  className="w-full rounded-xl bg-red-500 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  Stop Listening
                </button>
                <button
                  onClick={() => void runAnalysis(true)}
                  disabled={!combinedTranscript.trim() || analysisLoading}
                  className="w-full rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {analysisLoading ? "Analyzing..." : "Analyze Now"}
                </button>
                <button
                  onClick={() => setAutoAnalyze((prev) => !prev)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  {autoAnalyze ? "Turn Off Auto Analyze" : "Turn On Auto Analyze"}
                </button>
                <button
                  onClick={resetLecture}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Reset Transcript
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Topic Shift */}
            {analysis?.topicShift && (
              <div className={`rounded-2xl border bg-white p-4 shadow-sm transition ${showShiftPulse ? "border-red-300 ring-2 ring-red-100" : "border-rose-100"}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Topic Shift</span>
                    <h2 className="text-base font-bold">
                      {analysis.topicShift.shiftDetected ? "Possible topic shift detected" : "No major shift right now"}
                    </h2>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${shiftBadgeColor(analysis.topicShift.confidence || 0)}`}>
                    {analysis.topicShift.confidence || 0}% confidence
                  </span>
                </div>
                <p className="mb-3 text-sm text-slate-600">{analysis.topicShift.reason || "Lexi is watching for changes in the teacher's direction."}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Previous topic</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{analysis.topicShift.previousTopic || "Same section"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Current topic</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{analysis.topicShift.currentTopic || "Still forming"}</p>
                  </div>
                </div>
                {analysis.topicShift.examRelevance && (
                  <div className="mt-2 rounded-xl border border-orange-100 bg-orange-50 p-3">
                    <p className="text-xs font-semibold text-orange-700">Exam relevance</p>
                    <p className="mt-1 text-xs leading-6 text-slate-700">{analysis.topicShift.examRelevance}</p>
                  </div>
                )}
              </div>
            )}

            {/* Exam Nuggets */}
            {analysis?.examNuggets && analysis.examNuggets.length > 0 && (
              <div className="rounded-2xl border border-yellow-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700">Exam Nuggets</span>
                  <h2 className="text-base font-bold">This sounds testable</h2>
                </div>
                <div className="space-y-3">
                  {analysis.examNuggets.map((nugget, index) => (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${nuggetColor(nugget.confidence || 0)}`}>{nugget.label}</span>
                        <span className="text-xs text-slate-500">{nugget.confidence || 0}% confidence</span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why Lexi flagged it</p>
                          <p className="mt-1 text-xs leading-6 text-slate-700">{nugget.whyItMatters}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to use on an exam</p>
                          <p className="mt-1 text-xs leading-6 text-slate-700">{nugget.studentUse}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professor Emphasis */}
            {analysis?.professorEmphasis && analysis.professorEmphasis.detected && (
              <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Professor Emphasis</span>
                    <h2 className="text-base font-bold">{analysis.professorEmphasis.headline || "This sounds important"}</h2>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${emphasisColor(analysis.professorEmphasis.confidence || 0)}`}>
                    {analysis.professorEmphasis.confidence || 0}% confidence
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Emphasized point</p>
                    <p className="mt-1 text-xs leading-6 text-slate-700">{analysis.professorEmphasis.emphasizedPoint}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why Lexi flagged it</p>
                    <p className="mt-1 text-xs leading-6 text-slate-700">{analysis.professorEmphasis.whyLexiFlaggedIt}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What to do</p>
                    <p className="mt-1 text-xs leading-6 text-slate-700">{analysis.professorEmphasis.studentAction}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cold Call Shield */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Participation Mode</span>
                <h2 className="text-base font-bold">Cold Call Shield</h2>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Safe answer if called on</p>
                  <p className="mt-1 text-xs leading-6 text-slate-800">{analysis?.safeAnswer || "Lexi is still building your safe answer."}</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">Smarter follow-up</p>
                  <p className="mt-1 text-xs leading-6 text-slate-800">{analysis?.sharperFollowUp || "A sharper follow-up will appear here."}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Class contribution</p>
                  <p className="mt-1 text-xs leading-6 text-slate-800">{analysis?.classContribution || "A class contribution line will appear here."}</p>
                </div>
              </div>
            </div>

            {/* Lexi's Current Read */}
            <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">Live Analysis</span>
                  <h2 className="text-base font-bold">Lexi's Current Read</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {analysisLoading ? "Updating..." : "Live"}
                </span>
              </div>

              <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs leading-6 text-slate-700">
                  {analysis?.summary || "No live summary yet. Start listening or analyze manually."}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h3 className="mb-2 text-xs font-bold text-slate-900">Key points</h3>
                  <div className="space-y-1">
                    {(analysis?.keyPoints || []).map((point, index) => (
                      <div key={index} className="text-xs leading-6 text-slate-700">• {point}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h3 className="mb-2 text-xs font-bold text-slate-900">Live side quests</h3>
                  <div className="space-y-2">
                    {(analysis?.prompts || []).map((prompt, index) => (
                      <div key={index} className="rounded-lg border border-slate-200 bg-white p-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${promptColor(prompt.promptType)}`}>
                          {promptLabel(prompt.promptType)}
                        </span>
                        <p className="mt-1 text-xs font-semibold leading-6 text-slate-900">{prompt.promptText}</p>
                        <p className="text-xs leading-5 text-slate-600">{prompt.promptContext}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Transcript */}
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-base font-bold">Live Transcript</h2>
              {liveText && (
                <div className="mb-2 rounded-xl border border-cyan-200 bg-cyan-50 p-2">
                  <p className="text-xs font-semibold text-cyan-800">{liveText}</p>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="whitespace-pre-wrap text-xs leading-6 text-slate-700">
                  {combinedTranscript || "No transcript yet."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-orange-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Core Feature</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Unlock Live Full Lecture Mode</h2>
            <p className="mt-3 text-sm text-slate-600">
              Starting sessions, listening live, and real-time analysis require Core access.
            </p>
            <div className="mt-5 grid gap-2">
              <a href="/checkout?plan=core-monthly&source=live-full-modal&returnTo=/lecture/live-full" className="rounded-xl bg-orange-500 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-orange-600">
                Upgrade to Core
              </a>
              <a href="/pricing" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                View Pricing
              </a>
              <button onClick={() => setShowUpgradeModal(false)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}