import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, semesterLabel, educationLevel, explanationStyle } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const updates: Record<string, string | null> = { user_id: userId, updated_at: new Date().toISOString() };
    if (semesterLabel !== undefined) updates.semester_label = semesterLabel ?? null;
    if (educationLevel !== undefined) updates.education_level = educationLevel ?? null;
    if (explanationStyle !== undefined) updates.explanation_style = explanationStyle ?? null;

    const { error } = await supabase
      .from("user_profiles")
      .upsert(updates, { onConflict: "user_id" });

    if (error) {
      console.error("save-profile error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
