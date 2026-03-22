"use client";

import Navbar from "../../components/Navbar";
import { supabase } from "../../lib/supabase";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type QuestionType =
  | "Multiple Choice"
  | "Priority"
  | "Delegation"
  | "Pharmacology"
  | "Select All That Apply";

type QuizMode = "Tutor Mode" | "Exam Mode";
type AnswerLetter = "A" | "B" | "C" | "D";

type QuestionData = {
  topic?: string;
  questionType?: QuestionType;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: AnswerLetter;
  correctAnswers?: AnswerLetter[];
  rationale: string;
};

type WeakAreaRow = {
  id: string;
  topic: string;
  misses: number;
  correct: number;
};

type AnswerValue = "" | AnswerLetter | AnswerLetter[];
type AnswerMap = Record<number, AnswerValue>;
type RevealedMap = Record<number, boolean>;

type LexiChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type ResumeQuizSettings = {
  topic?: string;
  customTopic?: string;
  customTopicDetails?: string;
  difficulty?: string;
  questionType?: QuestionType;
  questionCount?: number;
  quizMode?: QuizMode;
};

type AccessResponse = {
  loggedIn: boolean;
  accessLevel: string;
  plan: string | null;
  status: string;
  endsAt?: string | null;
  features?: {
    quiz?: boolean;
    lexi?: boolean;
    history?: boolean;
    study?: boolean;
    dashboard?: boolean;
    dashboardAdvanced?: boolean;
    weakAreas?: boolean;
    weakAreasAdvanced?: boolean;
    lecture?: boolean;
    liveFull?: boolean;
    catExam?: boolean;
  };
};

const TOPIC_OPTIONS = [
  "Use Weak Areas Only",
  "Random Topic",
  "All Topics",
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

function newSessionId() {
  return crypto.randomUUID();
}

function isSataQuestion(
  question: QuestionData | null,
  fallbackQuestionType: QuestionType
) {
  if (!question) return fallbackQuestionType === "Select All That Apply";
  return (
    (question.questionType || fallbackQuestionType) ===
    "Select All That Apply"
  );
}

function hasSelectedAnswer(value: AnswerValue) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== "";
}

function normalizeAnswerForDisplay(value: AnswerValue) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "No answer";
  }

  return value || "No answer";
}

function getCorrectAnswerLabel(question: QuestionData) {
  if (
    Array.isArray(question.correctAnswers) &&
    question.correctAnswers.length > 0
  ) {
    return question.correctAnswers.join(", ");
  }

  return question.correctAnswer || "Unknown";
}

function isAnswerCorrect(question: QuestionData, selected: AnswerValue) {
  const questionIsSata = isSataQuestion(
    question,
    question.questionType || "Multiple Choice"
  );

  if (questionIsSata) {
    const selectedArray = Array.isArray(selected) ? [...selected].sort() : [];
    const correctArray = Array.isArray(question.correctAnswers)
      ? [...question.correctAnswers].sort()
      : [];

    if (selectedArray.length === 0 || correctArray.length === 0) return false;
    if (selectedArray.length !== correctArray.length) return false;

    return selectedArray.every((value, index) => value === correctArray[index]);
  }

  if (Array.isArray(selected)) return false;
  return !!question.correctAnswer && selected === question.correctAnswer;
}

function QuizPageInner() {
  const searchParams = useSearchParams();

  const [sessionId, setSessionId] = useState<string>(() => newSessionId());
  const [topic, setTopic] = useState("Cardiac");
  const [customTopic, setCustomTopic] = useState("");
  const [customTopicDetails, setCustomTopicDetails] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionType, setQuestionType] =
    useState<QuestionType>("Multiple Choice");
  const [quizMode, setQuizMode] = useState<QuizMode>("Tutor Mode");
  const [questionCount, setQuestionCount] = useState(10);

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [revealedMap, setRevealedMap] = useState<RevealedMap>({});
  const [savedMap, setSavedMap] = useState<Record<number, boolean>>({});

  const [error, setError] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const [overallScore, setOverallScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const [weakAreas, setWeakAreas] = useState<WeakAreaRow[]>([]);
  const [loadingWeakAreas, setLoadingWeakAreas] = useState(true);

  const [saveError, setSaveError] = useState("");
  const [lexiInputs, setLexiInputs] = useState<Record<number, string>>({});
  const [lexiChats, setLexiChats] = useState<Record<number, LexiChatMessage[]>>(
    {}
  );
  const [lexiLoadingMap, setLexiLoadingMap] = useState<
    Record<number, boolean>
  >({});

  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentQuestion = questions[currentIndex] || null;
  const selectedAnswer = answers[currentIndex] || "";
  const revealed = revealedMap[currentIndex] || false;
  const isExamMode = quizMode === "Exam Mode";
  const currentQuestionIsSata = isSataQuestion(currentQuestion, questionType);
  const currentHasSelection = hasSelectedAnswer(selectedAnswer);

  const activeTopicLabel = currentQuestion?.topic || customTopic.trim() || topic;

  const canUseQuiz = !!access?.features?.quiz;

  const missedQuestions = questions.filter((question, index) => {
    const answer = answers[index] || "";
    return savedMap[index] && !isAnswerCorrect(question, answer);
  });

  useEffect(() => {
    const urlTopic = searchParams.get("topic");
    if (urlTopic) setTopic(urlTopic);
  }, [searchParams]);

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
    void loadWeakAreas();
  }, []);

  useEffect(() => {
    const pendingRetrySet = window.localStorage.getItem(
      "lexi-history-retry-questions"
    );
    const pendingResumeSettings = window.localStorage.getItem(
      "lexi-history-resume-settings"
    );

    if (pendingResumeSettings) {
      try {
        const parsed = JSON.parse(pendingResumeSettings) as ResumeQuizSettings;

        if (parsed.topic) setTopic(parsed.topic);
        if (parsed.customTopic) setCustomTopic(parsed.customTopic);
        if (parsed.customTopicDetails)
          setCustomTopicDetails(parsed.customTopicDetails);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.questionType) setQuestionType(parsed.questionType);
        if (parsed.questionCount) setQuestionCount(Number(parsed.questionCount));
        if (parsed.quizMode) setQuizMode(parsed.quizMode);
      } catch {
        //
      }

      window.localStorage.removeItem("lexi-history-resume-settings");
    }

    if (!pendingRetrySet) return;

    try {
      const parsed = JSON.parse(pendingRetrySet);

      if (Array.isArray(parsed) && parsed.length > 0) {
        setSessionId(newSessionId());
        setQuestions(parsed);
        setCurrentIndex(0);
        setAnswers({});
        setRevealedMap({});
        setSavedMap({});
        setShowSummary(false);
        setError("");
        setSaveError("");
        setLexiInputs({});
        setLexiChats({});
        setLexiLoadingMap({});
      }

      window.localStorage.removeItem("lexi-history-retry-questions");
    } catch {
      window.localStorage.removeItem("lexi-history-retry-questions");
    }
  }, []);

  function openUpgradeModal() {
    setShowUpgradeModal(true);
  }

  function guardQuizAction(action: () => void | Promise<void>) {
    if (accessLoading) return;
    if (!canUseQuiz) {
      openUpgradeModal();
      return;
    }
    void action();
  }

  async function loadWeakAreas() {
    setLoadingWeakAreas(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWeakAreas([]);
        setLoadingWeakAreas(false);
        return;
      }

      const res = await fetch("/api/weak-areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setWeakAreas([]);
        setLoadingWeakAreas(false);
        return;
      }

      setWeakAreas(data.weakAreas || []);
    } catch {
      setWeakAreas([]);
    }

    setLoadingWeakAreas(false);
  }

  function resetQuizUiForFreshSet(nextSessionId?: string) {
    setSessionId(nextSessionId || newSessionId());
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setRevealedMap({});
    setSavedMap({});
    setShowSummary(false);
    setError("");
    setSaveError("");
    setLexiInputs({});
    setLexiChats({});
    setLexiLoadingMap({});
  }

  async function retryMissedQuestions() {
    if (missedQuestions.length === 0) return;

    setLoading(true);
    setError("");
    setSaveError("");
    setShowSummary(false);
    setLexiInputs({});
    setLexiChats({});
    setLexiLoadingMap({});

    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retryQuestions: missedQuestions,
          difficulty,
          questionType,
          questionCount: missedQuestions.length,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate retry questions.");
        setLoading(false);
        return;
      }

      setSessionId(newSessionId());
      setQuestions(data);
      setCurrentIndex(0);
      setAnswers({});
      setRevealedMap({});
      setSavedMap({});
      setShowSummary(false);
      setLexiInputs({});
      setLexiChats({});
      setLexiLoadingMap({});
    } catch {
      setError("Failed to connect to the server.");
    }

    setLoading(false);
  }

  async function generate(overrides?: {
    topic?: string;
    customTopic?: string;
    customTopicDetails?: string;
  }) {
    const effectiveTopic = overrides?.topic ?? topic;
    const effectiveCustomTopic = overrides?.customTopic ?? customTopic;
    const effectiveCustomTopicDetails =
      overrides?.customTopicDetails ?? customTopicDetails;

    const trimmedCustomTopic = effectiveCustomTopic.trim();
    const trimmedCustomTopicDetails = effectiveCustomTopicDetails.trim();
    const finalTopic = trimmedCustomTopic || effectiveTopic;

    setLoading(true);
    setError("");
    setSaveError("");
    resetQuizUiForFreshSet(newSessionId());

    try {
      let weakTopics: string[] = [];

      if (effectiveTopic === "Use Weak Areas Only" && !trimmedCustomTopic) {
        weakTopics = weakAreas.slice(0, 5).map((area) => area.topic);

        if (weakTopics.length === 0) {
          setError("No weak-area data yet. Answer a few questions first.");
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: effectiveTopic,
          customTopic: trimmedCustomTopic,
          customTopicDetails: trimmedCustomTopicDetails,
          difficulty,
          questionType,
          questionCount,
          weakTopics,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      if (!trimmedCustomTopic) {
        setTopic(finalTopic);
      }

      setQuestions(data);
      setCurrentIndex(0);
    } catch {
      setError("Failed to connect to the server.");
    }

    setLoading(false);
  }

  function selectAnswer(letter: AnswerLetter) {
    if (!canUseQuiz) {
      openUpgradeModal();
      return;
    }

    if (!isExamMode && revealed) return;
    if (!currentQuestion) return;

    const questionIsSata = isSataQuestion(currentQuestion, questionType);

    if (questionIsSata) {
      const existing = Array.isArray(answers[currentIndex])
        ? (answers[currentIndex] as AnswerLetter[])
        : [];

      const updated = existing.includes(letter)
        ? existing.filter((item) => item !== letter)
        : [...existing, letter];

      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: updated,
      }));

      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: letter,
    }));
  }

  async function saveQuestionResult(index: number) {
    const question = questions[index];
    const selected = answers[index];

    if (!question || !selected || savedMap[index]) return;

    const isCorrect = isAnswerCorrect(question, selected);
    const effectiveTopic = question.topic || customTopic.trim() || topic;
    const questionIsSata = isSataQuestion(question, questionType);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const res = await fetch("/api/quiz-history/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        userId: user.id,
        topic: effectiveTopic,
        difficulty,
        questionType: question.questionType || questionType,
        question: question.question,
        choices: question.choices,
        correctAnswer: questionIsSata ? null : question.correctAnswer || null,
        correctAnswers: questionIsSata ? question.correctAnswers || [] : null,
        selectedAnswer: questionIsSata ? null : selected,
        selectedAnswers:
          questionIsSata && Array.isArray(selected) ? selected : null,
        rationale: question.rationale,
      }),
    });

    let data: {
      error?: string;
      warning?: string;
      sessionStats?: {
        totalQuestions: number;
        correctCount: number;
        incorrectCount: number;
        accuracy: number;
      };
    } = {};

    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      setSaveError(data.error || "Failed to save quiz history.");
      return;
    }

    setQuestionsAnswered((prev) => prev + 1);
    if (isCorrect) {
      setOverallScore((prev) => prev + 1);
    }

    setSavedMap((prev) => ({
      ...prev,
      [index]: true,
    }));

    if (data.warning) {
      setSaveError(data.warning);
    } else {
      setSaveError("");
    }

    await loadWeakAreas();
  }

  async function revealAnswer() {
    if (!currentQuestion || !currentHasSelection || revealed) return;

    setRevealedMap((prev) => ({
      ...prev,
      [currentIndex]: true,
    }));

    await saveQuestionResult(currentIndex);
  }

  async function nextQuestion() {
    if (!currentQuestion) return;

    if (isExamMode) {
      if (!currentHasSelection) return;

      await saveQuestionResult(currentIndex);

      setRevealedMap((prev) => ({
        ...prev,
        [currentIndex]: true,
      }));
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
    }
  }

  function goToQuestion(index: number) {
    if (!canUseQuiz) {
      openUpgradeModal();
      return;
    }
    setCurrentIndex(index);
  }

  function previousQuestion() {
    if (!canUseQuiz) {
      openUpgradeModal();
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function finishSetNow() {
    if (!canUseQuiz) {
      openUpgradeModal();
      return;
    }
    setShowSummary(true);
  }

  function practiceWeakestAreaNow() {
    if (weakAreas.length === 0) return;

    const weakest = weakAreas[0].topic;
    setTopic(weakest);
    setCustomTopic("");
    setCustomTopicDetails("");

    void generate({
      topic: weakest,
      customTopic: "",
      customTopicDetails: "",
    });
  }

  function startNewSet() {
    if (!canUseQuiz) {
      openUpgradeModal();
      return;
    }

    resetQuizUiForFreshSet(newSessionId());
    setCustomTopic("");
    setCustomTopicDetails("");
  }

  function setLexiInput(index: number, value: string) {
    if (!canUseQuiz) {
      openUpgradeModal();
      return;
    }

    setLexiInputs((prev) => ({
      ...prev,
      [index]: value,
    }));
  }

  async function askLexiAboutQuestion(index: number, seededMessage?: string) {
    const question = questions[index];
    const userMessage = (seededMessage || lexiInputs[index] || "").trim();
    const selected = answers[index];

    if (!question || !userMessage || !selected) return;

    setLexiChats((prev) => ({
      ...prev,
      [index]: [...(prev[index] || []), { role: "user", text: userMessage }],
    }));

    setLexiInputs((prev) => ({
      ...prev,
      [index]: "",
    }));

    setLexiLoadingMap((prev) => ({
      ...prev,
      [index]: true,
    }));

    try {
      const res = await fetch("/api/quiz-lexi-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.question,
          choices: question.choices,
          correctAnswer: question.correctAnswer || null,
          correctAnswers: question.correctAnswers || null,
          selectedAnswer: Array.isArray(selected) ? null : selected,
          selectedAnswers: Array.isArray(selected) ? selected : null,
          rationale: question.rationale,
          userMessage,
          questionType: question.questionType || questionType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLexiChats((prev) => ({
          ...prev,
          [index]: [
            ...(prev[index] || []),
            {
              role: "assistant",
              text: data.error || "Lexi could not answer right now.",
            },
          ],
        }));
      } else {
        setLexiChats((prev) => ({
          ...prev,
          [index]: [
            ...(prev[index] || []),
            {
              role: "assistant",
              text: data.reply || "Lexi could not answer right now.",
            },
          ],
        }));
      }
    } catch {
      setLexiChats((prev) => ({
        ...prev,
        [index]: [
          ...(prev[index] || []),
          {
            role: "assistant",
            text: "Lexi could not connect right now.",
          },
        ],
      }));
    }

    setLexiLoadingMap((prev) => ({
      ...prev,
      [index]: false,
    }));
  }

  const overallPercent =
    questionsAnswered === 0
      ? 0
      : Math.round((overallScore / questionsAnswered) * 100);

  const setAnsweredCount = questions.filter((_, index) => savedMap[index]).length;
  const setCorrectCount = questions.filter((question, index) => {
    const answer = answers[index] || "";
    return savedMap[index] && isAnswerCorrect(question, answer);
  }).length;

  const setPercent =
    setAnsweredCount === 0
      ? 0
      : Math.round((setCorrectCount / setAnsweredCount) * 100);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
              Adaptive NCLEX-style practice
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Quiz Generator
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              Cleaner answer choices, brighter visual hierarchy, and a more premium
              quiz experience.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-blue-100 bg-white px-5 py-4 text-center shadow-lg">
              <div className="text-sm text-slate-500">Score</div>
              <div className="mt-1 text-2xl font-bold">{overallScore}</div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white px-5 py-4 text-center shadow-lg">
              <div className="text-sm text-slate-500">Answered</div>
              <div className="mt-1 text-2xl font-bold">{questionsAnswered}</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-center shadow-lg">
              <div className="text-sm text-slate-500">Accuracy</div>
              <div className="mt-1 text-2xl font-bold">{overallPercent}%</div>
            </div>
          </div>
        </div>

        {!canUseQuiz && !accessLoading && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Preview mode is unlocked. To generate questions and use the quiz, upgrade to Starter.
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Practice Settings</h2>
              <p className="mt-2 text-sm text-slate-500">
                Build the exact study set you want.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Topic
                  </label>

                  <select
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-blue-50 p-3 text-slate-900 outline-none transition focus:border-blue-500"
                  >
                    {TOPIC_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Custom Topic
                  </label>

                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. Fundamentals - elimination"
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Custom Topic Details
                  </label>

                  <textarea
                    value={customTopicDetails}
                    onChange={(e) => setCustomTopicDetails(e.target.value)}
                    placeholder="e.g. Focus on urinary elimination, bowel incontinence, ostomy care, catheter complications, retention vs incontinence, and priority nursing interventions."
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-orange-50 p-3 text-slate-900 outline-none transition focus:border-orange-400"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) =>
                      setQuestionType(e.target.value as QuestionType)
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500"
                  >
                    <option>Multiple Choice</option>
                    <option>Priority</option>
                    <option>Delegation</option>
                    <option>Pharmacology</option>
                    <option>Select All That Apply</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Quiz Mode
                  </label>
                  <select
                    value={quizMode}
                    onChange={(e) => setQuizMode(e.target.value as QuizMode)}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500"
                  >
                    <option>Tutor Mode</option>
                    <option>Exam Mode</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-blue-500"
                  >
                    <option value={1}>1</option>
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <button
                  onClick={() => guardQuizAction(() => generate())}
                  disabled={loading}
                  className="w-full rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Questions"}
                </button>

                <button
                  onClick={() => guardQuizAction(() => practiceWeakestAreaNow())}
                  disabled={loading || weakAreas.length === 0}
                  className="w-full rounded-2xl bg-blue-900 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-800 disabled:opacity-50"
                >
                  Practice Weakest Area Now
                </button>

                <a
                  href="/chat"
                  className="block w-full rounded-2xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Open Lexi
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Weak Areas</h2>
              <p className="mt-2 text-sm text-slate-500">
                Topics where you’ve missed the most.
              </p>

              <div className="mt-5 space-y-3">
                {loadingWeakAreas ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Loading weak areas...
                  </div>
                ) : weakAreas.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No weak-area data yet. Answer a few questions first.
                  </div>
                ) : (
                  weakAreas.map((area) => (
                    <div
                      key={area.id}
                      className="rounded-2xl border border-slate-200 bg-orange-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900">
                          {area.topic}
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-orange-700">
                          {area.misses} miss{area.misses === 1 ? "" : "es"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Correct: {area.correct}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <div className="relative">
            <div
              className={`transition duration-200 ${
                showUpgradeModal && !canUseQuiz
                  ? "pointer-events-none select-none blur-[3px]"
                  : ""
              }`}
            >
              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
                  {error}
                </div>
              )}

              {saveError && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
                  {saveError}
                </div>
              )}

              {!currentQuestion && !showSummary && !error && (
                <div className="rounded-3xl border border-blue-100 bg-white p-12 shadow-2xl">
                  <div className="mx-auto max-w-2xl text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                      📝
                    </div>
                    <h2 className="text-2xl font-bold">Ready to practice?</h2>
                    <p className="mt-3 text-slate-600">
                      Choose your settings and generate one question or a full set.
                    </p>
                  </div>
                </div>
              )}

              {showSummary && (
                <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-2xl">
                  <div className="text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                      ✅
                    </div>
                    <h2 className="text-3xl font-black">Quiz Set Complete</h2>
                    <p className="mt-3 text-slate-600">
                      Here’s how you did on this set.
                    </p>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
                      <p className="text-sm text-slate-500">Answered</p>
                      <p className="mt-2 text-3xl font-bold">{setAnsweredCount}</p>
                    </div>
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 text-center">
                      <p className="text-sm text-slate-500">Correct</p>
                      <p className="mt-2 text-3xl font-bold">{setCorrectCount}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
                      <p className="text-sm text-slate-500">Set Accuracy</p>
                      <p className="mt-2 text-3xl font-bold">{setPercent}%</p>
                    </div>
                  </div>

                  <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-xl font-bold">Question Review</h3>
                    <div className="mt-5 space-y-5">
                      {questions.map((question, index) => {
                        const userAnswer = answers[index] || "";
                        const gotItRight = isAnswerCorrect(question, userAnswer);
                        const chatMessages = lexiChats[index] || [];
                        const lexiLoading = lexiLoadingMap[index] || false;

                        return (
                          <div
                            key={index}
                            className="rounded-2xl border border-slate-200 bg-white p-5"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                                {question.topic || customTopic.trim() || topic}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  gotItRight
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {gotItRight ? "Correct" : "Incorrect"}
                              </span>
                            </div>

                            <p className="mt-3 font-semibold text-slate-900">
                              {index + 1}. {question.question}
                            </p>

                            <p className="mt-3 text-sm text-slate-700">
                              Your answer:{" "}
                              <span className="font-semibold">
                                {normalizeAnswerForDisplay(userAnswer)}
                              </span>
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              Correct answer:{" "}
                              <span className="font-semibold">
                                {getCorrectAnswerLabel(question)}
                              </span>
                            </p>

                            <p className="mt-3 text-sm leading-7 text-slate-600">
                              {question.rationale}
                            </p>

                            {!gotItRight && (
                              <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-4">
                                <div className="mb-3 inline-flex rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-purple-700">
                                  Ask Lexi About This Question
                                </div>

                                <div className="mb-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={() =>
                                      guardQuizAction(() =>
                                        askLexiAboutQuestion(
                                          index,
                                          "Why is my answer wrong?"
                                        )
                                      )
                                    }
                                    className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    Why is my answer wrong?
                                  </button>
                                  <button
                                    onClick={() =>
                                      guardQuizAction(() =>
                                        askLexiAboutQuestion(
                                          index,
                                          "Explain the correct answer simply."
                                        )
                                      )
                                    }
                                    className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    Explain simply
                                  </button>
                                  <button
                                    onClick={() =>
                                      guardQuizAction(() =>
                                        askLexiAboutQuestion(
                                          index,
                                          "How would NCLEX test this again?"
                                        )
                                      )
                                    }
                                    className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    NCLEX angle
                                  </button>
                                  <button
                                    onClick={() =>
                                      guardQuizAction(() =>
                                        askLexiAboutQuestion(
                                          index,
                                          "Give me a memory trick for this."
                                        )
                                      )
                                    }
                                    className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                                  >
                                    Memory trick
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {chatMessages.map((message, msgIndex) => (
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
                                    value={lexiInputs[index] || ""}
                                    onChange={(e) =>
                                      setLexiInput(index, e.target.value)
                                    }
                                    placeholder="Ask Lexi about this question..."
                                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-purple-400"
                                  />
                                  <button
                                    onClick={() =>
                                      guardQuizAction(() =>
                                        askLexiAboutQuestion(index)
                                      )
                                    }
                                    disabled={
                                      lexiLoading ||
                                      !(lexiInputs[index] || "").trim()
                                    }
                                    className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    {lexiLoading ? "Asking..." : "Ask"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap justify-center gap-4">
                    <button
                      onClick={() => guardQuizAction(() => generate())}
                      className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
                    >
                      Generate Another Set
                    </button>

                    <button
                      onClick={() => guardQuizAction(() => retryMissedQuestions())}
                      disabled={missedQuestions.length === 0}
                      className="rounded-2xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                    >
                      Retry Missed Questions
                    </button>

                    <button
                      onClick={startNewSet}
                      className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Reset
                    </button>

                    <a
                      href="/dashboard"
                      className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Go to Dashboard
                    </a>
                  </div>
                </div>
              )}

              {currentQuestion && !showSummary && (
                <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-2xl">
                  <div className="mb-6">
                    <div className="mb-4 flex flex-wrap gap-3">
                      <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-800">
                        {activeTopicLabel}
                      </span>
                      <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700">
                        {difficulty}
                      </span>
                      <span className="rounded-full bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
                        {currentQuestion.questionType || questionType}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
                        {quizMode}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-700">
                        Question {currentIndex + 1} of {questions.length}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">Progress</span>
                        <span className="text-slate-500">
                          {Math.round(((currentIndex + 1) / questions.length) * 100)}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-900 via-blue-700 to-orange-500 transition-all duration-300"
                          style={{
                            width: `${((currentIndex + 1) / questions.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {questions.map((_, index) => {
                      const isCurrent = index === currentIndex;
                      const isAnswered = !!savedMap[index];

                      return (
                        <button
                          key={index}
                          onClick={() => goToQuestion(index)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                            isCurrent
                              ? "border-blue-900 bg-blue-900 text-white"
                              : isAnswered
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>

                  <h2 className="text-2xl font-bold leading-relaxed text-slate-900">
                    {currentQuestion.question}
                  </h2>

                  {currentQuestionIsSata && (
                    <p className="mt-3 text-sm font-medium text-purple-700">
                      Select all that apply.
                    </p>
                  )}

                  <div className="mt-8 space-y-4">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const isSelected = Array.isArray(selectedAnswer)
                        ? selectedAnswer.includes(letter)
                        : selectedAnswer === letter;

                      const isCorrect = currentQuestionIsSata
                        ? (currentQuestion.correctAnswers || []).includes(letter)
                        : currentQuestion.correctAnswer === letter;

                      let classes =
                        "w-full rounded-2xl border p-4 text-left transition duration-200 ";

                      if (!revealed || isExamMode) {
                        classes += isSelected
                          ? "border-blue-300 bg-blue-50 shadow-md"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm";
                      } else {
                        if (isCorrect) {
                          classes += "border-emerald-300 bg-emerald-50";
                        } else if (isSelected && !isCorrect) {
                          classes += "border-red-300 bg-red-50";
                        } else {
                          classes += "border-slate-200 bg-white";
                        }
                      }

                      return (
                        <button
                          key={letter}
                          onClick={() => selectAnswer(letter)}
                          className={classes}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">
                              {letter}
                            </div>
                            <div className="pt-1 text-[15px] leading-7 text-slate-800">
                              {currentQuestion.choices[letter]}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!revealed && !isExamMode ? (
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        onClick={() => guardQuizAction(() => revealAnswer())}
                        disabled={!currentHasSelection}
                        className="rounded-2xl bg-blue-900 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                      >
                        Reveal Answer
                      </button>

                      <button
                        onClick={previousQuestion}
                        disabled={currentIndex === 0}
                        className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                      >
                        Previous Question
                      </button>

                      <button
                        onClick={finishSetNow}
                        className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                      >
                        Finish Set
                      </button>
                    </div>
                  ) : !isExamMode ? (
                    <div className="mt-8">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                        <p className="text-lg font-bold text-slate-900">
                          Correct Answer: {getCorrectAnswerLabel(currentQuestion)}
                        </p>
                        <p className="mt-4 leading-7 text-slate-700">
                          {currentQuestion.rationale}
                        </p>
                      </div>

                      {!isAnswerCorrect(currentQuestion, selectedAnswer) &&
                        currentHasSelection && (
                          <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-4">
                            <div className="mb-3 inline-flex rounded-full border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-purple-700">
                              Ask Lexi About This Question
                            </div>

                            <div className="mb-3 flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  guardQuizAction(() =>
                                    askLexiAboutQuestion(
                                      currentIndex,
                                      "Why is my answer wrong?"
                                    )
                                  )
                                }
                                className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                              >
                                Why is my answer wrong?
                              </button>

                              <button
                                onClick={() =>
                                  guardQuizAction(() =>
                                    askLexiAboutQuestion(
                                      currentIndex,
                                      "Explain the correct answer simply."
                                    )
                                  )
                                }
                                className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                              >
                                Explain simply
                              </button>

                              <button
                                onClick={() =>
                                  guardQuizAction(() =>
                                    askLexiAboutQuestion(
                                      currentIndex,
                                      "How would NCLEX test this again?"
                                    )
                                  )
                                }
                                className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                              >
                                NCLEX angle
                              </button>

                              <button
                                onClick={() =>
                                  guardQuizAction(() =>
                                    askLexiAboutQuestion(
                                      currentIndex,
                                      "Give me a memory trick for this."
                                    )
                                  )
                                }
                                className="rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                              >
                                Memory trick
                              </button>
                            </div>

                            <div className="space-y-3">
                              {(lexiChats[currentIndex] || []).map(
                                (message, msgIndex) => (
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
                                )
                              )}
                            </div>

                            <div className="mt-4 flex gap-3">
                              <input
                                type="text"
                                value={lexiInputs[currentIndex] || ""}
                                onChange={(e) =>
                                  setLexiInput(currentIndex, e.target.value)
                                }
                                placeholder="Ask Lexi about this question..."
                                className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-purple-400"
                              />
                              <button
                                onClick={() =>
                                  guardQuizAction(() =>
                                    askLexiAboutQuestion(currentIndex)
                                  )
                                }
                                disabled={
                                  lexiLoadingMap[currentIndex] ||
                                  !(lexiInputs[currentIndex] || "").trim()
                                }
                                className="rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                              >
                                {lexiLoadingMap[currentIndex] ? "Asking..." : "Ask"}
                              </button>
                            </div>
                          </div>
                        )}

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={previousQuestion}
                          disabled={currentIndex === 0}
                          className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                          Previous Question
                        </button>

                        <button
                          onClick={() => guardQuizAction(() => nextQuestion())}
                          disabled={loading}
                          className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                        >
                          {currentIndex < questions.length - 1
                            ? "Next Question"
                            : "Finish Set"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        onClick={previousQuestion}
                        disabled={currentIndex === 0}
                        className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                      >
                        Previous Question
                      </button>

                      <button
                        onClick={() => guardQuizAction(() => nextQuestion())}
                        disabled={!currentHasSelection || loading}
                        className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                      >
                        {currentIndex < questions.length - 1
                          ? "Lock In & Next"
                          : "Finish Exam"}
                      </button>

                      <button
                        onClick={finishSetNow}
                        className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                      >
                        End Exam
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {showUpgradeModal && !canUseQuiz && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                <div className="absolute inset-0 rounded-3xl bg-slate-950/35 backdrop-blur-[2px]" />

                <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                    🔒
                  </div>

                  <h3 className="text-center text-2xl font-black text-slate-900">
                    Upgrade to use Quiz Generator
                  </h3>

                  <p className="mt-3 text-center text-slate-600">
                    You can preview this page for free, but generating questions,
                    revealing answers, and practicing requires the Starter plan.
                  </p>

                  <div className="mt-6 grid gap-3">
                    <a
                      href="/pricing"
                      className="rounded-2xl bg-orange-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
                    >
                      View Pricing
                    </a>

                    <a
                      href="/checkout?plan=starter-monthly&source=quiz-preview"
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Upgrade Now
                    </a>

                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function QuizPageFallback() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-blue-100 bg-white p-12 shadow-2xl">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
              📝
            </div>
            <h2 className="text-2xl font-bold">Loading quiz...</h2>
            <p className="mt-3 text-slate-600">
              Preparing your quiz page.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizPageFallback />}>
      <QuizPageInner />
    </Suspense>
  );
}