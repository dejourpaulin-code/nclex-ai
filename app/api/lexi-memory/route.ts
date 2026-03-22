import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MemoryRow = {
  topic: string;
  strength_score: number | null;
  weakness_score: number | null;
  mastery_estimate: number | null;
};

type HistoryRow = {
  topic: string;
  is_correct: boolean | null;
  created_at: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const [memoryRes, historyRes] = await Promise.all([
      supabaseAdmin
        .from("user_learning_memory")
        .select("topic, strength_score, weakness_score, mastery_estimate")
        .eq("user_id", userId)
        .limit(20),

      supabaseAdmin
        .from("quiz_history")
        .select("topic, is_correct, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

    const memory = (memoryRes.data || []) as MemoryRow[];
    const history = (historyRes.data || []) as HistoryRow[];

    const wins = [...memory]
      .sort((a, b) => (b.mastery_estimate || 0) - (a.mastery_estimate || 0))
      .slice(0, 3)
      .map((row) => `${row.topic} is becoming a strength.`);

    const watchouts = [...memory]
      .sort((a, b) => (b.weakness_score || 0) - (a.weakness_score || 0))
      .slice(0, 3)
      .map((row) => `${row.topic} keeps showing up as a weak point.`);

    const recentTopics = history.reduce<Record<string, { total: number; wrong: number }>>(
      (acc, row) => {
        if (!acc[row.topic]) {
          acc[row.topic] = { total: 0, wrong: 0 };
        }

        acc[row.topic].total += 1;
        if (!row.is_correct) {
          acc[row.topic].wrong += 1;
        }

        return acc;
      },
      {}
    );

    const focusTopic =
      Object.entries(recentTopics)
        .sort((a, b) => b[1].wrong - a[1].wrong)[0]?.[0] ||
      memory.sort((a, b) => (b.weakness_score || 0) - (a.weakness_score || 0))[0]?.topic ||
      "General Review";

    return NextResponse.json({
      focusTopic,
      wins:
        wins.length > 0
          ? wins
          : ["You are still building enough data for Lexi memory wins."],
      watchouts:
        watchouts.length > 0
          ? watchouts
          : ["No major recurring weak-point pattern yet."],
      summary:
        focusTopic === "General Review"
          ? "Lexi is still learning your patterns."
          : `Lexi is currently most concerned about ${focusTopic}.`,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate Lexi memory." },
      { status: 500 }
    );
  }
}