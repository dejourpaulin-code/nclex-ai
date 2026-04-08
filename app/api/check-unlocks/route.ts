import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Every unlock milestone: { condition, item_key, item_type, label }
const UNLOCK_MILESTONES = [
  // Answering questions
  { type: "questions_answered", threshold: 1,   item_key: "scrubs-blue",         item_type: "scrubs",       label: "Blue Scrubs — First Question!" },
  { type: "questions_answered", threshold: 10,  item_key: "badge-bronze",        item_type: "badge",        label: "Bronze Badge — 10 Questions" },
  { type: "questions_answered", threshold: 25,  item_key: "stethoscope-blue",    item_type: "stethoscope",  label: "Blue Stethoscope — 25 Questions" },
  { type: "questions_answered", threshold: 50,  item_key: "scrubs-green",        item_type: "scrubs",       label: "Green Scrubs — 50 Questions" },
  { type: "questions_answered", threshold: 75,  item_key: "hat-nurse-cap",       item_type: "hat",          label: "Nurse Cap — 75 Questions" },
  { type: "questions_answered", threshold: 100, item_key: "stethoscope-orange",  item_type: "stethoscope",  label: "Orange Stethoscope — 100 Questions" },
  { type: "questions_answered", threshold: 150, item_key: "scrubs-purple",       item_type: "scrubs",       label: "Purple Scrubs — 150 Questions" },
  { type: "questions_answered", threshold: 200, item_key: "stethoscope-pink",    item_type: "stethoscope",  label: "Pink Stethoscope — 200 Questions" },
  { type: "questions_answered", threshold: 250, item_key: "hat-grad-cap",        item_type: "hat",          label: "Grad Cap — 250 Questions" },
  { type: "questions_answered", threshold: 300, item_key: "badge-rn",            item_type: "badge",        label: "RN Badge — 300 Questions!" },
  // Accuracy streaks
  { type: "accuracy_50",  threshold: 1, item_key: "scrubs-blue",      item_type: "scrubs",      label: "50% Accuracy Reached" },
  { type: "accuracy_70",  threshold: 1, item_key: "stethoscope-blue", item_type: "stethoscope", label: "70% Accuracy — Great Work!" },
  { type: "accuracy_90",  threshold: 1, item_key: "badge-rn",         item_type: "badge",       label: "90% Accuracy — RN Level!" },
];

async function grantItem(userId: string, itemKey: string, itemType: string) {
  const { data: existing } = await supabase
    .from("user_unlocks")
    .select("id")
    .eq("user_id", userId)
    .eq("item_key", itemKey)
    .maybeSingle();

  if (existing) return null; // already owned

  const { data } = await supabase
    .from("user_unlocks")
    .insert({
      user_id: userId,
      item_key: itemKey,
      item_type: itemType,
      unlocked: true,
      equipped: false,
    })
    .select("*")
    .single();

  return data;
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ newUnlocks: [] });

    // Get total questions answered and accuracy
    const { data: historyRows } = await supabase
      .from("quiz_history")
      .select("is_correct")
      .eq("user_id", userId);

    const totalAnswered = historyRows?.length ?? 0;
    const totalCorrect = historyRows?.filter((r) => r.is_correct === true).length ?? 0;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    const newUnlocks: { item_key: string; item_type: string; label: string }[] = [];

    // Check question count milestones
    for (const milestone of UNLOCK_MILESTONES.filter((m) => m.type === "questions_answered")) {
      if (totalAnswered >= milestone.threshold) {
        const granted = await grantItem(userId, milestone.item_key, milestone.item_type);
        if (granted) newUnlocks.push({ item_key: milestone.item_key, item_type: milestone.item_type, label: milestone.label });
      }
    }

    // Check accuracy milestones (only after at least 20 questions)
    if (totalAnswered >= 20) {
      if (accuracy >= 50) {
        const m = UNLOCK_MILESTONES.find((x) => x.type === "accuracy_50")!;
        const granted = await grantItem(userId, m.item_key, m.item_type);
        if (granted) newUnlocks.push({ item_key: m.item_key, item_type: m.item_type, label: m.label });
      }
      if (accuracy >= 70) {
        const m = UNLOCK_MILESTONES.find((x) => x.type === "accuracy_70")!;
        const granted = await grantItem(userId, m.item_key, m.item_type);
        if (granted) newUnlocks.push({ item_key: m.item_key, item_type: m.item_type, label: m.label });
      }
      if (accuracy >= 90) {
        const m = UNLOCK_MILESTONES.find((x) => x.type === "accuracy_90")!;
        const granted = await grantItem(userId, m.item_key, m.item_type);
        if (granted) newUnlocks.push({ item_key: m.item_key, item_type: m.item_type, label: m.label });
      }
    }

    return NextResponse.json({ newUnlocks });
  } catch (err) {
    console.error("check-unlocks error:", err);
    return NextResponse.json({ newUnlocks: [] });
  }
}
