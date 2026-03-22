import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MemoryRow = {
  id: string;
  topic: string;
  strength_score: number | null;
  weakness_score: number | null;
  mastery_estimate: number | null;
};

type WeakAreaRow = {
  id: string;
  topic: string;
  misses: number;
  correct: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lectureId = body.lectureId as string | undefined;
    const userId = body.userId as string | undefined;

    if (!lectureId || !userId) {
      return NextResponse.json(
        { error: "Missing lectureId or userId." },
        { status: 400 }
      );
    }

    const { data: lecture, error: lectureError } = await supabaseAdmin
      .from("lecture_sessions")
      .select("id, summary, extracted_topics, testable_concepts, flashcards")
      .eq("id", lectureId)
      .eq("user_id", userId)
      .maybeSingle();

    if (lectureError || !lecture) {
      return NextResponse.json(
        { error: "Lecture not found." },
        { status: 404 }
      );
    }

    const topics: string[] = Array.isArray(lecture.extracted_topics)
      ? lecture.extracted_topics
      : [];

    if (topics.length === 0) {
      return NextResponse.json({
        success: true,
        updatedTopics: [],
        message: "No extracted topics found to sync.",
      });
    }

    for (const topic of topics) {
      const { data: existingMemory } = await supabaseAdmin
        .from("user_learning_memory")
        .select("id, topic, strength_score, weakness_score, mastery_estimate")
        .eq("user_id", userId)
        .eq("topic", topic)
        .maybeSingle();

      if (!existingMemory) {
        await supabaseAdmin.from("user_learning_memory").insert({
          user_id: userId,
          topic,
          strength_score: 1,
          weakness_score: 0,
          mastery_estimate: 8,
          last_discussed_at: new Date().toISOString(),
          notes: "Lecture content synced into Lexi memory.",
        });
      } else {
        const memory = existingMemory as MemoryRow;

        await supabaseAdmin
          .from("user_learning_memory")
          .update({
            strength_score: (memory.strength_score || 0) + 1,
            mastery_estimate: Math.min((memory.mastery_estimate || 0) + 6, 100),
            last_discussed_at: new Date().toISOString(),
            notes: "Lecture content synced into Lexi memory.",
          })
          .eq("id", memory.id);
      }

      const { data: existingWeak } = await supabaseAdmin
        .from("user_weak_areas")
        .select("id, topic, misses, correct")
        .eq("user_id", userId)
        .eq("topic", topic)
        .maybeSingle();

      if (!existingWeak) {
        await supabaseAdmin.from("user_weak_areas").insert({
          user_id: userId,
          topic,
          misses: 0,
          correct: 1,
        });
      } else {
        const weak = existingWeak as WeakAreaRow;

        await supabaseAdmin
          .from("user_weak_areas")
          .update({
            correct: (weak.correct || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", weak.id);
      }
    }

    return NextResponse.json({
      success: true,
      updatedTopics: topics,
      message: "Lecture synced into learning memory and topic tracking.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to sync lecture into memory." },
      { status: 500 }
    );
  }
}