import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const { data: quizRows } = await supabase
      .from("quiz_history")
      .select("id,is_correct")
      .eq("user_id", userId);

    const totalAnswered = quizRows?.length || 0;
    const totalCorrect = quizRows?.filter((row) => row.is_correct).length || 0;

    const unlocks: { item_key: string; item_type: string }[] = [];

if (totalAnswered >= 5) {
  unlocks.push({ item_key: "scrubs-blue", item_type: "scrubs" });
}

if (totalAnswered >= 12) {
  unlocks.push({ item_key: "scrubs-green", item_type: "scrubs" });
}

if (totalAnswered >= 20) {
  unlocks.push({ item_key: "scrubs-purple", item_type: "scrubs" });
}

if (totalAnswered >= 10) {
  unlocks.push({ item_key: "badge-bronze", item_type: "badge" });
}

if (totalAnswered >= 25) {
  unlocks.push({ item_key: "hat-nurse-cap", item_type: "hat" });
}

if (totalCorrect >= 20) {
  unlocks.push({ item_key: "stethoscope-orange", item_type: "stethoscope" });
}

    return NextResponse.json({
      totalAnswered,
      totalCorrect,
      unlockedItems: unlocks,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to sync avatar progress." },
      { status: 500 }
    );
  }
}