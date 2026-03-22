import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { userId, missionType, amount } = body;

  const today = new Date().toISOString().split("T")[0];

  const { data: mission } = await supabaseAdmin
    .from("user_daily_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_date", today)
    .eq("mission_type", missionType)
    .maybeSingle();

  if (!mission) {
    return NextResponse.json({ success: false });
  }

  const newProgress = mission.progress_count + amount;
  const completed = newProgress >= mission.goal_count;

  await supabaseAdmin
    .from("user_daily_missions")
    .update({
      progress_count: newProgress,
      completed,
    })
    .eq("id", mission.id);

  return NextResponse.json({ success: true });
}