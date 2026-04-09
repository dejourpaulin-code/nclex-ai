"use client";

import Navbar from "../../components/Navbar";
import AvatarDisplay from "../../components/AvatarDisplay";
import { supabase } from "../../lib/supabase";
import { useEffect, useMemo, useState } from "react";

type DrillQuestion = {
  topic?: string;
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  rationale: string;
};

type AnswerMap  = Record<number, "A" | "B" | "C" | "D" | "">;
type RevealedMap = Record<number, boolean>;
type SavedMap   = Record<number, boolean>;

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
  const [userId,   setUserId]   = useState<string | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error,    setError]    = useState("");

  const [targetTopics, setTargetTopics] = useState<string[]>([]);
  const [questions,    setQuestions]    = useState<DrillQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers,      setAnswers]      = useState<AnswerMap>({});
  const [revealedMap,  setRevealedMap]  = useState<RevealedMap>({});
  const [savedMap,     setSavedMap]     = useState<SavedMap>({});
  const [showSummary,  setShowSummary]  = useState(false);

  const currentQuestion = questions[currentIndex] || null;
  const selectedAnswer  = answers[currentIndex] || "";
  const revealed        = revealedMap[currentIndex] || false;

  useEffect(() => { loadInitial(); }, []);

  async function loadInitial() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You must be logged in to use Quick Drill."); setLoading(false); return; }
    setUserId(user.id);
    const { data: profileRes } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle();
    setProfile((profileRes || null) as Profile | null);
    setLoading(false);
    await generateDrill(user.id);
  }

  async function generateDrill(overrideUserId?: string) {
    const uid = overrideUserId || userId;
    if (!uid) return;
    setGenerating(true); setError(""); setShowSummary(false);
    setQuestions([]); setCurrentIndex(0); setAnswers({}); setRevealedMap({}); setSavedMap({});
    try {
      const res = await fetch("/api/quick-drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, questionCount: 5 }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to generate quick drill."); setGenerating(false); return; }
      setTargetTopics(data.topics || []);
      setQuestions(data.questions || []);
    } catch { setError("Failed to connect to the server."); }
    setGenerating(false);
  }

  function selectAnswer(letter: "A" | "B" | "C" | "D") {
    if (revealed) return;
    setAnswers((prev) => ({ ...prev, [currentIndex]: letter }));
  }

  async function saveDrillResult(index: number) {
    const question = questions[index];
    const selected = answers[index];
    if (!question || !selected || savedMap[index] || !userId) return;
    const isCorrect = selected === question.correctAnswer;
    const topic = question.topic || targetTopics[0] || "Quick Drill";

    await supabase.from("quiz_history").insert({
      user_id: userId, topic, difficulty: "Medium", question_type: "Quick Drill",
      question: question.question, choices: question.choices,
      correct_answer: question.correctAnswer, selected_answer: selected,
      is_correct: isCorrect, rationale: question.rationale,
    });

    const { data: existing } = await supabase.from("user_learning_memory").select("*").eq("user_id", userId).eq("topic", topic).maybeSingle();
    if (!existing) {
      await supabase.from("user_learning_memory").insert({
        user_id: userId, topic,
        strength_score: isCorrect ? 1 : 0, weakness_score: isCorrect ? 0 : 1,
        mastery_estimate: isCorrect ? 10 : 0, last_discussed_at: new Date().toISOString(),
        notes: isCorrect ? "Answered correctly in quick drill." : "Missed in quick drill.",
      });
    } else {
      await supabase.from("user_learning_memory").update({
        strength_score: isCorrect ? (existing.strength_score || 0) + 1 : existing.strength_score,
        weakness_score: isCorrect ? existing.weakness_score : (existing.weakness_score || 0) + 1,
        mastery_estimate: isCorrect ? Math.min((existing.mastery_estimate || 0) + 10, 100) : Math.max((existing.mastery_estimate || 0) - 8, 0),
        last_discussed_at: new Date().toISOString(),
        notes: isCorrect ? "Answered correctly in quick drill." : "Missed in quick drill.",
      }).eq("id", existing.id);
    }

    const { data: wa } = await supabase.from("user_weak_areas").select("*").eq("user_id", userId).eq("topic", topic).maybeSingle();
    if (!wa) {
      await supabase.from("user_weak_areas").insert({ user_id: userId, topic, misses: isCorrect ? 0 : 1, correct: isCorrect ? 1 : 0 });
    } else {
      await supabase.from("user_weak_areas").update({
        misses: isCorrect ? wa.misses : wa.misses + 1,
        correct: isCorrect ? wa.correct + 1 : wa.correct,
        updated_at: new Date().toISOString(),
      }).eq("id", wa.id);
    }

    setSavedMap((prev) => ({ ...prev, [index]: true }));
  }

  async function revealAnswer() {
    if (!currentQuestion || !selectedAnswer || revealed) return;
    setRevealedMap((prev) => ({ ...prev, [currentIndex]: true }));
    await saveDrillResult(currentIndex);
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) setCurrentIndex((p) => p + 1);
    else setShowSummary(true);
  }

  const answeredCount = questions.filter((_, i) => savedMap[i]).length;
  const correctCount  = questions.filter((q, i) => savedMap[i] && answers[i] === q.correctAnswer).length;
  const drillPercent  = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);

  const summaryMessage = useMemo(() => {
    if (answeredCount === 0) return "Finish more questions for Lexi to coach your next move.";
    if (drillPercent >= 80) return "Strong drill. Try a larger mixed quiz or a tougher follow-up set.";
    if (drillPercent >= 60) return "Solid progress. Run one more drill on the same weak area to lock it in.";
    return "Stay in targeted mode — let Lexi rebuild the weak spot step by step.";
  }, [answeredCount, drillPercent]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-5">
        {/* Compact header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-700">
              Lexi Quick Drill
            </div>
            <h1 className="text-2xl font-black tracking-tight">3-Minute Drill</h1>
            <p className="text-sm text-slate-500">Fast targeted mini-session built from your weak areas.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => generateDrill()} disabled={generating || loading}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
              {generating ? "Generating..." : "Regenerate"}
            </button>
            <a href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Dashboard
            </a>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading quick drill...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        ) : showSummary ? (
          /* ── Summary ── */
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg">⚡</div>
              <div>
                <h2 className="text-lg font-black">Drill Complete</h2>
                <p className="text-sm text-slate-500">{summaryMessage}</p>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { label: "Answered", val: answeredCount, bg: "bg-blue-50 border-blue-100" },
                { label: "Correct",  val: correctCount,  bg: "bg-orange-50 border-orange-100" },
                { label: "Accuracy", val: `${drillPercent}%`, bg: "bg-emerald-50 border-emerald-100" },
              ].map(({ label, val, bg }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-0.5 text-xl font-bold">{val}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => generateDrill()}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
                Run Another Drill
              </button>
              <a href="/quiz?topic=Use%20Weak%20Areas%20Only&count=10&mode=Tutor%20Mode"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Larger Targeted Set
              </a>
              <a href="/dashboard"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Dashboard
              </a>
            </div>
          </div>
        ) : !currentQuestion ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-700">Preparing your drill...</p>
            <p className="mt-1 text-xs text-slate-500">Lexi is building a focused mini-set from your weak areas.</p>
          </div>
        ) : (
          /* ── Active drill ── */
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">

            {/* Sidebar */}
            <aside className="space-y-3">
              {/* Lexi + topics */}
              <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <AvatarDisplay lexi size={48} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">Lexi is targeting:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {targetTopics.map((t) => (
                        <span key={t} className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Question dots */}
              <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-bold text-slate-700">Progress</p>
                <div className="flex flex-wrap gap-1.5">
                  {questions.map((_, i) => {
                    const isCurrent  = i === currentIndex;
                    const isAnswered = !!savedMap[i];
                    return (
                      <button key={i} onClick={() => setCurrentIndex(i)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                          isCurrent  ? "border-blue-900 bg-blue-900 text-white" :
                          isAnswered ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
                          "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        }`}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-orange-400 transition-all"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}/>
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-2 text-center">
                    <p className="text-[10px] text-slate-400">Answered</p>
                    <p className="text-base font-bold">{answeredCount}/{questions.length}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 text-center">
                    <p className="text-[10px] text-slate-400">Correct</p>
                    <p className="text-base font-bold">{correctCount}</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Question card */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              {/* Tags */}
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-semibold text-orange-700">Quick Drill</span>
                <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-800">
                  {currentQuestion.topic || targetTopics[0] || "Targeted Topic"}
                </span>
                <span className="ml-auto rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>

              {/* Question text */}
              <p className="mb-4 text-base font-semibold leading-relaxed text-slate-900">
                {currentQuestion.question}
              </p>

              {/* Answer choices */}
              <div className="space-y-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const isSelected = selectedAnswer === letter;
                  const isCorrect  = currentQuestion.correctAnswer === letter;
                  let cls = "w-full rounded-xl border p-3 text-left text-sm transition ";
                  if (!revealed) {
                    cls += isSelected ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50";
                  } else {
                    cls += isCorrect ? "border-emerald-300 bg-emerald-50" :
                           isSelected ? "border-red-300 bg-red-50" : "border-slate-200 bg-white";
                  }
                  return (
                    <button key={letter} onClick={() => selectAnswer(letter)} className={cls}>
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                          {letter}
                        </span>
                        <span className="pt-0.5 leading-6 text-slate-800">{currentQuestion.choices[letter]}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              {!revealed ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={revealAnswer} disabled={!selectedAnswer}
                    className="rounded-xl bg-blue-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50">
                    Reveal Answer
                  </button>
                  <button onClick={() => currentIndex > 0 && setCurrentIndex((p) => p - 1)} disabled={currentIndex === 0}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                    Previous
                  </button>
                  <button onClick={() => setShowSummary(true)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    End Drill
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm font-bold text-slate-900">Correct Answer: {currentQuestion.correctAnswer}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{currentQuestion.rationale}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => currentIndex > 0 && setCurrentIndex((p) => p - 1)} disabled={currentIndex === 0}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                      Previous
                    </button>
                    <button onClick={nextQuestion}
                      className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
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
