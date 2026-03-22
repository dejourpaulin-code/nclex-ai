import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const missionPool = [
  {
    type: "quick_drill",
    label: "Complete 1 Quick Drill",
    goal: 1,
  },
  {
    type: "weak_quiz",
    label: "Practice your weakest topic",
    goal: 1,
  },
  {
    type: "answer_questions",
    label: "Answer 10 questions",
    goal: 10,
  },
  {
    type: "review_history",
    label: "Review 3 incorrect answers",
    goal: 3,
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabaseAdmin
      .from("user_daily_missions")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_date", today);

    if (existing && existing.length > 0) {
      return NextResponse.json({ missions: existing });
    }

    const shuffled = missionPool.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    const missions = selected.map((m) => ({
      user_id: userId,
      mission_date: today,
      mission_type: m.type,
      mission_label: m.label,
      goal_count: m.goal,
    }));

    const { data } = await supabaseAdmin
      .from("user_daily_missions")
      .insert(missions)
      .select("*");

    return NextResponse.json({ missions: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create missions" },
      { status: 500 }
    );
  }
}