import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const eventName = String(body?.eventName || "").trim();
    const source = String(body?.source || "").trim();
    const page = String(body?.page || "").trim();
    const label = String(body?.label || "").trim();

    const userId =
      typeof body?.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : null;

    const value =
      typeof body?.value === "number"
        ? body.value
        : typeof body?.value === "string" && body.value.trim() !== ""
        ? Number(body.value)
        : null;

    const metadata =
      body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    if (!eventName) {
      return NextResponse.json(
        { error: "eventName is required." },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      event_name: eventName,
      source: source || null,
      page: page || null,
      label: label || null,
      user_id: userId,
      metadata,
    };

    if (value !== null && !Number.isNaN(value)) {
      payload.value = value;
    }

    const { error } = await supabase.from("cta_events").insert(payload);

    if (error) {
      console.error("TRACK EVENT ERROR:", error);
      return NextResponse.json(
        {
          error: "Failed to track event.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TRACK ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}