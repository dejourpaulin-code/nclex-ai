import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId =
      typeof body.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : null;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("cat_exams")
      .select(
        "id, title, topic, topic_details, score, created_at, updated_at, questions, answers"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("CAT HISTORY ERROR:", error);
      return NextResponse.json(
        { error: "Failed to load CAT exam history." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exams: data || [],
    });
  } catch (error) {
    console.error("CAT HISTORY ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load CAT exam history." },
      { status: 500 }
    );
  }
}