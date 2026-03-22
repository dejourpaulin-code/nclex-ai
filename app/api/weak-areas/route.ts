import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables for weak-areas route.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();

    if (!userId) {
      return NextResponse.json({ error: "No userId provided." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_weak_areas")
      .select("id, topic, misses, correct")
      .eq("user_id", userId)
      .order("misses", { ascending: false })
      .order("correct", { ascending: true })
      .limit(3);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      weakAreas: data ?? [],
    });
  } catch (error) {
    console.error("weak-areas route error:", error);

    return NextResponse.json(
      { error: "Failed to load weak areas." },
      { status: 500 }
    );
  }
}