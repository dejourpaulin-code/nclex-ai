import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FEATURE_MATRIX } from "../../../../lib/access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type AccessLevel = keyof typeof FEATURE_MATRIX;

function normalizeAccessLevel(value: unknown): AccessLevel {
  if (typeof value !== "string") return "guest";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (normalized in FEATURE_MATRIX) {
    return normalized as AccessLevel;
  }

  return "guest";
}

function isStillActive(endsAt: unknown): boolean {
  if (!endsAt) return true;

  const date = new Date(String(endsAt));
  if (Number.isNaN(date.getTime())) return false;

  return date > new Date();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : "";

    if (!userId) {
      return NextResponse.json({
        loggedIn: false,
        accessLevel: "guest",
        plan: null,
        status: "inactive",
        endsAt: null,
        features: FEATURE_MATRIX.guest,
      });
    }

    const { data, error } = await supabase
      .from("user_access")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ACCESS ME ERROR:", error);

      return NextResponse.json(
        { error: "Failed to load access." },
        { status: 500 }
      );
    }

    const activeRecord =
      (data || []).find((row) => isStillActive(row.ends_at)) || null;

    if (!activeRecord) {
      return NextResponse.json({
        loggedIn: true,
        accessLevel: "guest",
        plan: null,
        status: "inactive",
        endsAt: null,
        features: FEATURE_MATRIX.guest,
      });
    }

    const accessLevel = normalizeAccessLevel(activeRecord.access_level);

    return NextResponse.json({
      loggedIn: true,
      accessLevel,
      plan: activeRecord.plan ?? null,
      status: activeRecord.status ?? "active",
      endsAt: activeRecord.ends_at ?? null,
      features: FEATURE_MATRIX[accessLevel],
    });
  } catch (error) {
    console.error("ACCESS ME ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}