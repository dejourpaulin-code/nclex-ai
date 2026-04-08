import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for quiz-history/save route.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

type AnswerLetter = "A" | "B" | "C" | "D";

type ChoiceMap = {
  A: string;
  B: string;
  C: string;
  D: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAnswerLetter(value: unknown): value is AnswerLetter {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function normalizeAnswerLetter(value: unknown): AnswerLetter | "" {
  if (typeof value !== "string") return "";
  const upper = value.trim().toUpperCase();
  return upper === "A" || upper === "B" || upper === "C" || upper === "D" ? upper : "";
}

function normalizeAnswerLetters(value: unknown): AnswerLetter[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter((item): item is AnswerLetter => isAnswerLetter(item))
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .sort();
}

function normalizeAnswerLettersFromUnknown(value: unknown): AnswerLetter[] {
  if (Array.isArray(value)) {
    return normalizeAnswerLetters(value);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter((item): item is AnswerLetter => isAnswerLetter(item))
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .sort();
  }

  return [];
}

function normalizeChoices(value: unknown): ChoiceMap | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<Record<keyof ChoiceMap, unknown>>;

  const A = isNonEmptyString(raw.A) ? raw.A.trim() : "";
  const B = isNonEmptyString(raw.B) ? raw.B.trim() : "";
  const C = isNonEmptyString(raw.C) ? raw.C.trim() : "";
  const D = isNonEmptyString(raw.D) ? raw.D.trim() : "";

  if (!A || !B || !C || !D) return null;

  return { A, B, C, D };
}

function areAnswerArraysEqual(a: AnswerLetter[], b: AnswerLetter[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function isSataQuestionType(questionType: string): boolean {
  return questionType.trim() === "Select All That Apply";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = String(body?.userId || "").trim();
    const topic = String(body?.topic || "").trim();
    const difficulty = String(body?.difficulty || "").trim();
    const questionType = String(body?.questionType || "").trim();
    const question = String(body?.question || "").trim();
    const rationale = String(body?.rationale || "").trim();

    const choices = normalizeChoices(body?.choices);

    const sessionId =
      typeof body?.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim()
        : crypto.randomUUID();

    const sata = isSataQuestionType(questionType);

    const correctAnswer = normalizeAnswerLetter(body?.correctAnswer);
    const selectedAnswer = normalizeAnswerLetter(body?.selectedAnswer);

    const correctAnswers =
      normalizeAnswerLettersFromUnknown(body?.correctAnswers).length > 0
        ? normalizeAnswerLettersFromUnknown(body?.correctAnswers)
        : normalizeAnswerLettersFromUnknown(body?.correctAnswer);

    const selectedAnswers =
      normalizeAnswerLettersFromUnknown(body?.selectedAnswers).length > 0
        ? normalizeAnswerLettersFromUnknown(body?.selectedAnswers)
        : normalizeAnswerLettersFromUnknown(body?.selectedAnswer);

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    if (!topic || !question) {
      return NextResponse.json(
        { error: "Missing required quiz history fields." },
        { status: 400 }
      );
    }

    if (!choices) {
      return NextResponse.json(
        { error: "Valid answer choices are required." },
        { status: 400 }
      );
    }

    if (sata) {
      if (correctAnswers.length < 1 || selectedAnswers.length < 1) {
        return NextResponse.json(
          { error: "Missing required SATA answer fields." },
          { status: 400 }
        );
      }
    } else {
      if (!correctAnswer || !selectedAnswer) {
        return NextResponse.json(
          { error: "Missing required quiz history fields." },
          { status: 400 }
        );
      }
    }

    const isCorrect = sata
      ? areAnswerArraysEqual(selectedAnswers, correctAnswers)
      : selectedAnswer === correctAnswer;

    const { error: sessionUpsertError } = await supabaseAdmin
      .from("quiz_sessions")
      .upsert(
        {
          id: sessionId,
          user_id: userId,
          topic,
          difficulty: difficulty || null,
          question_type: questionType || null,
        },
        {
          onConflict: "id",
        }
      );

    if (sessionUpsertError) {
      console.error("quiz_sessions upsert error:", sessionUpsertError);
      return NextResponse.json(
        {
          error: "Failed to create or update quiz session.",
          details: sessionUpsertError.message,
        },
        { status: 500 }
      );
    }

    // IMPORTANT:
    // Your current DB schema appears to only support singular columns:
    // correct_answer and selected_answer
    // So for SATA we store comma-joined values in those same columns.
    const storedCorrectAnswer = sata
      ? correctAnswers.join(", ")
      : correctAnswer;

    const storedSelectedAnswer = sata
      ? selectedAnswers.join(", ")
      : selectedAnswer;

    const historyInsertPayload = {
      session_id: sessionId,
      user_id: userId,
      topic,
      difficulty: difficulty || null,
      question_type: questionType || null,
      question,
      choices,
      correct_answer: storedCorrectAnswer || null,
      selected_answer: storedSelectedAnswer || null,
      is_correct: isCorrect,
      rationale: rationale || null,
    };

    const { error: historyError } = await supabaseAdmin
      .from("quiz_history")
      .insert(historyInsertPayload);

    if (historyError) {
      console.error("quiz_history insert error:", historyError);
      return NextResponse.json(
        {
          error: "Failed to save quiz history.",
          details: historyError.message,
        },
        { status: 500 }
      );
    }

    let warning = "";

    const { data: sessionRows, error: sessionRowsError } = await supabaseAdmin
      .from("quiz_history")
      .select("is_correct")
      .eq("session_id", sessionId);

    const total = sessionRows?.length ?? 0;
    const correct = sessionRows?.filter((row) => row.is_correct === true).length ?? 0;
    const incorrect = total - correct;
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

    if (sessionRowsError) {
      console.error("quiz_history session stats lookup error:", sessionRowsError);
      warning = "Quiz result saved, but session stats could not be refreshed.";
    } else {
      const { error: sessionStatsUpdateError } = await supabaseAdmin
        .from("quiz_sessions")
        .update({
          total_questions: total,
          correct_count: correct,
          incorrect_count: incorrect,
          accuracy,
        })
        .eq("id", sessionId);

      if (sessionStatsUpdateError) {
        console.error("quiz_sessions stats update error:", sessionStatsUpdateError);
        warning = "Quiz result saved, but session stats could not be refreshed.";
      }
    }

    // Non-blocking updates
    try {
      const { data: existingMemory } = await supabaseAdmin
        .from("user_learning_memory")
        .select("*")
        .eq("user_id", userId)
        .eq("topic", topic)
        .maybeSingle();

      if (!existingMemory) {
        await supabaseAdmin.from("user_learning_memory").insert({
          user_id: userId,
          topic,
          strength_score: isCorrect ? 1 : 0,
          weakness_score: isCorrect ? 0 : 1,
          mastery_estimate: isCorrect ? 10 : 0,
          last_discussed_at: new Date().toISOString(),
          notes: isCorrect
            ? "User answered correctly in quiz."
            : "User missed this topic in quiz.",
        });
      } else {
        await supabaseAdmin
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
              ? "User answered correctly in quiz."
              : "User missed this topic in quiz.",
          })
          .eq("id", existingMemory.id);
      }
    } catch (memoryError) {
      console.error("user_learning_memory non-blocking error:", memoryError);
    }

    try {
      const { data: existingWeakArea } = await supabaseAdmin
        .from("user_weak_areas")
        .select("*")
        .eq("user_id", userId)
        .eq("topic", topic)
        .maybeSingle();

      if (!existingWeakArea) {
        await supabaseAdmin.from("user_weak_areas").insert({
          user_id: userId,
          topic,
          misses: isCorrect ? 0 : 1,
          correct: isCorrect ? 1 : 0,
        });
      } else {
        await supabaseAdmin
          .from("user_weak_areas")
          .update({
            misses: isCorrect
              ? Number(existingWeakArea.misses || 0)
              : Number(existingWeakArea.misses || 0) + 1,
            correct: isCorrect
              ? Number(existingWeakArea.correct || 0) + 1
              : Number(existingWeakArea.correct || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingWeakArea.id);
      }
    } catch (weakAreaError) {
      console.error("user_weak_areas non-blocking error:", weakAreaError);
    }

    // Fire-and-forget unlock check
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nclexai.com";
      void fetch(`${baseUrl}/api/check-unlocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      sessionId,
      isCorrect,
      warning,
      sessionStats: {
        totalQuestions: total,
        correctCount: correct,
        incorrectCount: incorrect,
        accuracy,
      },
    });
  } catch (error) {
    console.error("quiz-history/save route error:", error);

    return NextResponse.json(
      { error: "Failed to save quiz result." },
      { status: 500 }
    );
  }
}