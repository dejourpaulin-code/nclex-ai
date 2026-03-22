"use client";

import Navbar from "../../components/Navbar";
import AvatarDisplay from "../../components/AvatarDisplay";
import { supabase } from "../../lib/supabase";
import { useEffect, useMemo, useState } from "react";

type DrillQuestion = {
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

type AnswerMap = Record<number, "A" | "B" | "C" | "D" | "">;
type RevealedMap = Record<number, boolean>;
type SavedMap = Record<number, boolean>;

type Profile = {
  avatar_id: string;
  equipped_hat: string | null;
  equipped_badge: string | null;
  equipped_stethoscope: string | null;
  equipped_scrubs: string | null;
  education_level: string;
  semester_label: string;
  explanation_style: string;
};

export default function DrillPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [targetTopics, setTargetTopics] = useState<string[]>([]);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [revealedMap, setRevealedMap] = useState<RevealedMap>({});
  const [savedMap, setSavedMap] = useState<SavedMap>({});
  const [showSummary, setShowSummary] = useState(false);

  const currentQuestion = questions[currentIndex] || null;
  const selectedAnswer = answers[currentIndex] || "";
  const revealed = revealedMap[currentIndex] || false;

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to use Quick Drill.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: profileRes } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setProfile((profileRes || null) as Profile | null);
    setLoading(false);

    await generateDrill(user.id);
  }

  async function generateDrill(overrideUserId?: string) {
    const finalUserId = overrideUserId || userId;
    if (!finalUserId) return;

    setGenerating(true);
    setError("");
    setShowSummary(false);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setRevealedMap({});
    setSavedMap({});

    try {
      const res = await fetch("/api/quick-drill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: finalUserId,
          questionCount: 5,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate quick drill.");
        setGenerating(false);
        return;
      }

      setTargetTopics(data.topics || []);
      setQuestions(data.questions || []);
    } catch {
      setError("Failed to connect to the server.");
    }

    setGenerating(false);
  }

  function selectAnswer(letter: "A" | "B" | "C" | "D") {
    if (revealed) return;

    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: letter,
    }));
  }

  async function saveDrillResult(index: number) {
    const question = questions[index];
    const selected = answers[index];

    if (!question || !selected || savedMap[index]) return;

    const isCorrect = selected === question.correctAnswer;
    const topic = question.topic || targetTopics[0] || "Quick Drill";

    if (!userId) return;

    await supabase.from("quiz_history").insert({
      user_id: userId,
      topic,
      difficulty: "Medium",
      question_type: "Quick Drill",
      question: question.question,
      choices: question.choices,
      correct_answer: question.correctAnswer,
      selected_answer: selected,
      is_correct: isCorrect,
      rationale: question.rationale,
    });

    const { data: existingMemory } = await supabase
      .from("user_learning_memory")
      .select("*")
      .eq("user_id", userId)
      .eq("topic", topic)
      .maybeSingle();

    if (!existingMemory) {
      await supabase.from("user_learning_memory").insert({
        user_id: userId,
        topic,
        strength_score: isCorrect ? 1 : 0,
        weakness_score: isCorrect ? 0 : 1,
        mastery_estimate: isCorrect ? 10 : 0,
        last_discussed_at: new Date().toISOString(),
        notes: isCorrect
          ? "User answered correctly in quick drill."
          : "User missed this topic in quick drill.",
      });
    } else {
      await supabase
        .from("user_learning_memory")
        .update({
          strength_score: isCorrect
            ? (existingMemory.strength_score || 0) + 1
            : existingMemory.strength_score,
          weakness_score: isCorrect
            ? existingMemory.weakness_score
            : (existingMemory.weakness_score || 0) + 1,
          mastery_estimate: isCorrect
            ? Math.min((existingMemory.mastery_estimate || 0) + 10, 100)
            : Math.max((existingMemory.mastery_estimate || 0) - 8, 0),
          last_discussed_at: new Date().toISOString(),
          notes: isCorrect
            ? "User answered correctly in quick drill."
            : "User missed this topic in quick drill.",
        })
        .eq("id", existingMemory.id);
    }

    const { data: existingWeakArea } = await supabase
      .from("user_weak_areas")
      .select("*")
      .eq("user_id", userId)
      .eq("topic", topic)
      .maybeSingle();

    if (!existingWeakArea) {
      await supabase.from("user_weak_areas").insert({
        user_id: userId,
        topic,
        misses: isCorrect ? 0 : 1,
        correct: isCorrect ? 1 : 0,
      });
    } else {
      await supabase
        .from("user_weak_areas")
        .update({
          misses: isCorrect ? existingWeakArea.misses : existingWeakArea.misses + 1,
          correct: isCorrect
            ? existingWeakArea.correct + 1
            : existingWeakArea.correct,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingWeakArea.id);
    }

    setSavedMap((prev) => ({
      ...prev,
      [index]: true,
    }));
  }

  async function revealAnswer() {
    if (!currentQuestion || !selectedAnswer || revealed) return;

    setRevealedMap((prev) => ({
      ...prev,
      [currentIndex]: true,
    }));

    await saveDrillResult(currentIndex);
  }

  function previousQuestion() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function goToQuestion(index: number) {
    setCurrentIndex(index);
  }

  function finishNow() {
    setShowSummary(true);
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
    }
  }

  const answeredCount = questions.filter((_, index) => savedMap[index]).length;
  const correctCount = questions.filter((question, index) => {
    const answer = answers[index];
    return savedMap[index] && answer === question.correctAnswer;
  }).length;

  const drillPercent =
    answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);

  const summaryMessage = useMemo(() => {
    if (answeredCount === 0) {
      return "You didn’t finish enough of the drill for Lexi to coach your next move yet.";
    }

    if (drillPercent >= 80) {
      return "Strong drill. Lexi would recommend either a larger mixed quiz or a tougher follow-up set.";
    }

    if (drillPercent >= 60) {
      return "Solid progress. Run one more quick drill on the same weak area to lock it in.";
    }

    return "This is exactly why the drill exists. Stay in targeted mode and let Lexi rebuild the weak spot step by step.";
  }, [answeredCount, drillPercent]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-4 py-1 text-sm font-medium text-orange-700">
              Lexi Quick Drill
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              3-Minute Drill
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              A fast targeted mini-session built from your weak areas and learning memory.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => generateDrill()}
              disabled={generating || loading}
              className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Regenerate Drill"}
            </button>

            <a
              href="/dashboard"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Back to Dashboard
            </a>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-xl">
            Loading quick drill...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-xl">
            <p className="font-semibold text-red-700">{error}</p>
          </div>
        ) : showSummary ? (
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                ⚡
              </div>
              <h2 className="text-3xl font-black">Quick Drill Complete</h2>
              <p className="mt-3 text-slate-600">{summaryMessage}</p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
                <p className="text-sm text-slate-500">Answered</p>
                <p className="mt-2 text-3xl font-bold">{answeredCount}</p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 text-center">
                <p className="text-sm text-slate-500">Correct</p>
                <p className="mt-2 text-3xl font-bold">{correctCount}</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
                <p className="text-sm text-slate-500">Accuracy</p>
                <p className="mt-2 text-3xl font-bold">{drillPercent}%</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => generateDrill()}
                className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                Run Another Drill
              </button>

              <a
                href="/quiz?topic=Use%20Weak%20Areas%20Only&count=10&mode=Tutor%20Mode"
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Do a Larger Targeted Set
              </a>

              <a
                href="/dashboard"
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        ) : !currentQuestion ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-12 shadow-2xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                🧠
              </div>
              <h2 className="text-2xl font-bold">Preparing your drill...</h2>
              <p className="mt-3 text-slate-600">
                Lexi is building a focused mini-set from your current weak areas.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
                <div className="flex items-start gap-4">
                  <AvatarDisplay lexi size={72} />
                  <div>
                    <h2 className="text-xl font-bold">Lexi Coach</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      This drill is targeting:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {targetTopics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold">Drill Progress</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Fast reps. Tight feedback.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
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
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold">What this is for</h2>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    Target your weakest patterns quickly.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    Build confidence without needing a full quiz session.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    Feed better data back into Lexi’s coaching system.
                  </div>
                </div>
              </div>
            </aside>

            <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-2xl">
              <div className="mb-6">
                <div className="mb-4 flex flex-wrap gap-3">
                  <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700">
                    Quick Drill
                  </span>
                  <span className="rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-800">
                    {currentQuestion.topic || targetTopics[0] || "Targeted Topic"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-700">
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

              <h2 className="text-2xl font-bold leading-relaxed text-slate-900">
                {currentQuestion.question}
              </h2>

              <div className="mt-8 space-y-4">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const isSelected = selectedAnswer === letter;
                  const isCorrect = currentQuestion.correctAnswer === letter;

                  let classes =
                    "w-full rounded-2xl border p-4 text-left transition duration-200 ";

                  if (!revealed) {
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

              {!revealed ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={revealAnswer}
                    disabled={!selectedAnswer}
                    className="rounded-2xl bg-blue-900 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    Reveal Answer
                  </button>

                  <button
                    onClick={previousQuestion}
                    disabled={currentIndex === 0}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <button
                    onClick={finishNow}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    End Drill
                  </button>
                </div>
              ) : (
                <div className="mt-8">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                    <p className="text-lg font-bold text-slate-900">
                      Correct Answer: {currentQuestion.correctAnswer}
                    </p>
                    <p className="mt-4 leading-7 text-slate-700">
                      {currentQuestion.rationale}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={previousQuestion}
                      disabled={currentIndex === 0}
                      className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <button
                      onClick={nextQuestion}
                      className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
                    >
                      {currentIndex < questions.length - 1 ? "Next Question" : "Finish Drill"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}