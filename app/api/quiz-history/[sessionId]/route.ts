import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for quiz-history session route.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const body = await req.json();

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : "";

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const { sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("quiz_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError) {
      console.error("quiz session load error:", sessionError);
      return NextResponse.json(
        { error: "Failed to load quiz session." },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Quiz session not found." },
        { status: 404 }
      );
    }

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("quiz_history")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (questionsError) {
      console.error("quiz history load error:", questionsError);
      return NextResponse.json(
        { error: "Failed to load quiz history." },
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