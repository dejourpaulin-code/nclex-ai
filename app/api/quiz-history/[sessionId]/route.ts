import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for quiz-history/[sessionId] route.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId } = await req.json();
    const sessionId = params.sessionId;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("quiz_sessions")
      .select(`
        id,
        user_id,
        topic,
        difficulty,
        question_type,
        total_questions,
        correct_count,
        incorrect_count,
        accuracy,
        created_at,
        updated_at
      `)
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError || !session) {
      console.error("quiz session lookup error:", sessionError);
      return NextResponse.json(
        { error: "Quiz session not found." },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("quiz_history")
      .select(`
        id,
        session_id,
        topic,
        difficulty,
        question_type,
        question,
        choices,
        correct_answer,
        selected_answer,
        correct_answers,
        selected_answers,
        is_correct,
        rationale,
        created_at
      `)
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (questionsError) {
      console.error("quiz history question load error:", questionsError);
      return NextResponse.json(
        { error: "Failed to load quiz session questions." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session,
      questions: questions || [],
    });
  } catch (error) {
    console.error("quiz-history/[sessionId] route error:", error);
    return NextResponse.json(
      { error: "Failed to load quiz session." },
      { status: 500 }
    );
  }
}