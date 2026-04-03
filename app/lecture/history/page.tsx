"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";

type AccessResponse = {
  loggedIn: boolean;
  accessLevel: string;
  plan: string | null;
  status: string;
  features: {
    quiz: boolean;
    lexi: boolean;
    history: boolean;
    study: boolean;
    dashboard: boolean;
    weakAreas: boolean;
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
  if (type === "Transcript Highlight") return "border-blue-200 bg-blue-50 text-blue-700";
  if (type === "Lecture Segment") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function LectureHistoryPage() {
  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionCardData[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTranscriptKey, setActiveTranscriptKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const res = await fetch("/api/access/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id || null }),
        });
        const data = await res.json();
        setAccess(res.ok ? data : null);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSessions([]); setLoading(false); return; }

        const [sessionRes, chunksRes] = await Promise.all([
          supabase
            .from("lecture_sessions")
            .select("id, title, summary, created_at, original_filename")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("lecture_transcript_chunks")
            .select("id, lecture_session_id, chunk_index, started_at_seconds, ended_at_seconds, heading, body")
            .order("chunk_index", { ascending: true }),
        ]);

        const sessionRows: LectureSessionRow[] = sessionRes.error ? [] : ((sessionRes.data || []) as LectureSessionRow[]);
        const allChunks: TranscriptChunkRow[] = chunksRes.error ? [] : ((chunksRes.data || []) as TranscriptChunkRow[]);

        const mapped: SessionCardData[] = sessionRows.map((session) => {
          const sessionChunks = allChunks.filter((c) => c.lecture_session_id === session.id);

          const timeline = sessionChunks.map((chunk, index) => {
            const targetId = `${session.id}__chunk__${typeof chunk.chunk_index === "number" ? chunk.chunk_index : index}`;
            return {
              id: chunk.id,
              time: formatSecondsToTimestamp(chunk.started_at_seconds),
              type: chunk.heading ? "Transcript Highlight" : "Lecture Segment",
              text: chunk.heading || chunk.body || `Section ${typeof chunk.chunk_index === "number" ? chunk.chunk_index + 1 : index + 1}`,
              transcriptId: targetId,
              confidence: 60,
            };
          });

          const transcriptSections = sessionChunks.map((chunk, index) => ({
            id: `${session.id}__chunk__${typeof chunk.chunk_index === "number" ? chunk.chunk_index : index}`,
            heading: chunk.heading || `Section ${index + 1}`,
            body: chunk.body || "No text saved for this section yet.",
          }));

          return {
            id: session.id,
            title: session.title || "Untitled lecture session",
            date: formatSessionDate(session.created_at),
            summary: session.summary || "No summary saved yet.",
            signals: sessionChunks.length > 0 ? ["Transcript Highlights", "Lecture Segments"] : [],
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

    if (!accessLoading && access?.features?.lecture) void loadSessions();
    else if (!accessLoading) { setLoading(false); setSessions([]); }
  }, [accessLoading, access]);

  function jumpToTranscript(id: string | null) {
    if (!id) return;
    setActiveTranscriptKey(id);
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  const totalSignals = useMemo(() => sessions.reduce((sum, s) => sum + s.timeline.length, 0), [sessions]);

  if (accessLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Checking access...</div>
        </div>
      </main>
    );
  }

  if (!access?.features?.lecture) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="mb-1 inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-700">Starter required</div>
            <h1 className="mt-2 text-xl font-black">Lecture History is locked</h1>
            <p className="mt-2 text-sm text-slate-600">Upgrade to Starter or above to access saved lecture sessions.</p>
            <div className="mt-4 flex gap-3">
              <a href="/pricing" className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">Upgrade</a>
              <a href="/lecture" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
              Lecture History
            </div>
            <h1 className="text-2xl font-black tracking-tight">Saved lecture sessions</h1>
          </div>
          {!loading && sessions.length > 0 && (
            <div className="flex gap-2">
              <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                {sessions.length} session{sessions.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm">
                {totalSignals} section{totalSignals === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading lecture history...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">No lecture sessions yet.</p>
            <div className="mt-3 flex gap-2">
              <a href="/lecture/upload" className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-600">Upload a Lecture</a>
              <a href="/lecture/live-full" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Live Full Mode</a>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isExpanded = expandedId === session.id;
              return (
                <div key={session.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Session row */}
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-bold text-slate-900">{session.title}</h2>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {session.date}
                        </span>
                        {session.timeline.length > 0 && (
                          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            {session.timeline.length} section{session.timeline.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{session.summary}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={`/lecture/history/${session.id}`}
                        className="rounded-xl bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800"
                      >
                        Open
                      </a>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : session.id)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide" : "Preview"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Timeline */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <h3 className="mb-2 text-xs font-bold text-slate-700">Timeline</h3>
                          {session.timeline.length === 0 ? (
                            <p className="text-xs text-slate-400">No sections saved yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {session.timeline.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => jumpToTranscript(item.transcriptId)}
                                  className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:bg-blue-50"
                                >
                                  <span className="shrink-0 text-[10px] font-bold text-slate-400">{item.time}</span>
                                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${timelineBadge(item.type)}`}>
                                    {item.type}
                                  </span>
                                  <span className="min-w-0 truncate text-[11px] text-slate-700">{item.text}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Transcript sections */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <h3 className="mb-2 text-xs font-bold text-slate-700">Transcript</h3>
                          {session.transcriptSections.length === 0 ? (
                            <p className="text-xs text-slate-400">No transcript saved yet.</p>
                          ) : (
                            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                              {session.transcriptSections.map((section) => {
                                const active = activeTranscriptKey === section.id;
                                return (
                                  <div
                                    key={section.id}
                                    id={section.id}
                                    className={`scroll-mt-32 rounded-lg border p-2.5 transition ${
                                      active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                                    }`}
                                  >
                                    <p className="text-[10px] font-bold text-slate-700">{section.heading}</p>
                                    <p className="mt-1 text-[11px] leading-4 text-slate-600 line-clamp-3">{section.body}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
