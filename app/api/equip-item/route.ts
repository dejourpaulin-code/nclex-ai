import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Starter items every student can equip without earning them first
const STARTER_ITEM_KEYS = new Set(["scrubs-orange", "hat-nurse-cap", "badge-blue", "stethoscope-blue"]);

export async function POST(req: Request) {
  try {
    const { userId, itemKey, itemType } = await req.json();

    if (!userId || !itemKey || !itemType) {
      return NextResponse.json(
        { error: "Missing userId, itemKey, or itemType." },
        { status: 400 }
      );
    }

    // Starter items bypass the unlock check — everyone can equip them
    if (!STARTER_ITEM_KEYS.has(itemKey)) {
      const { data: ownedItem } = await supabase
        .from("user_unlocks")
        .select("*")
        .eq("user_id", userId)
        .eq("item_key", itemKey)
        .eq("item_type", itemType)
        .maybeSingle();

      if (!ownedItem) {
        return NextResponse.json(
          { error: "Item is not unlocked for this user." },
          { status: 400 }
        );
      }
    }

    await supabase
      .from("user_unlocks")
      .update({ equipped: false })
      .eq("user_id", userId)
      .eq("item_type", itemType);

    await supabase
      .from("user_unlocks")
      .update({ equipped: true })
      .eq("user_id", userId)
      .eq("item_key", itemKey)
      .eq("item_type", itemType);

    const profileUpdate: Record<string, string | null> = {};

    if (itemType === "hat") profileUpdate.equipped_hat = itemKey;
    if (itemType === "badge") profileUpdate.equipped_badge = itemKey;
    if (itemType === "stethoscope") profileUpdate.equipped_stethoscope = itemKey;
    if (itemType === "scrubs") profileUpdate.equipped_scrubs = itemKey;
    
    if (Object.keys(profileUpdate).length > 0) {
      profileUpdate.updated_at = new Date().toISOString();

      await supabase
        .from("user_profiles")
        .update(profileUpdate)
        .eq("user_id", userId);
    }

    return NextResponse.json({
      success: true,
      equipped: {
        itemKey,
        itemType,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to equip item." },
      { status: 500 }
    );
  }
}