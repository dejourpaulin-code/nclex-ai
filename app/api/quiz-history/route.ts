import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for quiz-history route.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("quiz_sessions")
      .select(`
        id,
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
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("quiz history load error:", error);
      return NextResponse.json(
        { error: "Failed to load quiz history." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessions: data || [],
    });
  } catch (error) {
    console.error("quiz history route error:", error);
    return NextResponse.json(
      { error: "Failed to load quiz history." },
      { status: 500 }
    );
  }
}