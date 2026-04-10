import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ITEM_TYPE_TO_COLUMN: Record<string, string> = {
  hat:          "equipped_hat",
  badge:        "equipped_badge",
  stethoscope:  "equipped_stethoscope",
  scrubs:       "equipped_scrubs",
};

export async function POST(req: Request) {
  try {
    const { userId, itemType } = await req.json();

    if (!userId || !itemType) {
      return NextResponse.json({ error: "Missing userId or itemType." }, { status: 400 });
    }

    const column = ITEM_TYPE_TO_COLUMN[itemType];
    if (!column) {
      return NextResponse.json({ error: "Unknown itemType." }, { status: 400 });
    }

    // Mark nothing equipped for this type in user_unlocks
    await supabase
      .from("user_unlocks")
      .update({ equipped: false })
      .eq("user_id", userId)
      .eq("item_type", itemType);

    // Clear the equipped column in user_profiles
    await supabase
      .from("user_profiles")
      .update({ [column]: null, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("unequip-item error:", error);
    return NextResponse.json({ error: "Failed to unequip item." }, { status: 500 });
  }
}
