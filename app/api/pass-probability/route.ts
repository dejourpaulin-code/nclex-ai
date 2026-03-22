import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type WeakAreaRow = {
  topic: string;
  misses: number;
  correct: number;
};

type HistoryRow = {
  topic: string;
  difficulty: string | null;
  is_correct: boolean | null;
  created_at: string;
};

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

function getLabel(score: number) {
  if (score >= 85) return "High probability";
  if (score >= 70) return "Promising";
  if (score >= 55) return "Borderline";
  if (score >= 40) return "Needs improvement";
  return "At risk";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const [historyRes, weakAreasRes] = await Promise.all([
      supabaseAdmin
        .from("quiz_history")
        .select("topic, difficulty, is_correct, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(120),

      supabaseAdmin
        .from("user_weak_areas")
        .select("topic, misses, correct")
        .eq("user_id", userId)
        .order("misses", { ascending: false })
        .limit(8),
    ]);

    const history = (historyRes.data || []) as HistoryRow[];
    const weakAreas = (weakAreasRes.data || []) as WeakAreaRow[];

    const totalAnswered = history.length;
    const totalCorrect = history.filter((row) => row.is_correct).length;
    const accuracy =
      totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);

    const recent = history.slice(0, 30);
    const recentCorrect = recent.filter((row) => row.is_correct).length;
    const recentAccuracy =
      recent.length === 0 ? accuracy : Math.round((recentCorrect / recent.length) * 100);

    const hardQuestions = history.filter((row) => row.difficulty === "Hard");
    const hardCorrect = hardQuestions.filter((row) => row.is_correct).length;
    const hardAccuracy =
      hardQuestions.length === 0
        ? 0
        : Math.round((hardCorrect / hardQuestions.length) * 100);

    const volumeStrength = Math.min(totalAnswered, 250) / 250;
    const topWeakMissRate =
      weakAreas.length === 0
        ? 0
        : Math.round(
            (weakAreas[0].misses / Math.max(weakAreas[0].misses + weakAreas[0].correct, 1)) * 100
          );

    const probability = clamp(
      Math.round(
        accuracy * 0.34 +
          recentAccuracy * 0.28 +
          hardAccuracy * 0.14 +
          volumeStrength * 100 * 0.18 -
          topWeakMissRate * 0.12
      ),
      0,
      99
    );

    const reasons: string[] = [];

    if (accuracy >= 70) {
      reasons.push(`Your overall quiz accuracy is ${accuracy}%.`);
    } else {
      reasons.push(`Your current overall accuracy is ${accuracy}%, which still needs to rise.`);
    }

    if (recent.length > 0) {
      reasons.push(`Your recent accuracy across the last ${recent.length} questions is ${recentAccuracy}%.`);
    }

    if (hardQuestions.length > 0) {
      reasons.push(`Your hard-question accuracy is ${hardAccuracy}% across ${hardQuestions.length} questions.`);
    } else {
      reasons.push("You need more hard-question exposure to estimate exam readiness better.");
    }

    if (weakAreas[0]) {
      reasons.push(`Your biggest risk area right now is ${weakAreas[0].topic}.`);
    }

    return NextResponse.json({
      probability,
      label: getLabel(probability),
      reasons: reasons.slice(0, 4),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate pass probability." },
      { status: 500 }
    );
  }
}