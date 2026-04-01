"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { useEffect, useMemo, useState } from "react";

type ChoiceMap = {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
};

type QuizSessionRow = {
  id: string;
  topic: string | null;
  difficulty: string | null;
  question_type: string | null;
  total_questions: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  accuracy: number | null;
  created_at: string;
};

type QuizRow = {
  id: string;
  session_id: string | null;
  topic: string;
  difficulty: string;
  question_type: string;
  question: string;
  choices: ChoiceMap | null;
  correct_answer: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  rationale: string;
  created_at: string;
};

type FilterMode = "All" | "Correct" | "Incorrect";

type LexiChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type SessionWithRows = {
  session: QuizSessionRow;
  rows: QuizRow[];
};

type ResumeQuizSettings = {
  topic?: string;
  difficulty?: string;
  questionType?: "Multiple Choice" | "Priority" | "Delegation" | "Pharmacology";
  questionCount?: number;
  quizMode?: "Tutor Mode" | "Exam Mode";
};

function choiceCardClass(
  letter: string,
  selectedAnswer: string | null,
  correctAnswer: string
) {
  const isSelected = selectedAnswer === letter;
  const isCorrect = correctAnswer === letter;

  if (isSelected && isCorrect) {
    return "border-emerald-300 bg-emerald-50";
  }

  if (isCorrect) {
    return "border-emerald-300 bg-emerald-50";
  }

  if (isSelected && !isCorrect) {
    return "border-red-300 bg-red-50";
  }

  return "border-slate-200 bg-white";
}

function choiceBadgeClass(
  letter: string,
  selectedAnswer: string | null,
  correctAnswer: string
) {
  const isSelected = selectedAnswer === letter;
  const isCorrect = correctAnswer === letter;

  if (isSelected && isCorrect) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  if (isCorrect) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  if (isSelected && !isCorrect) {
    return "border-red-300 bg-red-100 text-red-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function normalizeQuestionType(
  value: string | null | undefined
): "Multiple Choice" | "Priority" | "Delegation" | "Pharmacology" {
  const v = String(value || "").trim().toLowerCase();

  if (v === "priority") return "Priority";
  if (v === "delegation") return "Delegation";
  if (v === "pharmacology") return "Pharmacology";
  return "Multiple Choice";
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<QuizSessionRow[]>([]);
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<FilterMode>("All");
  const [topicFilter, setTopicFilter] = useState("All Topics");

  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState("");

  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const [lexiInputs, setLexiInputs] = useState<Record<string, string>>({});
  const [lexiChats, setLexiChats] = useState<Record<string, LexiChatMessage[]>>({});
  const [lexiLoadingMap, setLexiLoadingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [sessionsRes, rowsRes] = await Promise.all([
        supabase
          .from("quiz_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("quiz_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      const loadedSessions = (sessionsRes.data || []) as QuizSessionRow[];
      const loadedRows = (rowsRes.data || []) as QuizRow[];

      setSessions(loadedSessions);
      setRows(loadedRows);

      if (loadedSessions.length > 0) {
        setExpandedSessions((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          return {
            [loadedSessions[0].id]: true,
          };
        });
      }

      setLoading(false);
    }

    loadHistory();
  }, []);

  const rowsBySession = useMemo(() => {
    const map = new Map<string, QuizRow[]>();

    for (const row of rows) {
      if (!row.session_id) continue;

      const existing = map.get(row.session_id) || [];
      existing.push(row);
      map.set(row.session_id, existing);
    }

    return map;
  }, [rows]);

  const topics = useMemo(() => {
    const uniqueTopics = Array.from(new Set(rows.map((row) => row.topic).filter(Boolean)));
    return ["All Topics", ...uniqueTopics];
  }, [rows]);

  const sessionCards = useMemo<SessionWithRows[]>(() => {
    const baseCards: SessionWithRows[] = sessions.map((session) => ({
      session,
      rows: rowsBySession.get(session.id) || [],
    }));

    const knownSessionIds = new Set(sessions.map((session) => session.id));

    const orphanGroups = Array.from(rowsBySession.entries())
      .filter(([sessionId]) => !knownSessionIds.has(sessionId))
      .map(([sessionId, sessionRows]) => {
        const first = sessionRows[0];

        return {
          session: {
            id: sessionId,
            topic: first?.topic || "Unknown Topic",
            difficulty: first?.difficulty || "Unknown Difficulty",
            question_type: first?.question_type || "Unknown Type",
            total_questions: sessionRows.length,
            correct_count: sessionRows.filter((row) => row.is_correct === true).length,
            incorrect_count: sessionRows.filter((row) => row.is_correct === false).length,
            accuracy:
              sessionRows.length === 0
                ? 0
                : Math.round(
                    (sessionRows.filter((row) => row.is_correct === true).length /
                      sessionRows.length) *
                      100
                  ),
            created_at: first?.created_at || new Date().toISOString(),
          },
          rows: sessionRows,
        };
      });

    return [...baseCards, ...orphanGroups].sort(
      (a, b) =>
        new Date(b.session.created_at).getTime() - new Date(a.session.created_at).getTime()
    );
  }, [sessions, rowsBySession]);

  const filteredSessions = useMemo(() => {
    return sessionCards.filter(({ session, rows: sessionRows }) => {
      const safeTopic = (session.topic || "").toLowerCase();
      const safeType = (session.question_type || "").toLowerCase();
      const safeSearch = search.trim().toLowerCase();

      const matchesSearch =
        !safeSearch ||
        safeTopic.includes(safeSearch) ||
        safeType.includes(safeSearch) ||
        sessionRows.some((row) => row.question.toLowerCase().includes(safeSearch));

      const matchesTopic = topicFilter === "All Topics" || session.topic === topicFilter;

      const hasIncorrect = sessionRows.some((row) => row.is_correct === false);
      const allCorrect = sessionRows.length > 0 && sessionRows.every((row) => row.is_correct === true);

      const matchesResult =
        resultFilter === "All" ||
        (resultFilter === "Correct" && allCorrect) ||
        (resultFilter === "Incorrect" && hasIncorrect);

      return matchesSearch && matchesTopic && matchesResult;
    });
  }, [sessionCards, search, resultFilter, topicFilter]);

  const incorrectRows = useMemo(() => {
    return rows.filter((row) => row.is_correct === false);
  }, [rows]);

  const totalQuestions = rows.length;
  const totalCorrect = rows.filter((row) => row.is_correct === true).length;
  const totalIncorrect = rows.filter((row) => row.is_correct === false).length;
  const overallAccuracy =
    totalQuestions === 0 ? 0 : Math.round((totalCorrect / totalQuestions) * 100);

  function setLexiInput(rowId: string, value: string) {
    setLexiInputs((prev) => ({
      ...prev,
      [rowId]: value,
    }));
  }

  function toggleSession(sessionId: string) {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  }

  function saveResumeSettingsFromRows(sourceRows: QuizRow[]) {
    if (sourceRows.length === 0) return;

    const first = sourceRows[0];

    const settings: ResumeQuizSettings = {
      topic: first.topic || "Fundamentals",
      difficulty: first.difficulty || "Medium",
      questionType: normalizeQuestionType(first.question_type),
      questionCount: sourceRows.length,
      quizMode: "Tutor Mode",
    };

    window.localStorage.setItem("lexi-history-resume-settings", JSON.stringify(settings));
  }

  function resumeSimilarSetFromRows(sourceRows: QuizRow[]) {
    if (sourceRows.length === 0) return;

    saveResumeSettingsFromRows(sourceRows);
    window.location.href = "/quiz";
  }

  async function askLexiFromHistory(row: QuizRow, seededMessage?: string) {
    const rowId = row.id;
    const userMessage = (seededMessage || lexiInputs[rowId] || "").trim();

    if (!userMessage) return;

    setLexiChats((prev) => ({
      ...prev,
      [rowId]: [...(prev[rowId] || []), { role: "user", text: userMessage }],
    }));

    setLexiInputs((prev) => ({
      ...prev,
      [rowId]: "",
    }));

    setLexiLoadingMap((prev) => ({
      ...prev,
      [rowId]: true,
    }));

    try {
      const res = await fetch("/api/quiz-lexi-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: row.question,
          choices: row.choices || {},
          correctAnswer: row.correct_answer,
          selectedAnswer: row.selected_answer || "",
          rationale: row.rationale,
          userMessage,
        }),
      });

      const data = await res.json();

      setLexiChats((prev) => ({
        ...prev,
        [rowId]: [
          ...(prev[rowId] || []),
          {
            role: "assistant",
            text: res.ok
              ? data.reply || "Lexi could not answer right now."
              : data.error || "Lexi could not answer right now.",
          },
        ],
      }));
    } catch {
      setLexiChats((prev) => ({
        ...prev,
        [rowId]: [
          ...(prev[rowId] || []),
          {
            role: "assistant",
            text: "Lexi could not connect right now.",
          },
        ],
      }));
    }

    setLexiLoadingMap((prev) => ({
      ...prev,
      [rowId]: false,
    }));
  }

  async function retryQuestionsFromHistory(sourceRows: QuizRow[]) {
    if (sourceRows.length === 0) return;

    setRetryLoading(true);
    setRetryError("");

    try {
      const retryQuestions = sourceRows.map((row) => ({
        topic: row.topic,
        question: row.question,
        choices: row.choices || {
          A: "",
          B: "",
          C: "",
          D: "",
        },
        correctAnswer: row.correct_answer as "A" | "B" | "C" | "D",
        rationale: row.rationale,
      }));

      const first = sourceRows[0];

      const resumeSettings: ResumeQuizSettings = {
        topic: first?.topic || "Fundamentals",
        difficulty: first?.difficulty || "Medium",
        questionType: normalizeQuestionType(first?.question_type),
        questionCount: retryQuestions.length,
        quizMode: "Tutor Mode",
      };

      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retryQuestions,
          difficulty: first?.difficulty || "Medium",
          questionType: first?.question_type || "Multiple Choice",
          questionCount: retryQuestions.length,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRetryError(data.error || "Failed to generate retry questions.");
        setRetryLoading(false);
        return;
      }

      window.localStorage.setItem("lexi-history-retry-questions", JSON.stringify(data));
      window.localStorage.setItem("lexi-history-resume-settings", JSON.stringify(resumeSettings));
      window.location.href = "/quiz";
    } catch {
      setRetryError("Failed to connect to the server.");
    }

    setRetryLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10 xl:px-10">
        <div className="mb-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
              Saved practice history
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl xl:text-6xl">
              Review your
              <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                learning history
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Go back through recent questions, see exactly where you were right or wrong,
              and turn old attempts into better future scores.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Review rationales
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Search by topic
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Filter right vs wrong
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Retry weak concepts
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Session review
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Sessions</p>
              <p className="mt-2 text-3xl font-black">{sessionCards.length}</p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Total Reviewed</p>
              <p className="mt-2 text-3xl font-black">{totalQuestions}</p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Correct</p>
              <p className="mt-2 text-3xl font-black">{totalCorrect}</p>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Accuracy</p>
              <p className="mt-2 text-3xl font-black">{overallAccuracy}%</p>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Review filters</h2>
              <p className="mt-2 text-sm text-slate-500">
                Narrow your history to the exact questions you want to revisit.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => retryQuestionsFromHistory(incorrectRows)}
                disabled={retryLoading || incorrectRows.length === 0}
                className="rounded-2xl bg-purple-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {retryLoading ? "Building Retry Set..." : "Retry Incorrect Questions"}
              </button>

              <button
                onClick={() => resumeSimilarSetFromRows(incorrectRows)}
                disabled={incorrectRows.length === 0}
                className="rounded-2xl border border-blue-300 bg-white px-5 py-3 text-center font-semibold text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
              >
                Resume Similar Set
              </button>

              <a
                href="/quiz"
                className="rounded-2xl bg-orange-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
              >
                Generate New Quiz
              </a>
            </div>
          </div>

          {retryError && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              {retryError}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by topic, question, or type..."
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Result</label>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value as FilterMode)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
              >
                <option>All</option>
                <option>Correct</option>
                <option>Incorrect</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Topic</label>
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
              >
                {topics.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-blue-100 bg-white p-10 shadow-2xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                📚
              </div>
              <h2 className="text-2xl font-bold">Loading history...</h2>
              <p className="mt-3 text-slate-600">
                Pulling in your recent quiz performance.
              </p>
            </div>
          </div>
        ) : sessions.length === 0 && rows.length === 0 ? (
          <div className="rounded-[32px] border border-blue-100 bg-white p-12 shadow-2xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                📝
              </div>
              <h2 className="text-3xl font-black">No saved history yet</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Once you answer quiz questions, your review history will show up here.
              </p>

              <a
                href="/quiz"
                className="mt-6 inline-block rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                Start Practicing
              </a>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 shadow-2xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                🔎
              </div>
              <h2 className="text-3xl font-black">No matches found</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Try clearing your search or changing your filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSessions.map(({ session, rows: sessionRows }, sessionIndex) => {
              const expanded = !!expandedSessions[session.id];
              const missedInSession = sessionRows.filter((row) => row.is_correct === false);

              return (
                <div
                  key={session.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl"
                >
                  <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                          {session.topic || "Unknown Topic"}
                        </span>
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          {session.difficulty || "Unknown Difficulty"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {session.question_type || "Unknown Type"}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {session.accuracy ?? 0}% accuracy
                        </span>
                      </div>

                      <p className="mt-4 text-xl font-bold text-slate-900">
                        Session #{sessionIndex + 1}
                      </p>

                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {(session.total_questions ?? sessionRows.length) || 0} question
                        {((session.total_questions ?? sessionRows.length) || 0) === 1 ? "" : "s"} •{" "}
                        {session.correct_count ??
                          sessionRows.filter((r) => r.is_correct === true).length}{" "}
                        correct •{" "}
                        {session.incorrect_count ??
                          sessionRows.filter((r) => r.is_correct === false).length}{" "}
                        incorrect
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => retryQuestionsFromHistory(missedInSession)}
                        disabled={retryLoading || missedInSession.length === 0}
                        className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                      >
                        Retry Missed In Session
                      </button>

                      <button
                        onClick={() => resumeSimilarSetFromRows(sessionRows)}
                        disabled={sessionRows.length === 0}
                        className="rounded-2xl border border-blue-300 bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
                      >
                        Resume Similar Set
                      </button>

                      <button
                        onClick={() => toggleSession(session.id)}
                        className="rounded-2xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        {expanded ? "Hide Session" : "Open Session"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-6 space-y-5 border-t border-slate-200 pt-6">
                      {sessionRows.map((row, index) => {
                        const lexiMessages = lexiChats[row.id] || [];
                        const lexiLoading = lexiLoadingMap[row.id] || false;

                        return (
                          <div
                            key={row.id}
                            className="rounded-[28px] border border-slate-200 bg-slate-50 p-6"
                          >
                            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                  {row.topic}
                                </span>
                                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                                  {row.difficulty}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {row.question_type}
                                </span>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    row.is_correct
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {row.is_correct ? "Correct" : "Incorrect"}
                                </span>
                              </div>

                              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                                Q{index + 1}
                              </div>
                            </div>

                            <h2 className="text-xl font-bold leading-8 text-slate-900">
                              {row.question}
                            </h2>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-sm text-slate-500">Your answer</p>
                                <p className="mt-2 text-lg font-bold text-slate-900">
                                  {row.selected_answer || "None"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                <p className="text-sm text-slate-500">Correct answer</p>
                                <p className="mt-2 text-lg font-bold text-slate-900">
                                  {row.correct_answer}
                                </p>
                              </div>
                            </div>

                            {row.choices && (
                              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                                <div className="mb-4 flex items-center justify-between">
                                  <p className="text-sm font-semibold text-slate-900">
                                    Saved answer choices
                                  </p>
                                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                    A / B / C / D review
                                  </span>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                  {(["A", "B", "C", "D"] as const).map((letter) => (
                                    <div
                                      key={letter}
                                      className={`rounded-2xl border p-4 ${choiceCardClass(
                                        letter,
                                        row.selected_answer,
                                        row.correct_answer
                                      )}`}
                                    >
                                      <div className="flex items-start gap-4">
                                        <div
                                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${choiceBadgeClass(
                                            letter,
                                            row.selected_answer,
                                            row.correct_answer
                                          )}`}
                                        >
                                          {letter}
                                        </div>

                                        <div className="min-w-0">
                                          <p className="text-sm leading-7 text-slate-800">
                                            {row.choices?.[letter] || "No saved text for this choice."}
                                          </p>

                                          <div className="mt-2 flex flex-wrap gap-2">
                                            {row.selected_answer === letter && (
                                              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                                                Your choice
                                              </span>
                                            )}

                                            {row.correct_answer === letter && (
                                              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                                Correct
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-semibold text-blue-900">Rationale</p>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                  Review note
                                </span>
                              </div>

                              <p className="leading-7 text-slate-700">{row.rationale}</p>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                              <button
                                onClick={() => retryQuestionsFromHistory([row])}
                                disabled={retryLoading}
                                className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                              >
                                Retry This Question
                              </button>

                              <button
                                onClick={() => resumeSimilarSetFromRows([row])}
                                className="rounded-2xl border border-blue-300 bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
                              >
                                Resume Similar Set
                              </button>

                              <button
                                onClick={() => askLexiFromHistory(row, "Why did I get this wrong?")}
                                disabled={lexiLoading}
                                className="rounded-2xl border border-purple-300 bg-white px-5 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-50"
                              >
                                Ask Lexi Again
                              </button>
                            </div>

                            <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-4">
                              <div className="mb-3 inline-flex rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-purple-700">
                                Lexi History Chat
                              </div>

                              {!row.is_correct && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => askLexiFromHistory(row, "Why is my answer wrong?")}
                                    className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    Why is my answer wrong?
                                  </button>
                                  <button
                                    onClick={() =>
                                      askLexiFromHistory(row, "Explain the correct answer simply.")
                                    }
                                    className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    Explain simply
                                  </button>
                                  <button
                                    onClick={() =>
                                      askLexiFromHistory(row, "How would NCLEX test this again?")
                                    }
                                    className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    NCLEX angle
                                  </button>
                                </div>
                              )}

                              <div className="space-y-3">
                                {lexiMessages.map((message, msgIndex) => (
                                  <div
                                    key={msgIndex}
                                    className={`rounded-2xl p-3 text-sm leading-7 ${
                                      message.role === "user"
                                        ? "border border-slate-200 bg-white text-slate-800"
                                        : "border border-purple-200 bg-purple-100 text-slate-800"
                                    }`}
                                  >
                                    <span className="font-semibold">
                                      {message.role === "user" ? "You: " : "Lexi: "}
                                    </span>
                                    {message.text}
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 flex gap-3">
                                <input
                                  type="text"
                                  value={lexiInputs[row.id] || ""}
                                  onChange={(e) => setLexiInput(row.id, e.target.value)}
                                  placeholder="Ask Lexi about this question..."
                                  className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-purple-400"
                                />
                                <button
                                  onClick={() => askLexiFromHistory(row)}
                                  disabled={lexiLoading || !(lexiInputs[row.id] || "").trim()}
                                  className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                                >
                                  {lexiLoading ? "Asking..." : "Ask"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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