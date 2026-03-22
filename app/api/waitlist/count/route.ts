import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET() {
  try {
    const { count, error } = await supabase
      .from("waitlist_signups")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("WAITLIST COUNT ERROR:", error);
      return NextResponse.json(
        { error: "Failed to load waitlist count." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: count ?? 0,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("WAITLIST COUNT ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}