"use client";

import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from "react";

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

type LectureUploadResponse = {
  success?: boolean;
  sessionId?: string;
  transcript?: string;
  summary?: string;
  keyPoints?: string[];
  likelyTestableConcepts?: string[];
  studyPlan?: string[];
  quizQuestions?: string[];
  error?: string;
};

export default function LectureUploadPage() {
  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LectureUploadResponse | null>(null);
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [studyGuideError, setStudyGuideError] = useState("");

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
    loadAccess();
  }, []);

  async function handleUpload() {
    if (!audioFile) { setError("Please choose an audio file first."); return; }
    setUploading(true);
    setError("");
    setResult(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("You must be logged in."); setUploading(false); return; }

      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("userId", user.id);
      formData.append("title", title || "Lecture Upload Session");

      const res = await fetch("/api/lecture-upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) { setError(data.error || "Failed to process lecture."); }
      else { setResult(data); }
    } catch {
      setError("Failed to connect to the server.");
    }
    setUploading(false);
  }

  async function generateAndDownloadStudyGuide() {
    if (!result?.sessionId) return;
    setStudyGuideLoading(true);
    setStudyGuideError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStudyGuideError("Log in to generate a study guide."); setStudyGuideLoading(false); return; }

      const res = await fetch("/api/lecture-study-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: result.sessionId, userId: user.id }),
      });

      const data = await res.json();
      if (!res.ok) { setStudyGuideError(data.error || "Failed to generate study guide."); setStudyGuideLoading(false); return; }

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
<title>${d.lectureTitle || title || "Lecture Study Guide"}</title>
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
  .question-card { border: 1px solid #dbeafe; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; background: #eff6ff; page-break-inside: avoid; }
  .choice { padding: 4px 0; }
  .correct { font-weight: 700; color: #059669; }
  .rationale { margin-top: 8px; font-size: 12px; color: #475569; background: #f1f5f9; padding: 8px 10px; border-radius: 6px; }
  .topics { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .topic-tag { background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .study-plan li { padding: 4px 0; }
  .ref-note { padding: 3px 0; font-size: 12px; }
  .memory { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; margin-top: 6px; font-size: 12px; color: #166534; }
  .emphasis { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
  @media print { body { padding: 28px; } .concept-card, .question-card { page-break-inside: avoid; } }
</style>
</head>
<body>
<h1>${d.lectureTitle || title || "Lecture Study Guide"}</h1>
<div class="subtitle">Generated by NCLEXAI &mdash; Lexi Study Guide &bull; ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

<h2>Lecture Overview</h2>
<p>${d.sessionOverview || ""}</p>

<h2>Topics Covered</h2>
<div class="topics">${(d.majorTopics || []).map(t => `<span class="topic-tag">${t}</span>`).join("")}</div>

<h2>Concept Breakdowns</h2>
${(d.conceptBreakdowns || []).map(c => `
<div class="concept-card">
  <h3>${c.concept}</h3>
  <div class="label">Explanation</div>
  <p>${c.explanation}</p>
  <div class="label">Clinical Application</div>
  <p>${c.clinicalApplication}</p>
  <div class="label">Why It Matters on the NCLEX</div>
  <p>${c.whyItMatters}</p>
  <div class="memory">&#128161; Memory Hook: ${c.memoryHook}</div>
</div>`).join("")}

<h2>What the Professor Emphasized</h2>
<div class="emphasis"><p>${d.professorEmphasisNarrative || ""}</p></div>

<h2>Exam Nuggets</h2>
${(d.examNuggets || []).map((n, i) => `
<div class="nugget">
  <div class="nugget-num">${i + 1}.</div>
  <div><strong>${n.point}</strong><br><span style="font-size:12px;color:#92400e">${n.whyTestable}</span></div>
</div>`).join("")}

<h2>Practice Questions</h2>
${(d.practiceQuestions || []).map((q, i) => `
<div class="question-card">
  <p><strong>${i + 1}. ${q.question}</strong></p>
  ${(['A','B','C','D'] as const).map(l => `<div class="choice ${q.correctAnswer === l ? 'correct' : ''}">${l}. ${q.choices[l]}${q.correctAnswer === l ? ' &#10003;' : ''}</div>`).join("")}
  <div class="rationale"><strong>Rationale:</strong> ${q.rationale}</div>
</div>`).join("")}

<h2>3-Day Study Plan</h2>
<ul class="study-plan">${(d.studyPlan || []).map(s => `<li>${s}</li>`).join("")}</ul>

<h2>Quick Reference Notes</h2>
${(d.quickReferenceNotes || []).map(n => `<div class="ref-note">&#8226; ${n}</div>`).join("")}
</body>
</html>`;

      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    } catch {
      setStudyGuideError("Failed to generate study guide.");
    }

    setStudyGuideLoading(false);
  }

  if (accessLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Checking access...
          </div>
        </div>
      </main>
    );
  }

  const canUseLecture = !!access?.features?.lecture;

  if (!canUseLecture) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <section className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="mb-1 inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-700">
              Starter required
            </div>
            <h1 className="mt-2 text-xl font-black">Lecture Upload is locked</h1>
            <p className="mt-2 text-sm text-slate-600">
              Upload recorded lecture audio and let Lexi turn it into a transcript, summary, key points, study plan, and quiz-ready review.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {["Transcript generation", "Lecture summary", "Key point extraction", "Testable concepts", "Study plan", "Quiz seeds"].map((f) => (
                <div key={f} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">{f}</div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <a href={access?.loggedIn ? "/checkout?plan=starter-monthly&source=lecture-upload-gate" : "/login"}
                className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">
                {access?.loggedIn ? "Upgrade to Starter" : "Log In"}
              </a>
              <a href="/lecture" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Back
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <div className="mb-1 inline-flex rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
            Lecture Upload
          </div>
          <h1 className="text-2xl font-black tracking-tight">Upload a recorded lecture</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lexi transcribes your audio and turns it into a summary, key points, study plan, and quiz seeds.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside>
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold">How it works</h2>
              <div className="space-y-2">
                {[
                  { color: "bg-blue-50 border-blue-100", step: "1. Upload audio", desc: "Add a recorded class lecture file (mp3, m4a, wav, webm)." },
                  { color: "bg-orange-50 border-orange-100", step: "2. Lexi processes it", desc: "Transcript, summary, key points, and testable concepts are generated." },
                  { color: "bg-emerald-50 border-emerald-100", step: "3. Study smarter", desc: "Use the output to review faster and build follow-up quizzes." },
                ].map(({ color, step, desc }) => (
                  <div key={step} className={`rounded-xl border ${color} p-3`}>
                    <p className="text-xs font-semibold text-slate-900">{step}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
                Supported: mp3, m4a, wav, webm, ogg, mp4 audio. Max ~25MB.
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="space-y-4">
            {/* Upload form */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold">Upload lecture audio</h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Lecture title (optional)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Med Surg Cardiac Lecture 4"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Audio file</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  {audioFile && (
                    <p className="mt-1 text-xs text-slate-500">
                      {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
                    </p>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading || !audioFile}
                  className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {uploading ? "Processing lecture — this may take a minute..." : "Upload and Process"}
                </button>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            {result && (
              <>
                {/* Summary */}
                <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-bold">Summary</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={generateAndDownloadStudyGuide}
                        disabled={studyGuideLoading || !result.sessionId}
                        className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50"
                      >
                        {studyGuideLoading ? "Generating..." : "Download Study Guide PDF"}
                      </button>
                      {result.sessionId && (
                        <a href={`/lecture/history/${result.sessionId}`}
                          className="rounded-xl bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800">
                          Open Saved Session
                        </a>
                      )}
                    </div>
                  </div>
                  {studyGuideError && (
                    <p className="mb-2 text-xs text-red-600">{studyGuideError}</p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {result.summary || "No summary returned."}
                  </p>
                </div>

                {/* Key Points + Testable */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <ResultList title="Key Points" items={result.keyPoints} emptyMsg="No key points returned." color="border-blue-100" />
                  <ResultList title="Likely Testable Concepts" items={result.likelyTestableConcepts} emptyMsg="No testable concepts returned." color="border-orange-100" />
                </div>

                {/* Study Plan + Quiz Seeds */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <ResultList title="Study Plan" items={result.studyPlan} emptyMsg="No study plan returned." color="border-indigo-100" />
                  <ResultList title="Quiz Seeds" items={result.quizQuestions} emptyMsg="No quiz seeds returned." color="border-purple-100" />
                </div>

                {/* Transcript */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-sm font-bold">Full Transcript</h2>
                  <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="whitespace-pre-wrap text-xs leading-6 text-slate-700">
                      {result.transcript || "No transcript returned."}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ResultList({ title, items, emptyMsg, color }: {
  title: string;
  items?: string[];
  emptyMsg: string;
  color: string;
}) {
  const list = items?.length ? items : [emptyMsg];
  return (
    <div className={`rounded-2xl border ${color} bg-white p-4 shadow-sm`}>
      <h2 className="mb-3 text-sm font-bold">{title}</h2>
      <div className="space-y-2">
        {list.map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
