"use client";

import Link from "next/link";
import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import { useAccess } from "../../lib/useAccess";
import { hasRequiredAccess } from "../../lib/access";

type Difficulty = "Easy" | "Medium" | "Hard";
type AnswerLetter = "A" | "B" | "C" | "D" | "";

type QuestionData = {
  topic?: string;
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

type CatAnswerRow = {
  questionNumber: number;
  topic: string;
  difficulty: Difficulty;
  question: string;
  selectedAnswer: AnswerLetter;
  correctAnswer: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  rationale: string;
};

type CatHistoryRow = {
  id: string;
  title: string;
  topic: string | null;
  topic_details: string | null;
  score: number | null;
  created_at: string;
  updated_at: string;
  questions: QuestionData[];
  answers?: CatAnswerRow[] | null;
};

const TOPICS = [
  "All Topics",
  "Random Topic",
  "Cardiac",
  "Respiratory",
  "Pharmacology",
  "Fundamentals",
  "Pediatrics",
  "Psychiatric",
  "Maternal-Newborn",
  "Med-Surg",
  "Older Adults",
] as const;

function newExamId() {
  return crypto.randomUUID();
}

function getNextDifficulty(current: Difficulty, wasCorrect: boolean): Difficulty {
  if (wasCorrect) {
    if (current === "Easy") return "Medium";
    if (current === "Medium") return "Hard";
    return "Hard";
  }

  if (current === "Hard") return "Medium";
  if (current === "Medium") return "Easy";
  return "Easy";
}

function buildCatTitle(
  topic: string,
  customTopic: string,
  customTopicDetails: string
) {
  if (customTopic.trim()) return `CAT: ${customTopic.trim()}`.slice(0, 80);

  if (topic && topic !== "All Topics" && topic !== "Random Topic") {
    return `CAT: ${topic}`.slice(0, 80);
  }

  if (customTopicDetails.trim()) {
    return `CAT: ${customTopicDetails.trim()}`.slice(0, 80);
  }

  return "CAT Exam Session";
}

function buildCatHistoryStorageKey(userId: string) {
  return `lexi-cat-history:${userId}`;
}

function readCatHistoryFromStorage(userId: string): CatHistoryRow[] {
  try {
    const raw = window.localStorage.getItem(buildCatHistoryStorageKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed as CatHistoryRow[];
  } catch {
    return [];
  }
}

function writeCatHistoryToStorage(userId: string, exams: CatHistoryRow[]) {
  window.localStorage.setItem(
    buildCatHistoryStorageKey(userId),
    JSON.stringify(exams)
  );
}

function upsertCatHistoryInStorage(userId: string, exam: CatHistoryRow) {
  const existing = readCatHistoryFromStorage(userId);
  const next = [exam, ...existing.filter((item) => item.id !== exam.id)].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  writeCatHistoryToStorage(userId, next);
  return next;
}

export default function CATPage() {
  const { accessLevel, loading: accessLoading } = useAccess();
  const canUseCAT = !accessLoading && hasRequiredAccess(accessLevel, "core");

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("All Topics");
  const [customTopic, setCustomTopic] = useState("");
  const [customTopicDetails, setCustomTopicDetails] = useState("");
  const [targetCount, setTargetCount] = useState(20);

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerLetter>("");
  const [questionNumber, setQuestionNumber] = useState(1);

  const [score, setScore] = useState(0);
  const [results, setResults] = useState<CatAnswerRow[]>([]);
  const [questionSnapshots, setQuestionSnapshots] = useState<QuestionData[]>([]);

  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [history, setHistory] = useState<CatHistoryRow[]>([]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        setUserId(user.id);
        loadCatHistory(user.id);
      }
    }

    void init();
  }, []);

  function requireCoreAccess() {
    if (!canUseCAT) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  }

  function loadCatHistory(explicitUserId?: string) {
    const resolvedUserId = explicitUserId || userId;
    if (!resolvedUserId) return;

    setHistoryLoading(true);

    try {
      const exams = readCatHistoryFromStorage(resolvedUserId);
      setHistory(exams);
    } catch {
      setHistory([]);
    }

    setHistoryLoading(false);
  }

  function openCatExam(targetExamId: string) {
    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      const exams = readCatHistoryFromStorage(userId);
      const exam = exams.find((item) => item.id === targetExamId);

      if (!exam) {
        setError("Could not open that CAT exam.");
        setLoading(false);
        return;
      }

      setExamId(exam.id);

      const savedTopic = exam.topic || "";

      if (TOPICS.includes(savedTopic as (typeof TOPICS)[number])) {
        setTopic(savedTopic as (typeof TOPICS)[number]);
        setCustomTopic("");
      } else {
        setTopic("All Topics");
        setCustomTopic(savedTopic);
      }

      setCustomTopicDetails(exam.topic_details || "");
      setTargetCount(
        Math.max(
          exam.answers?.length || 0,
          exam.questions?.length || 0,
          20
        )
      );
      setScore(Number(exam.score || 0));
      setResults(exam.answers || []);
      setQuestionSnapshots(exam.questions || []);
      setCurrentQuestion(null);
      setSelectedAnswer("");
      setStarted(false);
      setShowSummary(true);
      setQuestionNumber((exam.answers?.length || 0) + 1);
    } catch {
      setError("Could not open that CAT exam.");
    }

    setLoading(false);
  }

  function resetExamState(keepTopicFields = true) {
    setExamId(null);
    setStarted(false);
    setLoading(false);
    setDifficulty("Medium");
    setCurrentQuestion(null);
    setSelectedAnswer("");
    setQuestionNumber(1);
    setScore(0);
    setResults([]);
    setQuestionSnapshots([]);
    setShowSummary(false);
    setError("");

    if (!keepTopicFields) {
      setTopic("All Topics");
      setCustomTopic("");
      setCustomTopicDetails("");
      setTargetCount(20);
    }
  }

  function startFreshCat() {
    resetExamState(false);
  }

  function generateAnotherCat() {
    resetExamState(true);
  }

  async function generateQuestion(nextDifficulty: Difficulty, nextQuestionNumber: number) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: customTopic.trim() || topic,
          customTopic: customTopic.trim(),
          customTopicDetails: customTopicDetails.trim(),
          difficulty: nextDifficulty,
          questionType: "Multiple Choice",
          questionCount: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        setError(data.error || "Failed to generate CAT question.");
        setLoading(false);
        return;
      }

      setCurrentQuestion(data[0]);
      setSelectedAnswer("");
      setDifficulty(nextDifficulty);
      setQuestionNumber(nextQuestionNumber);
      setStarted(true);
      setShowSummary(false);
    } catch {
      setError("Failed to connect to the server.");
    }

    setLoading(false);
  }

  async function startExam() {
    if (!requireCoreAccess()) return;

    resetExamState(true);

    const freshExamId = newExamId();
    setExamId(freshExamId);

    await generateQuestion("Medium", 1);
  }

  function saveQuestionProgress(
    nextResults: CatAnswerRow[],
    nextQuestions: QuestionData[],
    nextScore: number
  ) {
    if (!userId) return;

    const now = new Date().toISOString();

    const nextExamId = examId || newExamId();
    if (!examId) {
      setExamId(nextExamId);
    }

    const exam: CatHistoryRow = {
      id: nextExamId,
      title: buildCatTitle(topic, customTopic, customTopicDetails),
      topic: customTopic.trim() || topic,
      topic_details: customTopicDetails.trim() || null,
      score: nextScore,
      created_at:
        history.find((item) => item.id === nextExamId)?.created_at || now,
      updated_at: now,
      questions: nextQuestions,
      answers: nextResults,
    };

    const updated = upsertCatHistoryInStorage(userId, exam);
    setHistory(updated);
  }

  async function saveToDatabase(
    question: QuestionData,
    answer: AnswerLetter,
    currentDifficulty: Difficulty,
    isCorrect: boolean
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const effectiveTopic = question.topic || customTopic || topic;

    await supabase.from("quiz_history").insert({
      user_id: user.id,
      topic: effectiveTopic,
      difficulty: currentDifficulty,
      question_type: "CAT Exam",
      question: question.question,
      choices: question.choices,
      correct_answer: question.correctAnswer,
      selected_answer: answer,
      is_correct: isCorrect,
      rationale: question.rationale,
    });

    const { data: existingMemory } = await supabase
      .from("user_learning_memory")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic", effectiveTopic)
      .maybeSingle();

    if (!existingMemory) {
      await supabase.from("user_learning_memory").insert({
        user_id: user.id,
        topic: effectiveTopic,
        strength_score: isCorrect ? 1 : 0,
        weakness_score: isCorrect ? 0 : 1,
        mastery_estimate: isCorrect ? 10 : 0,
        last_discussed_at: new Date().toISOString(),
        notes: isCorrect
          ? "User answered correctly in CAT exam."
          : "User missed this topic in CAT exam.",
      });
    } else {
      await supabase
        .from("user_learning_memory")
        .update({
          strength_score: isCorrect
            ? Number(existingMemory.strength_score || 0) + 1
            : Number(existingMemory.strength_score || 0),
          weakness_score: isCorrect
            ? Number(existingMemory.weakness_score || 0)
            : Number(existingMemory.weakness_score || 0) + 1,
          mastery_estimate: isCorrect
            ? Math.min(Number(existingMemory.mastery_estimate || 0) + 10, 100)
            : Math.max(Number(existingMemory.mastery_estimate || 0) - 8, 0),
          last_discussed_at: new Date().toISOString(),
          notes: isCorrect
            ? "User answered correctly in CAT exam."
            : "User missed this topic in CAT exam.",
        })
        .eq("id", existingMemory.id);
    }

    const { data: existingWeak } = await supabase
      .from("user_weak_areas")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic", effectiveTopic)
      .maybeSingle();

    if (!existingWeak) {
      await supabase.from("user_weak_areas").insert({
        user_id: user.id,
        topic: effectiveTopic,
        misses: isCorrect ? 0 : 1,
        correct: isCorrect ? 1 : 0,
      });
    } else {
      await supabase
        .from("user_weak_areas")
        .update({
          misses: isCorrect
            ? Number(existingWeak.misses || 0)
            : Number(existingWeak.misses || 0) + 1,
          correct: isCorrect
            ? Number(existingWeak.correct || 0) + 1
            : Number(existingWeak.correct || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingWeak.id);
    }
  }

  async function lockAnswerAndContinue() {
    if (!requireCoreAccess()) return;
    if (!currentQuestion || !selectedAnswer) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const nextScore = isCorrect ? score + 1 : score;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    await saveToDatabase(currentQuestion, selectedAnswer, difficulty, isCorrect);

    const nextResults: CatAnswerRow[] = [
      ...results,
      {
        questionNumber,
        topic: currentQuestion.topic || customTopic || topic,
        difficulty,
        question: currentQuestion.question,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        rationale: currentQuestion.rationale,
      },
    ];

    const nextQuestions: QuestionData[] = [...questionSnapshots, currentQuestion];

    setResults(nextResults);
    setQuestionSnapshots(nextQuestions);

    saveQuestionProgress(nextResults, nextQuestions, nextScore);

    if (questionNumber >= targetCount) {
      setShowSummary(true);
      setStarted(false);
      setCurrentQuestion(null);
      return;
    }

    const nextDifficulty = getNextDifficulty(difficulty, isCorrect);
    await generateQuestion(nextDifficulty, questionNumber + 1);
  }

  function handleSelectAnswer(letter: AnswerLetter) {
    if (!requireCoreAccess()) return;
    setSelectedAnswer(letter);
  }

  const accuracy =
    results.length === 0 ? 0 : Math.round((score / results.length) * 100);

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />

        <section className="mx-auto max-w-7xl px-4 py-5">

          {/* Compact header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-1 inline-flex rounded-full border border-purple-200 bg-purple-100 px-3 py-0.5 text-xs font-medium text-purple-800">
                True adaptive exam
              </div>
              <h1 className="text-2xl font-black tracking-tight">Lexi CAT Exam</h1>
            </div>
          </div>

          {!canUseCAT && !accessLoading && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
              Preview mode — starting the CAT exam requires Core.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Setup screen */}
          {!started && !showSummary && (
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-base font-bold">CAT Settings</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Topic Focus</label>
                      <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value as (typeof TOPICS)[number])}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        {TOPICS.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Custom Topic</label>
                      <input
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="e.g. Acid-base imbalance"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Custom Topic Details</label>
                      <textarea
                        value={customTopicDetails}
                        onChange={(e) => setCustomTopicDetails(e.target.value)}
                        placeholder="Add exactly what Lexi should test on..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Number of Questions</label>
                      <select
                        value={targetCount}
                        onChange={(e) => setTargetCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <button
                      onClick={startExam}
                      disabled={loading}
                      className="w-full rounded-xl bg-orange-500 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                    >
                      {loading ? "Preparing CAT..." : "Start Adaptive Exam"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold">CAT History</h2>
                    <button
                      onClick={startFreshCat}
                      className="rounded-xl bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800"
                    >
                      New CAT
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {historyLoading ? (
                      <p className="text-xs text-slate-500">Loading...</p>
                    ) : history.length === 0 ? (
                      <p className="text-xs text-slate-500">No CAT exams yet.</p>
                    ) : (
                      history.map((item) => {
                        const active = item.id === examId;
                        const answeredCount = item.answers?.length || 0;
                        const correctCount = Number(item.score || 0);
                        const percent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
                        return (
                          <button
                            key={item.id}
                            onClick={() => openCatExam(item.id)}
                            className={`w-full rounded-xl border px-3 py-2 text-left transition ${active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                          >
                            <p className="truncate text-xs font-semibold text-slate-900">{item.title}</p>
                            <p className="text-[10px] text-slate-400">{new Date(item.updated_at).toLocaleString()}</p>
                            {item.score !== null && answeredCount > 0 && (
                              <p className="text-[10px] font-semibold text-orange-700">{correctCount}/{answeredCount} ({percent}%)</p>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </aside>

              <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-base font-bold">How this works</h2>
                <div className="space-y-2">
                  {[
                    "If you answer correctly, the next question gets harder.",
                    "If you answer incorrectly, the next question eases slightly.",
                    "Lexi uses your adaptive performance to better estimate your readiness.",
                  ].map((text) => (
                    <div key={text} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active question */}
          {started && currentQuestion && !showSummary && (
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-purple-100 px-3 py-0.5 text-xs font-semibold text-purple-800">CAT Exam</span>
                <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-800">{currentQuestion.topic || customTopic || topic}</span>
                <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold text-orange-700">{difficulty}</span>
                <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700">Q{questionNumber} of {targetCount}</span>
              </div>

              <h2 className="mb-4 text-lg font-bold leading-relaxed text-slate-900">{currentQuestion.question}</h2>

              <div className="space-y-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const isSelected = selectedAnswer === letter;
                  return (
                    <button
                      key={letter}
                      onClick={() => handleSelectAnswer(letter)}
                      className={`w-full rounded-xl border p-3 text-left transition ${isSelected ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                          {letter}
                        </div>
                        <div className="pt-0.5 text-sm leading-6 text-slate-800">{currentQuestion.choices[letter]}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={lockAnswerAndContinue}
                  disabled={!selectedAnswer || loading}
                  className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {questionNumber < targetCount ? "Lock In & Next" : "Finish CAT"}
                </button>
                <button
                  onClick={generateAnotherCat}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Cancel / New CAT
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {showSummary && (
            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">✅</div>
                <div>
                  <h2 className="text-xl font-black">CAT Exam Complete</h2>
                  <p className="text-sm text-slate-500">Here is how you performed.</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Answered</p>
                  <p className="text-2xl font-bold">{results.length}</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Correct</p>
                  <p className="text-2xl font-bold">{score}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Accuracy</p>
                  <p className="text-2xl font-bold">{accuracy}%</p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={generateAnotherCat} className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
                  Another CAT Exam
                </button>
                <button onClick={startFreshCat} className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                  Back to Setup
                </button>
              </div>

              <div className="space-y-3">
                {results.map((row, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">{row.topic}</span>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">{row.difficulty}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {row.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">{row.questionNumber}. {row.question}</p>
                    <div className="mb-2 flex gap-4 text-xs text-slate-700">
                      <span>Your answer: <strong>{row.selectedAnswer || "None"}</strong></span>
                      <span>Correct: <strong>{row.correctAnswer}</strong></span>
                    </div>
                    <p className="text-xs leading-6 text-slate-600">{row.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-orange-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">Core Feature</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Unlock CAT Exam</h2>
            <p className="mt-2 text-sm text-slate-600">Starting and using the CAT exam requires the Core plan.</p>
            <div className="mt-4 grid gap-2">
              <Link href="/pricing" className="rounded-xl bg-orange-500 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-orange-600">
                View Pricing
              </Link>
              <Link href="/pricing" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                Upgrade to Core
              </Link>
              <button onClick={() => setShowUpgradeModal(false)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}