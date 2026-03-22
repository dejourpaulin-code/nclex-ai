"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../../components/Navbar";
import { supabase } from "../../../../lib/supabase";

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

type LectureSessionRow = {
  id: string;
  title: string | null;
  summary: string | null;
  transcript: string | null;
  original_filename: string | null;
  created_at: string;
};

type TimelineEventRow = {
  id: string;
  lecture_session_id: string;
  event_type: string | null;
  label: string | null;
  description: string | null;
  confidence: number | null;
  started_at_seconds: number | null;
  ended_at_seconds: number | null;
  transcript_chunk_id?: string | null;
  transcript_chunk_index?: number | null;
};

type TranscriptChunkRow = {
  id: string;
  lecture_session_id: string;
  chunk_index: number | null;
  started_at_seconds: number | null;
  ended_at_seconds: number | null;
  heading: string | null;
  body: string | null;
};

type StudyGuideData = {
  sessionSummary: string;
  topConcepts: string[];
  examNuggets: {
    concept: string;
    whyItMatters: string;
    howToThinkAboutIt: string;
  }[];
  professorEmphasis: string[];
  topQuestionsToReview: string[];
  quickStudyPlan: string[];
};

type MappedTimelineItem = {
  id: string;
  time: string;
  type: string;
  text: string;
  confidence: number;
  transcriptTargetId: string | null;
};

function formatSecondsToTimestamp(seconds: number | null | undefined) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function formatSessionDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function normalizeEventType(type: string | null | undefined) {
  const value = (type || "").toLowerCase().trim();

  if (value === "professor_emphasis" || value === "professor emphasis") {
    return "Professor Emphasis";
  }

  if (value === "exam_nugget" || value === "exam nugget") {
    return "Exam Nugget";
  }

  if (value === "topic_shift" || value === "topic shift") {
    return "Topic Shift";
  }

  if (!value) return "Lecture Signal";

  return value
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function timelineBadge(type: string) {
  if (type === "Professor Emphasis") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (type === "Exam Nugget") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (type === "Topic Shift") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (type === "Transcript Chunk") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function confidenceBadge(confidence: number | null | undefined) {
  const value = confidence || 0;

  if (value >= 85) return "bg-red-100 text-red-700";
  if (value >= 70) return "bg-orange-100 text-orange-700";
  if (value >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function LectureSessionDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [session, setSession] = useState<LectureSessionRow | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventRow[]>([]);
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunkRow[]>([]);
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(null);

  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null);
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [studyGuideError, setStudyGuideError] = useState("");

  useEffect(() => {
    async function loadAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const res = await fetch("/api/access/me", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.id || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAccess(null);
          setAccessLoading(false);
          return;
        }

        setAccess(data);
      } catch {
        setAccess(null);
      }

      setAccessLoading(false);
    }

    void loadAccess();
  }, []);

  useEffect(() => {
    async function loadSession() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const [sessionRes, eventsRes, chunksRes] = await Promise.all([
          supabase
            .from("lecture_sessions")
            .select("id, title, summary, transcript, original_filename, created_at")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("lecture_timeline_events")
            .select(
              "id, lecture_session_id, event_type, label, description, confidence, started_at_seconds, ended_at_seconds, transcript_chunk_id, transcript_chunk_index"
            )
            .eq("lecture_session_id", id)
            .order("started_at_seconds", { ascending: true }),

          supabase
            .from("lecture_transcript_chunks")
            .select(
              "id, lecture_session_id, chunk_index, started_at_seconds, ended_at_seconds, heading, body"
            )
            .eq("lecture_session_id", id)
            .order("chunk_index", { ascending: true }),
        ]);

        const sessionError = sessionRes.error;
        const eventsError = eventsRes.error;
        const chunksError = chunksRes.error;

        if (sessionError) {
          console.error("Failed to load lecture session:", sessionError);
        }

        if (eventsError) {
          console.warn("Failed to load timeline events:", eventsError);
        }

        if (chunksError) {
          console.warn("Failed to load transcript chunks:", chunksError);
        }

        if (!sessionRes.data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setSession(sessionRes.data as LectureSessionRow);
        setTimelineEvents(eventsError ? [] : ((eventsRes.data || []) as TimelineEventRow[]));
        setTranscriptChunks(chunksError ? [] : ((chunksRes.data || []) as TranscriptChunkRow[]));
      } catch (error) {
        console.error("Failed to load lecture detail page:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (!accessLoading && access?.features?.lecture) {
      void loadSession();
    } else if (!accessLoading && !access?.features?.lecture) {
      setLoading(false);
    }
  }, [id, accessLoading, access]);

  async function generateStudyGuide() {
    if (!id) return;

    setStudyGuideLoading(true);
    setStudyGuideError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStudyGuideError("You must be logged in.");
        setStudyGuideLoading(false);
        return;
      }

      const res = await fetch("/api/lecture-study-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: id,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStudyGuideError(data.error || "Failed to generate study guide.");
        setStudyGuideLoading(false);
        return;
      }

      setStudyGuide(data as StudyGuideData);
    } catch {
      setStudyGuideError("Failed to connect to the server.");
    }

    setStudyGuideLoading(false);
  }

  function jumpToTranscript(targetId: string | null) {
    if (!targetId) return;

    setActiveTranscriptId(targetId);

    window.setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 40);
  }

  const signals = useMemo(() => {
    const set = new Set<string>();

    timelineEvents.forEach((event) => {
      set.add(normalizeEventType(event.event_type || event.label));
    });

    if (transcriptChunks.length > 0) {
      set.add("Transcript Chunks");
    }

    return Array.from(set);
  }, [timelineEvents, transcriptChunks]);

  const mappedTimeline = useMemo<MappedTimelineItem[]>(() => {
    const eventItems: MappedTimelineItem[] = timelineEvents.map((event) => {
      const matchedChunk =
        transcriptChunks.find((chunk) => chunk.id === event.transcript_chunk_id) ||
        transcriptChunks.find(
          (chunk) =>
            typeof chunk.chunk_index === "number" &&
            typeof event.transcript_chunk_index === "number" &&
            chunk.chunk_index === event.transcript_chunk_index
        ) ||
        null;

      return {
        id: `event-${event.id}`,
        time: formatSecondsToTimestamp(event.started_at_seconds),
        type: normalizeEventType(event.event_type || event.label),
        text:
          event.description ||
          event.label ||
          "Lexi flagged this lecture moment as important.",
        confidence: event.confidence || 0,
        transcriptTargetId: matchedChunk ? matchedChunk.id : null,
      };
    });

    if (eventItems.length > 0) {
      return eventItems;
    }

    return transcriptChunks.map((chunk, index) => ({
      id: `chunk-${chunk.id}`,
      time: formatSecondsToTimestamp(chunk.started_at_seconds),
      type: "Transcript Chunk",
      text:
        chunk.heading ||
        chunk.body ||
        `Transcript chunk ${
          typeof chunk.chunk_index === "number" ? chunk.chunk_index + 1 : index + 1
        }`,
      confidence: 60,
      transcriptTargetId: chunk.id,
    }));
  }, [timelineEvents, transcriptChunks]);

  const topExamMoments = useMemo(() => {
    return mappedTimeline
      .filter((item) => item.type === "Exam Nugget")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }, [mappedTimeline]);

  const topProfessorMoments = useMemo(() => {
    return mappedTimeline
      .filter((item) => item.type === "Professor Emphasis")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }, [mappedTimeline]);

  const topShiftMoments = useMemo(() => {
    return mappedTimeline
      .filter((item) => item.type === "Topic Shift")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }, [mappedTimeline]);

  const fallbackTopMoments = useMemo(() => {
    return [...mappedTimeline].sort((a, b) => b.confidence - a.confidence).slice(0, 4);
  }, [mappedTimeline]);

  if (accessLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <section className="mx-auto max-w-[1400px] px-6 py-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Checking your access...
          </div>
        </section>
      </main>
    );
  }

  const canUseLecture = !!access?.features?.lecture;

  if (!canUseLecture) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <section className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="rounded-[36px] border border-purple-200 bg-white p-8 shadow-2xl md:p-10">
            <div className="mb-4 inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-4 py-1 text-sm font-semibold text-purple-800">
              Lecture Replay locked
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Lecture replay is available on Starter and above
            </h1>
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <section className="mx-auto max-w-[1400px] px-6 py-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Loading lecture session...
          </div>
        </section>
      </main>
    );
  }

  if (notFound || !session) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <section className="mx-auto max-w-[1400px] px-6 py-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Lecture session not found.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="mb-10">
          <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
            Lecture Replay
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-5xl font-black tracking-tight">
                {session.title || "Untitled lecture session"}
              </h1>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                Review Lexi’s saved timeline events, transcript highlights, and session summary.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  {formatSessionDate(session.created_at)}
                </span>

                {session.original_filename && (
                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    {session.original_filename}
                  </span>
                )}

                <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm">
                  {mappedTimeline.length} replay item{mappedTimeline.length === 1 ? "" : "s"}
                </span>

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                  {transcriptChunks.length} chunk{transcriptChunks.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={generateStudyGuide}
                disabled={studyGuideLoading}
                className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {studyGuideLoading ? "Generating..." : "Generate Study Guide"}
              </button>

              <a
                href="/lecture/history"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Back to History
              </a>

              {access?.features?.liveFull ? (
                <a
                  href="/lecture/live-full"
                  className="rounded-2xl bg-blue-900 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
                >
                  Start New Live Session
                </a>
              ) : (
                <a
                  href="/checkout?plan=core-monthly&source=lecture-history-livefull-upsell"
                  className="rounded-2xl bg-blue-900 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
                >
                  Upgrade to Core for Live Full
                </a>
              )}
            </div>
          </div>
        </div>

        {studyGuideError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            {studyGuideError}
          </div>
        )}

        {studyGuide && (
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl">
            <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Lexi Study Guide
            </div>

            <h2 className="text-2xl font-bold">Session Study Guide</h2>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm leading-8 text-slate-700">{studyGuide.sessionSummary}</p>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-3xl border border-fuchsia-100 bg-white p-6 shadow-xl">
          <div className="mb-4 inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
            Top Moments
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Best replay moments from this lecture</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Jump straight to the most useful replay points from this session.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Ranked by confidence
            </span>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
              <h3 className="text-xl font-bold text-slate-900">Top Exam Moments</h3>
              <div className="mt-4 space-y-3">
                {(topExamMoments.length > 0 ? topExamMoments : fallbackTopMoments.slice(0, 3)).map(
                  (item) => (
                    <button
                      key={`exam-${item.id}`}
                      onClick={() => jumpToTranscript(item.transcriptTargetId)}
                      className="w-full rounded-2xl border border-orange-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${timelineBadge(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${confidenceBadge(
                            item.confidence
                          )}`}
                        >
                          {item.confidence}%
                        </span>
                      </div>

                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.time}
                      </p>

                      <p className="mt-2 text-sm leading-7 text-slate-700">{item.text}</p>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
              <h3 className="text-xl font-bold text-slate-900">Strongest Emphasis</h3>
              <div className="mt-4 space-y-3">
                {(topProfessorMoments.length > 0
                  ? topProfessorMoments
                  : fallbackTopMoments.slice(0, 3)
                ).map((item) => (
                  <button
                    key={`prof-${item.id}`}
                    onClick={() => jumpToTranscript(item.transcriptTargetId)}
                    className="w-full rounded-2xl border border-rose-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${timelineBadge(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${confidenceBadge(
                          item.confidence
                        )}`}
                      >
                        {item.confidence}%
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.time}
                    </p>

                    <p className="mt-2 text-sm leading-7 text-slate-700">{item.text}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <h3 className="text-xl font-bold text-slate-900">Biggest Topic Shifts</h3>
              <div className="mt-4 space-y-3">
                {(topShiftMoments.length > 0 ? topShiftMoments : fallbackTopMoments.slice(0, 3)).map(
                  (item) => (
                    <button
                      key={`shift-${item.id}`}
                      onClick={() => jumpToTranscript(item.transcriptTargetId)}
                      className="w-full rounded-2xl border border-blue-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${timelineBadge(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${confidenceBadge(
                            item.confidence
                          )}`}
                        >
                          {item.confidence}%
                        </span>
                      </div>

                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.time}
                      </p>

                      <p className="mt-2 text-sm leading-7 text-slate-700">{item.text}</p>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold">Session Summary</h2>
              <p className="mt-4 leading-8 text-slate-700">
                {session.summary || "No session summary saved yet."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {signals.length === 0 ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    No saved signals yet
                  </span>
                ) : (
                  signals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {signal}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Lecture Timeline</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Click to jump
                </span>
              </div>

              {mappedTimeline.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                  No timeline events or transcript chunks saved yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {mappedTimeline.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => jumpToTranscript(item.transcriptTargetId)}
                      className="grid w-full gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md md:grid-cols-[76px_170px_minmax(0,1fr)]"
                    >
                      <div className="text-sm font-bold text-slate-900">{item.time}</div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${timelineBadge(
                            item.type
                          )}`}
                        >
                          {item.type}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${confidenceBadge(
                            item.confidence
                          )}`}
                        >
                          {item.confidence}%
                        </span>
                      </div>

                      <p className="text-sm leading-7 text-slate-700">{item.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold">Transcript Highlights</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Jump targets
                </span>
              </div>

              {transcriptChunks.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                  No transcript chunks saved yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {transcriptChunks.map((chunk, index) => {
                    const active = activeTranscriptId === chunk.id;

                    return (
                      <div
                        key={chunk.id}
                        id={chunk.id}
                        className={`scroll-mt-32 rounded-2xl border p-5 transition ${
                          active
                            ? "border-blue-300 bg-blue-50 shadow-md"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {chunk.heading || `Transcript section ${index + 1}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatSecondsToTimestamp(chunk.started_at_seconds)} →{" "}
                              {formatSecondsToTimestamp(chunk.ended_at_seconds)}
                            </p>
                          </div>

                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            Chunk{" "}
                            {typeof chunk.chunk_index === "number"
                              ? chunk.chunk_index + 1
                              : index + 1}
                          </span>
                        </div>

                        <p className="text-sm leading-8 text-slate-700">
                          {chunk.body || "No text saved for this transcript chunk yet."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {session.transcript && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-bold">Full Transcript</h2>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="whitespace-pre-wrap leading-8 text-slate-700">
                    {session.transcript}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}