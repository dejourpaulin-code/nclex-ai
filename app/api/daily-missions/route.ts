import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = "nodejs";

// Generic missions that rotate daily
const GENERIC_POOL = [
  { type: "answer_10",     label: "Answer 10 questions today",      goal: 10 },
  { type: "answer_5",      label: "Answer 5 questions today",       goal: 5  },
  { type: "get_3_correct", label: "Get 3 correct answers in a row", goal: 3  },
  { type: "answer_20",     label: "Answer 20 questions today",      goal: 20 },
  { type: "accuracy_60",   label: "Hit 60% accuracy today",         goal: 60 },
  { type: "correct_5",     label: "Get 5 correct answers today",    goal: 5  },
  { type: "quick_drill",   label: "Complete a Quick Drill session",  goal: 1  },
  { type: "answer_3",      label: "Answer 3 questions today",       goal: 3  },
];

// Use local date in the user's approximate timezone via UTC offset sent from client,
// falling back to UTC. Date string format: YYYY-MM-DD
function getLocalDateStr(utcOffsetMinutes?: number): string {
  const now = new Date();
  if (typeof utcOffsetMinutes === "number") {
    const local = new Date(now.getTime() + utcOffsetMinutes * 60 * 1000);
    return local.toISOString().split("T")[0];
  }
  return now.toISOString().split("T")[0];
}

// Pick 2 generic missions deterministically from date seed
function pickGenericMissions(dateStr: string, count: number) {
  const seed = dateStr.split("-").reduce((acc, n, idx) => acc + parseInt(n) * (idx + 1) * 13, 0);
  const indices: number[] = [];
  let i = seed;
  while (indices.length < count) {
    const idx = ((i % GENERIC_POOL.length) + GENERIC_POOL.length) % GENERIC_POOL.length;
    if (!indices.includes(idx)) indices.push(idx);
    i = (i * 37 + 11) % 997;
  }
  return indices.map((idx) => GENERIC_POOL[idx]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, utcOffset } = body;
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Use local date if the client passes their UTC offset (in minutes, e.g. -300 for EST)
    const today = getLocalDateStr(typeof utcOffset === "number" ? utcOffset : undefined);

    // Use UTC window for DB queries — still covers the whole user's local day within ±14h
    const utcToday = new Date().toISOString().split("T")[0];
    const todayStart = `${utcToday}T00:00:00.000Z`;
    const todayEnd   = `${utcToday}T23:59:59.999Z`;

    // Fetch today's quiz_history and top weak areas in parallel
    const [historyRes, weakRes] = await Promise.all([
      supabase
        .from("quiz_history")
        .select("is_correct, topic, question_type, created_at")
        .eq("user_id", userId)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd),
      supabase
        .from("user_weak_areas")
        .select("topic, misses")
        .eq("user_id", userId)
        .order("misses", { ascending: false })
        .limit(5),
    ]);

    const rows = historyRes.data || [];
    const totalAnswered = rows.length;
    const totalCorrect  = rows.filter((r) => r.is_correct === true).length;
    const accuracy      = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    const weakAreas = weakRes.data || [];
    const weakTopics = weakAreas.map((w) => w.topic as string);
    const answeredWeakToday = rows.filter((r) => weakTopics.includes(r.topic)).length;
    const drillsToday = rows.filter((r) => r.question_type === "Quick Drill").length;

    // Consecutive correct streak
    let maxStreak = 0, streak = 0;
    for (const r of rows) {
      if (r.is_correct === true) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }

    // Build 3 missions:
    // - Mission 1: Always targets the student's #1 weak area (personalized)
    // - Missions 2-3: Rotate from generic pool by date
    const missions: { type: string; label: string; goal: number }[] = [];

    if (weakTopics.length > 0) {
      // Pick which weak topic to target today based on date seed
      const weakSeed = today.split("-").reduce((acc, n) => acc + parseInt(n), 0);
      const targetWeak = weakTopics[weakSeed % weakTopics.length];
      const shortTopic = targetWeak.split(" - ")[1] || targetWeak; // "Heart Failure" from "Cardiovascular - Heart Failure"
      missions.push({
        type: `weak_topic_${weakSeed % weakTopics.length}`,
        label: `Answer 3 ${shortTopic} questions today`,
        goal: 3,
      });
    } else {
      // No weak areas yet — use a generic starter mission
      missions.push({ type: "answer_5", label: "Answer 5 questions today", goal: 5 });
    }

    // Fill remaining 2 slots with generic rotating missions (avoid duplicates)
    const generic = pickGenericMissions(today, 4);
    for (const g of generic) {
      if (missions.length >= 3) break;
      if (!missions.find((m) => m.type === g.type)) missions.push(g);
    }

    // Compute progress for each mission
    const result = missions.slice(0, 3).map((m) => {
      let progress = 0;

      if (m.type.startsWith("weak_topic_")) {
        // Count how many weak-area questions answered today
        progress = Math.min(answeredWeakToday, m.goal);
      } else if (m.type === "answer_10")     progress = Math.min(totalAnswered, 10);
      else if (m.type === "answer_5")        progress = Math.min(totalAnswered, 5);
      else if (m.type === "answer_3")        progress = Math.min(totalAnswered, 3);
      else if (m.type === "answer_20")       progress = Math.min(totalAnswered, 20);
      else if (m.type === "get_3_correct")   progress = Math.min(maxStreak, 3);
      else if (m.type === "correct_5")       progress = Math.min(totalCorrect, 5);
      else if (m.type === "accuracy_60")     progress = Math.min(accuracy, 60);
      else if (m.type === "quick_drill")     progress = Math.min(drillsToday > 0 ? 1 : 0, 1);

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
