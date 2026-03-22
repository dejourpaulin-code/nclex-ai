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
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("lexi_study_conversations")
      .select("id, title, source_label, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Study Lexi history error:", error);
      return NextResponse.json(
        { error: "Failed to load study history." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversations: data || [],
    });
  } catch (error) {
    console.error("Study Lexi history route error:", error);
    return NextResponse.json(
      { error: "Failed to load study history." },
      { status: 500 }
    );
  }
}