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
  if (value === "professor_emphasis" || value === "professor emphasis") return "Professor Emphasis";
  if (value === "exam_nugget" || value === "exam nugget") return "Exam Nugget";
  if (value === "topic_shift" || value === "topic shift") return "Topic Shift";
  if (!value) return "Lecture Signal";
  return value.split(/[_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function timelineBadge(type: string) {
  if (type === "Professor Emphasis") return "border-rose-200 bg-rose-50 text-rose-700";
  if (type === "Exam Nugget") return "border-orange-200 bg-orange-50 text-orange-700";
  if (type === "Topic Shift") return "border-blue-200 bg-blue-50 text-blue-700";
  if (type === "Transcript Chunk") return "border-emerald-200 bg-emerald-50 text-emerald-700";
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
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [studyGuideError, setStudyGuideError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "transcript">("overview");

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
    async function loadSession() {
      if (!id) { setNotFound(true); setLoading(false); return; }
      setLoading(true);
      setNotFound(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setNotFound(true); setLoading(false); return; }

        const [sessionRes, eventsRes, chunksRes] = await Promise.all([
          supabase
            .from("lecture_sessions")
            .select("id, title, summary, transcript, original_filename, created_at")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("lecture_timeline_events")
            .select("id, lecture_session_id, event_type, label, description, confidence, started_at_seconds, ended_at_seconds, transcript_chunk_id, transcript_chunk_index")
            .eq("lecture_session_id", id)
            .order("started_at_seconds", { ascending: true }),
          supabase
            .from("lecture_transcript_chunks")
            .select("id, lecture_session_id, chunk_index, started_at_seconds, ended_at_seconds, heading, body")
            .eq("lecture_session_id", id)
            .order("chunk_index", { ascending: true }),
        ]);

        if (!sessionRes.data) { setNotFound(true); setLoading(false); return; }
        setSession(sessionRes.data as LectureSessionRow);
        setTimelineEvents(eventsRes.error ? [] : ((eventsRes.data || []) as TimelineEventRow[]));
        setTranscriptChunks(chunksRes.error ? [] : ((chunksRes.data || []) as TranscriptChunkRow[]));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (!accessLoading && access?.features?.lecture) void loadSession();
    else if (!accessLoading && !access?.features?.lecture) setLoading(false);
  }, [id, accessLoading, access]);

  async function generateStudyGuide() {
    if (!id) return;
    setStudyGuideLoading(true);
    setStudyGuideError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStudyGuideError("You must be logged in."); setStudyGuideLoading(false); return; }

      const res = await fetch("/api/lecture-study-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, userId: user.id }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setStudyGuideError("The server took too long to respond. Try again — shorter lectures generate faster.");
        setStudyGuideLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = data as { error?: string };
        setStudyGuideError(errData?.error || "Failed to generate study guide.");
        setStudyGuideLoading(false);
        return;
      }

      const d = data as {
        lectureTitle?: string;
        sessionOverview?: string;
        majorTopics?: string[];
        conceptBreakdowns?: { concept: string; explanation: string; clinicalApplication: string; whyItMatters: string; memoryHook: string }[];
        professorEmphasisNarrative?: string;
        examNuggets?: { point: string; whyTestable: string }[];
        practiceQuestions?: { question: string; choices: { A: string; B: string; C: string; D: string }; correctAnswer: string; rationale: string }[];
        studyPlan?: string[];
        quickReferenceNotes?: string[];
      };

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${d.lectureTitle || session?.title || "Lecture Study Guide"}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; font-size: 13px; line-height: 1.7; color: #1a202c; padding: 48px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 26px; font-weight: 900; color: #1e3a5f; margin-bottom: 6px; }
  .subtitle { font-size: 12px; color: #64748b; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
  h2 { font-size: 16px; font-weight: 800; color: #1e3a5f; margin: 28px 0 10px; text-transform: uppercase; letter-spacing: 0.08em; border-left: 4px solid #f97316; padding-left: 10px; }
  h3 { font-size: 14px; font-weight: 700; color: #1e3a5f; margin: 16px 0 6px; }
  p { margin-bottom: 10px; }
  ul { padding-left: 20px; margin-bottom: 10px; }
  li { margin-bottom: 5px; }
  .concept-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; background: #f8fafc; page-break-inside: avoid; }
  .concept-card h3 { margin-top: 0; color: #f97316; }
  .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-top: 8px; margin-bottom: 2px; }
  .nugget { display: flex; gap: 10px; margin-bottom: 10px; padding: 10px 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; page-break-inside: avoid; }
  .nugget-num { font-weight: 900; color: #f97316; min-width: 22px; }
  .question-card { border: 1px solid #dbeafe; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; background: #f0f9ff; page-break-inside: avoid; }
  .question-card h3 { color: #1e3a5f; margin-top: 0; }
  .choices { padding-left: 0; list-style: none; margin: 8px 0; }
  .choices li { padding: 4px 0; }
  .correct { font-weight: 700; color: #059669; }
  .rationale { font-size: 12px; color: #475569; background: #f1f5f9; border-radius: 4px; padding: 8px 10px; margin-top: 8px; }
  .plan-item { display: flex; gap: 10px; margin-bottom: 8px; }
  .plan-num { font-weight: 900; color: #1e3a5f; min-width: 22px; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
<h1>${d.lectureTitle || session?.title || "Lecture Study Guide"}</h1>
<div class="subtitle">Generated by Lexi &bull; NCLEXAI &bull; ${new Date().toLocaleDateString()}</div>

<h2>Session Overview</h2>
<p>${d.sessionOverview || ""}</p>

<h2>Major Topics Covered</h2>
<ul>${(d.majorTopics || []).map((t) => `<li>${t}</li>`).join("")}</ul>

<h2>Concept Breakdowns</h2>
${(d.conceptBreakdowns || []).map((c) => `
<div class="concept-card">
  <h3>${c.concept}</h3>
  <div class="label">Explanation</div>
  <p>${c.explanation}</p>
  <div class="label">Clinical Application</div>
  <p>${c.clinicalApplication}</p>
  <div class="label">Why It Matters on NCLEX</div>
  <p>${c.whyItMatters}</p>
  <div class="label">Memory Hook</div>
  <p>${c.memoryHook}</p>
</div>`).join("")}

<h2>What Your Professor Emphasized</h2>
<p>${(d.professorEmphasisNarrative || "").replace(/\n\n/g, "</p><p>")}</p>

<h2>Exam Nuggets</h2>
${(d.examNuggets || []).map((n, i) => `
<div class="nugget">
  <span class="nugget-num">${i + 1}.</span>
  <div><strong>${n.point}</strong><br><span style="font-size:11px;color:#92400e;">${n.whyTestable}</span></div>
</div>`).join("")}

<h2>Practice Questions</h2>
${(d.practiceQuestions || []).map((q, i) => `
<div class="question-card">
  <h3>Question ${i + 1}</h3>
  <p>${q.question}</p>
  <ul class="choices">
    ${(["A", "B", "C", "D"] as const).map((letter) => `<li class="${q.correctAnswer === letter ? "correct" : ""}">${letter}. ${q.choices[letter]}${q.correctAnswer === letter ? " ✓" : ""}</li>`).join("")}
  </ul>
  <div class="rationale"><strong>Rationale:</strong> ${q.rationale}</div>
</div>`).join("")}

<h2>3-Day Study Plan</h2>
${(d.studyPlan || []).map((step, i) => `
<div class="plan-item"><span class="plan-num">${i + 1}.</span><span>${step}</span></div>`).join("")}

<h2>Quick Reference — Memorize These</h2>
<ul>${(d.quickReferenceNotes || []).map((note) => `<li>${note}</li>`).join("")}</ul>
</body>
</html>`;

      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
      }
    } catch {
      setStudyGuideError("Failed to connect to the server.");
    }

    setStudyGuideLoading(false);
  }

  function jumpToTranscript(targetId: string | null) {
    if (!targetId) return;
    setActiveTranscriptId(targetId);
    if (activeTab !== "transcript") setActiveTab("transcript");
    window.setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  const mappedTimeline = useMemo<MappedTimelineItem[]>(() => {
    const eventItems: MappedTimelineItem[] = timelineEvents.map((event) => {
      const matchedChunk =
        transcriptChunks.find((chunk) => chunk.id === event.transcript_chunk_id) ||
        transcriptChunks.find((chunk) =>
          typeof chunk.chunk_index === "number" &&
          typeof event.transcript_chunk_index === "number" &&
          chunk.chunk_index === event.transcript_chunk_index
        ) || null;

      return {
        id: `event-${event.id}`,
        time: formatSecondsToTimestamp(event.started_at_seconds),
        type: normalizeEventType(event.event_type || event.label),
        text: event.description || event.label || "Lexi flagged this lecture moment as important.",
        confidence: event.confidence || 0,
        transcriptTargetId: matchedChunk ? matchedChunk.id : null,
      };
    });

    if (eventItems.length > 0) return eventItems;

    return transcriptChunks.map((chunk, index) => ({
      id: `chunk-${chunk.id}`,
      time: formatSecondsToTimestamp(chunk.started_at_seconds),
      type: "Transcript Chunk",
      text: chunk.heading || chunk.body || `Transcript chunk ${typeof chunk.chunk_index === "number" ? chunk.chunk_index + 1 : index + 1}`,
      confidence: 60,
      transcriptTargetId: chunk.id,
    }));
  }, [timelineEvents, transcriptChunks]);

  const topMoments = useMemo(() => {
    return [...mappedTimeline].sort((a, b) => b.confidence - a.confidence).slice(0, 4);
  }, [mappedTimeline]);

  if (accessLoading || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            {accessLoading ? "Checking access..." : "Loading session..."}
          </div>
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
            <h1 className="text-xl font-black">Lecture History is locked</h1>
            <p className="mt-2 text-sm text-slate-600">Upgrade to Starter or above to access saved lecture sessions.</p>
            <a href="/pricing" className="mt-4 inline-block rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">Upgrade</a>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !session) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Session not found.</p>
            <a href="/lecture/history" className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:underline">Back to history</a>
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
        <div className="mb-5">
          <a href="/lecture/history" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
            ← Back to history
          </a>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black leading-tight text-slate-900">
                {session.title || "Untitled lecture session"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                  {formatSessionDate(session.created_at)}
                </span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700">
                  {mappedTimeline.length} event{mappedTimeline.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {transcriptChunks.length} chunk{transcriptChunks.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={generateStudyGuide}
                disabled={studyGuideLoading}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {studyGuideLoading ? "Generating..." : "Download Study Guide PDF"}
              </button>
              {access?.features?.liveFull ? (
                <a href="/lecture/live-full" className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800">
                  New Session
                </a>
              ) : (
                <a href="/checkout?plan=core-monthly&source=lecture-history-livefull-upsell" className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800">
                  Upgrade for Live Full
                </a>
              )}
            </div>
          </div>

          {studyGuideError && (
            <p className="mt-2 text-xs text-red-600">{studyGuideError}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
          {(["overview", "timeline", "transcript"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition ${
                activeTab === tab
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            {/* Summary card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Session Summary</p>
              <p className="text-sm leading-7 text-slate-700">{session.summary || "No summary saved yet."}</p>
            </div>

            {/* Key points — max 6, headings only, expandable */}
            {(() => {
              const typed = mappedTimeline.filter((e) => e.type === "Exam Nugget" || e.type === "Professor Emphasis");
              const keyPoints = typed.length > 0
                ? typed.slice(0, 6)
                : transcriptChunks.filter((c) => c.heading).slice(0, 6).map((c) => ({
                    id: `chunk-${c.id}`,
                    time: formatSecondsToTimestamp(c.started_at_seconds),
                    type: "Topic",
                    text: c.heading!,
                    confidence: 60,
                    transcriptTargetId: c.id,
                  }));

              if (keyPoints.length === 0) return null;

              return (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <p className="border-b border-slate-100 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Key Points — tap to read more
                  </p>
                  <div className="divide-y divide-slate-100">
                    {keyPoints.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => jumpToTranscript(item.transcriptTargetId)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                      >
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${timelineBadge(item.type)}`}>
                          {item.type === "Exam Nugget" ? "Exam" : item.type === "Professor Emphasis" ? "Emphasis" : "Topic"}
                        </span>
                        <p className="flex-1 truncate text-[12px] font-medium text-slate-700">{item.text}</p>
                        <span className="shrink-0 text-[10px] text-slate-400">{item.time}</span>
                        <span className="shrink-0 text-[10px] font-semibold text-blue-600">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Timeline tab */}
        {activeTab === "timeline" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-bold text-slate-700">Lecture Timeline</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any item to jump to that transcript section</p>
            </div>
            {mappedTimeline.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">No timeline events saved yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {mappedTimeline.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => jumpToTranscript(item.transcriptTargetId)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                  >
                    <span className="shrink-0 text-[10px] font-bold text-slate-400 w-10 pt-1">{item.time}</span>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 shrink-0">
                      <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${timelineBadge(item.type)}`}>
                        {item.type}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${confidenceBadge(item.confidence)}`}>
                        {item.confidence}%
                      </span>
                    </div>
                    <p className="min-w-0 flex-1 text-xs leading-5 text-slate-700">{item.text}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transcript tab */}
        {activeTab === "transcript" && (
          <div className="space-y-3">
            {transcriptChunks.length === 0 && !session.transcript ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400 shadow-sm">
                No transcript saved yet.
              </div>
            ) : (
              <>
                {transcriptChunks.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-4">
                      <h2 className="text-sm font-bold text-slate-700">Transcript Chunks</h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {transcriptChunks.map((chunk, index) => {
                        const active = activeTranscriptId === chunk.id;
                        return (
                          <div
                            key={chunk.id}
                            id={chunk.id}
                            className={`scroll-mt-32 px-4 py-3 transition ${active ? "bg-blue-50" : ""}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-xs font-bold text-slate-800">
                                {chunk.heading || `Section ${index + 1}`}
                              </p>
                              <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                                {formatSecondsToTimestamp(chunk.started_at_seconds)} → {formatSecondsToTimestamp(chunk.ended_at_seconds)}
                              </span>
                            </div>
                            <p className="text-xs leading-5 text-slate-600">
                              {chunk.body || "No text saved for this section."}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {session.transcript && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-4">
                      <h2 className="text-sm font-bold text-slate-700">Full Transcript</h2>
                    </div>
                    <div className="p-4">
                      <p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">
                        {session.transcript}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
