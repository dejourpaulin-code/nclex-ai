import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request,
  context: { params: Promise<{ examId: string }> }
) {
  try {
    const body = await req.json();
    const userId =
      typeof body.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : null;

    const { examId } = await context.params;

    if (!userId || !examId) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("cat_exams")
      .select(
        "id, title, topic, topic_details, score, created_at, updated_at, questions, answers"
      )
      .eq("id", examId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      console.error("CAT HISTORY DETAIL ERROR:", error);
      return NextResponse.json(
        { error: "Failed to load CAT exam." },
        { status: 500 }
      );
    }

    return NextResponse.json({ exam: data });
  } catch (error) {
    console.error("CAT HISTORY DETAIL ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load CAT exam." },
      { status: 500 }
    );
  }
}