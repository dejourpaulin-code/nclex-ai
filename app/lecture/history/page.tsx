"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../../components/Navbar";
import Reveal from "../../../components/Reveal";
import { supabase } from "../../../lib/supabase";

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
  created_at: string;
  original_filename?: string | null;
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

type SessionCardData = {
  id: string;
  title: string;
  date: string;
  summary: string;
  signals: string[];
  timeline: {
    id: string;
    time: string;
    type: string;
    text: string;
    transcriptId: string | null;
    confidence: number;
  }[];
  transcriptSections: {
    id: string;
    heading: string;
    body: string;
  }[];
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

function timelineBadge(type: string) {
  if (type === "Transcript Highlight") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (type === "Lecture Segment") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function confidenceBadge(confidence: number) {
  if (confidence >= 85) return "bg-red-100 text-red-700";
  if (confidence >= 70) return "bg-orange-100 text-orange-700";
  if (confidence >= 50) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function LectureHistoryPage() {
  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionCardData[]>([]);
  const [activeTranscriptKey, setActiveTranscriptKey] = useState<string | null>(null);

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
    async function loadSessions() {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setSessions([]);
          setLoading(false);
          return;
        }

        const [sessionRes, chunksRes] = await Promise.all([
          supabase
            .from("lecture_sessions")
            .select("id, title, summary, created_at, original_filename")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("lecture_transcript_chunks")
            .select(
              "id, lecture_session_id, chunk_index, started_at_seconds, ended_at_seconds, heading, body"
            )
            .order("chunk_index", { ascending: true }),
        ]);

        const sessionRows: LectureSessionRow[] = sessionRes.error
          ? []
          : ((sessionRes.data || []) as LectureSessionRow[]);

        const allChunks: TranscriptChunkRow[] = chunksRes.error
          ? []
          : ((chunksRes.data || []) as TranscriptChunkRow[]);

        const mapped: SessionCardData[] = sessionRows.map((session) => {
          const sessionChunks = allChunks.filter(
            (chunk) => chunk.lecture_session_id === session.id
          );

          const timeline = sessionChunks.map((chunk, index) => {
            const targetId = `${session.id}__chunk__${
              typeof chunk.chunk_index === "number" ? chunk.chunk_index : index
            }`;

            return {
              id: chunk.id,
              time: formatSecondsToTimestamp(chunk.started_at_seconds),
              type: chunk.heading ? "Transcript Highlight" : "Lecture Segment",
              text:
                chunk.heading ||
                chunk.body ||
                `Transcript section ${
                  typeof chunk.chunk_index === "number" ? chunk.chunk_index + 1 : index + 1
                }`,
              transcriptId: targetId,
              confidence: 60,
            };
          });

          const transcriptSections = sessionChunks.map((chunk, index) => ({
            id: `${session.id}__chunk__${
              typeof chunk.chunk_index === "number" ? chunk.chunk_index : index
            }`,
            heading: chunk.heading || `Transcript section ${index + 1}`,
            body: chunk.body || "No text saved for this transcript chunk yet.",
          }));

          const signals =
            sessionChunks.length > 0 ? ["Transcript Highlights", "Lecture Segments"] : [];

          return {
            id: session.id,
            title: session.title || "Untitled lecture session",
            date: formatSessionDate(session.created_at),
            summary: session.summary || "No summary saved yet.",
            signals,
            timeline,
            transcriptSections,
          };
        });

        setSessions(mapped);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }

    if (!accessLoading && access?.features?.lecture) {
      void loadSessions();
    } else if (!accessLoading && !access?.features?.lecture) {
      setLoading(false);
      setSessions([]);
    }
  }, [accessLoading, access]);

  function jumpToTranscript(id: string | null) {
    if (!id) return;

    setActiveTranscriptKey(id);

    window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  }

  const totalSignals = useMemo(() => {
    return sessions.reduce((sum, session) => sum + session.timeline.length, 0);
  }, [sessions]);

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
        <section className="mx-auto max-w-[1400px] px-6 py-14">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Lecture history is locked for your current plan.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-[1400px] px-6 py-14">
        <Reveal>
          <div className="mb-12">
            <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
              Lecture History
            </div>

            <h1 className="text-5xl font-black tracking-tight">Saved lecture sessions</h1>

            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              Review processed lecture sessions, revisit key moments, and click directly into the
              exact sections Lexi flagged as important and reusable.
            </p>

            {!loading && sessions.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  {sessions.length} saved session{sessions.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm">
                  {totalSignals} total saved section{totalSignals === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
        </Reveal>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Loading lecture history...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            No lecture sessions yet.
          </div>
        ) : (
          <div className="space-y-8">
            {sessions.map((session, index) => (
              <Reveal key={session.id} delayMs={index * 80}>
                <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-lg transition duration-300 hover:shadow-2xl">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">{session.title}</h2>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {session.date}
                        </span>
                      </div>

                      <p className="mt-4 leading-7 text-slate-600">{session.summary}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {session.signals.length === 0 ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            No saved signals yet
                          </span>
                        ) : (
                          session.signals.map((signal) => (
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

                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`/lecture/history/${session.id}`}
                        className="rounded-2xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        Open Session
                      </a>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Lecture Timeline</h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          Click to jump
                        </span>
                      </div>

                      {session.timeline.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-500">
                          No transcript chunks saved yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {session.timeline.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => jumpToTranscript(item.transcriptId)}
                              className="grid w-full gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md md:grid-cols-[88px_180px_minmax(0,1fr)] md:items-start"
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

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">Transcript Highlights</h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          Jump targets
                        </span>
                      </div>

                      {session.transcriptSections.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-500">
                          No transcript chunks saved yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {session.transcriptSections.map((section) => {
                            const active = activeTranscriptKey === section.id;

                            return (
                              <div
                                key={section.id}
                                id={section.id}
                                className={`scroll-mt-32 rounded-2xl border p-5 transition ${
                                  active
                                    ? "border-blue-300 bg-blue-50 shadow-md"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <p className="text-sm font-bold text-slate-900">{section.heading}</p>
                                <p className="mt-3 text-sm leading-7 text-slate-700">
                                  {section.body}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}