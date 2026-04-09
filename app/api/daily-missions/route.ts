import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";

// Deterministic daily mission set — rotates every day, same for everyone on the same day
const MISSION_POOL = [
  { type: "answer_10",      label: "Answer 10 questions today",        goal: 10 },
  { type: "answer_5",       label: "Answer 5 questions today",         goal: 5  },
  { type: "get_3_correct",  label: "Get 3 correct answers in a row",   goal: 3  },
  { type: "weak_area",      label: "Answer a weak-area question",      goal: 1  },
  { type: "answer_20",      label: "Answer 20 questions today",        goal: 20 },
  { type: "accuracy_60",    label: "Hit 60% accuracy today",           goal: 60 },
  { type: "quick_drill",    label: "Complete a Quick Drill session",    goal: 1  },
  { type: "correct_5",      label: "Get 5 correct answers today",      goal: 5  },
];

// Pick 3 missions deterministically from today's date
function getDailyMissions(dateStr: string) {
  const seed = dateStr.split("-").reduce((acc, n) => acc + parseInt(n), 0);
  const indices: number[] = [];
  let i = seed;
  while (indices.length < 3) {
    const idx = i % MISSION_POOL.length;
    if (!indices.includes(idx)) indices.push(idx);
    i = (i * 31 + 7) % 100;
  }
  return indices.map((idx) => MISSION_POOL[idx]);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const todayStart = `${today}T00:00:00.000Z`;
    const todayEnd   = `${today}T23:59:59.999Z`;

    // Fetch today's quiz_history rows for progress computation
    const { data: todayHistory } = await supabase
      .from("quiz_history")
      .select("is_correct, topic, question_type, created_at")
      .eq("user_id", userId)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd);

    const rows = todayHistory || [];
    const totalAnswered = rows.length;
    const totalCorrect  = rows.filter((r) => r.is_correct === true).length;
    const accuracy      = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    // Find user's top weak area
    const { data: weakAreas } = await supabase
      .from("user_weak_areas")
      .select("topic")
      .eq("user_id", userId)
      .order("misses", { ascending: false })
      .limit(3);

    const weakTopics = (weakAreas || []).map((w) => w.topic as string);
    const answeredWeakToday = rows.filter((r) => weakTopics.includes(r.topic)).length;
    const drillsToday = rows.filter((r) => r.question_type === "Quick Drill").length;

    // Compute max consecutive correct streak
    let maxStreak = 0, streak = 0;
    for (const r of rows) {
      if (r.is_correct === true) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }

    const missions = getDailyMissions(today);

    const result = missions.map((m) => {
      let progress = 0;
      if (m.type === "answer_10")     progress = Math.min(totalAnswered, 10);
      if (m.type === "answer_5")      progress = Math.min(totalAnswered, 5);
      if (m.type === "answer_20")     progress = Math.min(totalAnswered, 20);
      if (m.type === "get_3_correct") progress = Math.min(maxStreak, 3);
      if (m.type === "correct_5")     progress = Math.min(totalCorrect, 5);
      if (m.type === "weak_area")     progress = Math.min(answeredWeakToday, 1);
      if (m.type === "accuracy_60")   progress = Math.min(accuracy, 60);
      if (m.type === "quick_drill")   progress = Math.min(drillsToday > 0 ? 1 : 0, 1);

      return {
        id: m.type,
        mission_type: m.type,
        mission_label: m.label,
        goal_count: m.goal,
        progress_count: progress,
        completed: progress >= m.goal,
      };
    });

    return NextResponse.json({ missions: result });
  } catch (err) {
    console.error("daily-missions error:", err);
    return NextResponse.json({ error: "Failed to load missions" }, { status: 500 });
  }
}
