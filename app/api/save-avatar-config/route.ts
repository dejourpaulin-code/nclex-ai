import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, gender, skinTone, hairColor, eyeColor } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    // Always upsert — handles both new rows and existing ones, works regardless of column state
    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        avatar_gender: gender ?? null,
        avatar_skin_tone: skinTone ?? null,
        avatar_hair_color: hairColor ?? null,
        avatar_eye_color: eyeColor ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      console.error("save-avatar-config error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save avatar config." }, { status: 500 });
  }
}
