import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { userId } = await req.json();

  // Try reading the profile
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, avatar_gender, avatar_skin_tone, avatar_hair_color, avatar_eye_color, equipped_scrubs, equipped_stethoscope")
    .eq("user_id", userId)
    .maybeSingle();

  // Try writing a test value
  const { error: writeError } = await supabase
    .from("user_profiles")
    .update({ avatar_gender: "female" })
    .eq("user_id", userId);

  return NextResponse.json({
    readData: data,
    readError: error?.message ?? null,
    writeError: writeError?.message ?? null,
  });
}
