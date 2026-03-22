"use client";

import Navbar from "../../../components/Navbar";
import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type LectureQuizQuestion = {
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  rationale: string;
};

type Flashcard = {
  front: string;
  back: string;
};

type CompanionPrompt = {
  promptType: string;
  promptText: string;
  promptContext: string;
  timestampLabel: string;
};

type LectureSession = {
  id: string;
  title: string | null;
  original_filename: string | null;
  transcript: string | null;
  summary: string | null;
  key_points: string[] | null;
  testable_concepts: string[] | null;
  extracted_topics: string[] | null;
  flashcards: Flashcard[] | null;
  transcript_chunks:
    | {
        timestampLabel: string;
        text: string;
      }[]
    | null;
  lecture_companion: CompanionPrompt[] | null;
  study_plan: {
    headline?: string;
    coachMessage?: string;
    tasks?: string[];
    focusTopic?: string;
    studyMode?: string;
    estimatedMinutes?: number;
  } | null;
  quiz: LectureQuizQuestion[] | null;
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

function formatLectureDate(dateString: string) {
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

export default function LectureDetailPage() {
  const params = useParams();
  const lectureId = typeof params?.id === "string" ? params.id : "";

  const [lecture, setLecture] = useState<LectureSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [generatedQuiz, setGeneratedQuiz] = useState<LectureQuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    async function loadLecture() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !lectureId) {
        setLecture(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("lecture_sessions")
        .select("*")
        .eq("id", lectureId)
        .eq("user_id", user.id)
        .maybeSingle();

      setLecture((data as LectureSession | null) || null);
      setLoading(false);
    }

    loadLecture();
  }, [lectureId]);

  async function generateLectureQuiz() {
    if (!lectureId) return;

    setQuizLoading(true);
    setQuizError("");
    setGeneratedQuiz([]);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setQuizError("You must be logged in.");
        setQuizLoading(false);
        return;
      }

      const res = await fetch("/api/lecture-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lectureId,
          userId: user.id,
          questionCount,
          difficulty,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setQuizError(data.error || "Failed to generate lecture quiz.");
        setQuizLoading(false);
        return;
      }

      setGeneratedQuiz(Array.isArray(data) ? data : []);
    } catch {
      setQuizError("Failed to connect to the server.");
    }

    setQuizLoading(false);
  }

  async function syncLectureToMemory() {
    if (!lectureId) return;

    setSyncLoading(true);
    setSyncMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSyncMessage("You must be logged in.");
        setSyncLoading(false);
        return;
      }

      const res = await fetch("/api/lecture-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lectureId,
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSyncMessage(data.error || "Failed to sync lecture.");
        setSyncLoading(false);
        return;
      }

      setSyncMessage(data.message || "Lecture synced successfully.");
    } catch {
      setSyncMessage("Failed to connect to the server.");
    }

    setSyncLoading(false);
  }

  const keyPoints = lecture?.key_points || [];
  const testableConcepts = lecture?.testable_concepts || [];
  const extractedTopics = lecture?.extracted_topics || [];
  const flashcards = lecture?.flashcards || [];
  const companionPrompts = lecture?.lecture_companion || [];
  const savedQuiz = lecture?.quiz || [];
  const transcriptChunks = lecture?.transcript_chunks || [];
  const studyPlanTasks = lecture?.study_plan?.tasks || [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-purple-200 bg-purple-100 px-4 py-1 text-sm font-medium text-purple-800">
              Lecture session detail
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Saved Lecture
            </h1>
            <p className="mt-3 max-w-3xl text-lg text-slate-600">
              Review the transcript, summary, key points, study plan, and lecture-based questions anytime.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/lecture/history"
              className="rounded-2xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-900 transition hover:bg-blue-50"
            >
              Back to Lecture History
            </a>
            <a
              href="/lecture"
              className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Upload Another Lecture
            </a>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-xl">
            Loading lecture...
          </div>
        ) : !lecture ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-10 shadow-xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold">Lecture not found</h2>
              <p className="mt-3 text-slate-600">
                This lecture may not exist or you may not have permission to view it.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    Saved lecture
                  </div>
                  <h2 className="text-2xl font-bold">
                    {lecture.title || "Untitled Lecture"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {lecture.original_filename || "No filename"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatLectureDate(lecture.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {lecture.study_plan?.studyMode || "Tutor Mode"}
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    {lecture.study_plan?.estimatedMinutes || 20} min
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/lecture/history/${lecture.id}`}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Open Timeline Replay
                </a>

                <a
                  href="/lecture/history"
                  className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-100"
                >
                  View All Sessions
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-100 bg-white p-6 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    Adaptive Sync
                  </div>
                  <h2 className="text-2xl font-bold">Add this lecture to Lexi memory</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Push this lecture’s extracted topics into your learning memory and topic tracking so your dashboard and coaching get smarter.
                  </p>
                </div>

                <button
                  onClick={syncLectureToMemory}
                  disabled={syncLoading}
                  className="rounded-2xl bg-blue-900 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {syncLoading ? "Syncing..." : "Sync Into Lexi Memory"}
                </button>
              </div>

              {syncMessage && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {syncMessage}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {extractedTopics.length > 0 ? (
                  extractedTopics.map((topic, index) => (
                    <span
                      key={`${topic}-${index}`}
                      className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    No extracted topics yet
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold">Lecture Summary</h2>
              <p className="mt-4 leading-7 text-slate-700">
                {lecture.summary || "No summary available."}
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-bold">Key Points</h2>
                <div className="mt-5 space-y-3">
                  {keyPoints.length > 0 ? (
                    keyPoints.map((point, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                      >
                        {point}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                      No key points available.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
                <h2 className="text-2xl font-bold">Likely Testable Concepts</h2>
                <div className="mt-5 space-y-3">
                  {testableConcepts.length > 0 ? (
                    testableConcepts.map((concept, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
                      >
                        {concept}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                      No testable concepts available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl">
              <div className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Lecture Companion
              </div>
              <h2 className="text-2xl font-bold">Live-class side quests from this lecture</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                These are the types of things Lexi will eventually surface during live lecture mode.
              </p>

              <div className="mt-5 space-y-4">
                {companionPrompts.length > 0 ? (
                  companionPrompts.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${companionColor(
                            item.promptType
                          )}`}
                        >
                          {companionLabel(item.promptType)}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {item.timestampLabel || "Lecture moment"}
                        </span>
                      </div>

                      <p className="font-semibold leading-7 text-slate-900">
                        {item.promptText}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {item.promptContext}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                    No lecture companion prompts saved yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-xl">
              <div className="mb-3 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                Lecture Flashcards
              </div>
              <h2 className="text-2xl font-bold">Flashcards From This Lecture</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {flashcards.length > 0 ? (
                  flashcards.map((card, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Front
                      </p>
                      <p className="mt-2 font-semibold text-slate-900">{card.front}</p>

                      <div className="my-4 h-px bg-slate-200" />

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Back
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{card.back}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500 md:col-span-2">
                    No flashcards generated yet.
                  </div>
                )}
              </div>
            </div>

            {transcriptChunks.length > 0 && (
              <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-xl">
                <div className="mb-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  Transcript Segments
                </div>
                <h2 className="text-2xl font-bold">Chunked Transcript Review</h2>

                <div className="mt-5 space-y-4">
                  {transcriptChunks.map((chunk, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {chunk.timestampLabel || `Section ${index + 1}`}
                        </span>
                      </div>

                      <p className="text-sm leading-7 text-slate-700">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl">
              <div className="mb-3 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Lexi Study Plan
              </div>
              <h2 className="text-2xl font-bold">
                {lecture.study_plan?.headline || "Lecture Review Plan"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {lecture.study_plan?.coachMessage || "Lexi built a plan from this lecture."}
              </p>

              <div className="mt-5 space-y-4">
                {studyPlanTasks.length > 0 ? (
                  studyPlanTasks.map((task, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <p className="pt-1 text-sm leading-7 text-slate-700">{task}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                    No study plan tasks available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-fuchsia-100 bg-white p-6 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="mb-3 inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">
                    Quiz Me On This Lecture
                  </div>
                  <h2 className="text-2xl font-bold">Generate a fresh quiz from this lecture</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Build a new NCLEX-style quiz directly from this saved lecture whenever you want.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>

                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>

                  <button
                    onClick={generateLectureQuiz}
                    disabled={quizLoading}
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                  >
                    {quizLoading ? "Generating..." : "Generate Lecture Quiz"}
                  </button>
                </div>
              </div>

              {quizError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                  {quizError}
                </div>
              )}

              {generatedQuiz.length > 0 && (
                <div className="mt-6 space-y-5">
                  {generatedQuiz.map((q, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <p className="font-semibold text-slate-900">
                        {index + 1}. {q.question}
                      </p>

                      <div className="mt-4 space-y-2">
                        {(["A", "B", "C", "D"] as const).map((letter) => (
                          <div
                            key={letter}
                            className={`rounded-xl border p-3 text-sm ${
                              q.correctAnswer === letter
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <span className="font-semibold">{letter}.</span>{" "}
                            {q.choices[letter]}
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-sm font-semibold text-slate-800">
                        Correct Answer: {q.correctAnswer}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {q.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold">Quiz Saved With This Lecture</h2>

              <div className="mt-5 space-y-5">
                {savedQuiz.length > 0 ? (
                  savedQuiz.map((q, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <p className="font-semibold text-slate-900">
                        {index + 1}. {q.question}
                      </p>

                      <div className="mt-4 space-y-2">
                        {(["A", "B", "C", "D"] as const).map((letter) => (
                          <div
                            key={letter}
                            className={`rounded-xl border p-3 text-sm ${
                              q.correctAnswer === letter
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <span className="font-semibold">{letter}.</span>{" "}
                            {q.choices[letter]}
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-sm font-semibold text-slate-800">
                        Correct Answer: {q.correctAnswer}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {q.rationale}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                    No saved quiz exists for this lecture yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold">Transcript</h2>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="whitespace-pre-wrap leading-7 text-slate-700">
                  {lecture.transcript || "No transcript available."}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}