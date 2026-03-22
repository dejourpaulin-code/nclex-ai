import { createClient } from "@supabase/supabase-js";
import { FEATURE_MATRIX } from "./access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export type FeatureKey = keyof typeof FEATURE_MATRIX.free;
export type AccessLevel = keyof typeof FEATURE_MATRIX;

export type AccessCheckResult = {
  accessLevel: AccessLevel;
  features: (typeof FEATURE_MATRIX)[AccessLevel];
};

function normalizeAccessLevel(value: unknown): AccessLevel {
  if (typeof value !== "string") return "free";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (normalized in FEATURE_MATRIX) {
    return normalized as AccessLevel;
  }

  return "free";
}

function isStillActive(endsAt: unknown): boolean {
  if (!endsAt) return true;

  const date = new Date(String(endsAt));
  if (Number.isNaN(date.getTime())) return false;

  return date > new Date();
}

export async function getAccessConfig(
  userId: string | null | undefined
): Promise<AccessCheckResult> {
  if (!userId) {
    return {
      accessLevel: "free",
      features: FEATURE_MATRIX.free,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("user_access")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("SERVER ACCESS ERROR:", error);

    return {
      accessLevel: "free",
      features: FEATURE_MATRIX.free,
    };
  }

  const activeRecord =
    (data || []).find((row) => isStillActive(row.ends_at)) || null;

  if (!activeRecord) {
    return {
      accessLevel: "free",
      features: FEATURE_MATRIX.free,
    };
  }

  const accessLevel = normalizeAccessLevel(activeRecord.access_level);

  return {
    accessLevel,
    features: FEATURE_MATRIX[accessLevel],
  };
}