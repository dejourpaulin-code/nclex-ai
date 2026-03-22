import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAccessConfig } from "../../../../lib/access";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getAccessConfig(grantType: string) {
  const normalized = grantType.trim().toLowerCase();

  if (normalized === "starter") {
    return { accessLevel: "starter" };
  }

  if (normalized === "core") {
    return { accessLevel: "core" };
  }

  if (normalized === "premium") {
    return { accessLevel: "premium" };
  }

  if (normalized === "admin") {
    return { accessLevel: "admin" };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = String(body?.userId || "").trim();
    const grantType = String(body?.grantType || "").trim();

    if (!userId || !grantType) {
      return NextResponse.json(
        { error: "Missing userId or grantType." },
        { status: 400 }
      );
    }

    const accessConfig = getAccessConfig(grantType);

    if (!accessConfig) {
      return NextResponse.json(
        { error: "Invalid grantType." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("user_access").upsert(
      {
        user_id: userId,
        access_level: accessConfig.accessLevel,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("Grant access error:", error);
      return NextResponse.json(
        { error: "Failed to grant access." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accessLevel: accessConfig.accessLevel,
    });
  } catch (error) {
    console.error("Grant route error:", error);
    return NextResponse.json(
      { error: "Failed to grant access." },
      { status: 500 }
    );
  }
}