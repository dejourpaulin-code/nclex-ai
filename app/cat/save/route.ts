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

    const examId =
      typeof body.examId === "string" && body.examId.trim()
        ? body.examId.trim()
        : null;

    const userId =
      typeof body.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : null;

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 80)
        : null;

    const topic =
      typeof body.topic === "string" && body.topic.trim()
        ? body.topic.trim()
        : null;

    const topicDetails =
      typeof body.topicDetails === "string" && body.topicDetails.trim()
        ? body.topicDetails.trim()
        : null;

    const questions = Array.isArray(body.questions) ? body.questions : [];
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const score =
      typeof body.score === "number" && Number.isFinite(body.score)
        ? body.score
        : null;

    if (!userId || !title) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (examId) {
      const { data, error } = await supabase
        .from("cat_exams")
        .update({
          title,
          topic,
          topic_details: topicDetails,
          questions,
          answers,
          score,
          updated_at: new Date().toISOString(),
        })
        .eq("id", examId)
        .eq("user_id", userId)
        .select("id")
        .single();

      if (error || !data) {
        console.error("CAT EXAM UPDATE ERROR:", error);
        return NextResponse.json(
          { error: "Failed to update CAT exam." },
          { status: 500 }
        );
      }

      return NextResponse.json({ examId: data.id });
    }

    const { data, error } = await supabase
      .from("cat_exams")
      .insert({
        user_id: userId,
        title,
        topic,
        topic_details: topicDetails,
        questions,
        answers,
        score,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("CAT EXAM INSERT ERROR:", error);
      return NextResponse.json(
        { error: "Failed to create CAT exam." },
        { status: 500 }
      );
    }

    return NextResponse.json({ examId: data.id });
  } catch (error) {
    console.error("CAT EXAM ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to save CAT exam." },
      { status: 500 }
    );
  }
}