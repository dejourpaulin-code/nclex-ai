import { createClient } from "@supabase/supabase-js";
import { FEATURE_MATRIX } from "./access";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for access control.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export type FeatureKey = keyof typeof FEATURE_MATRIX.guest;
export type AccessLevel = keyof typeof FEATURE_MATRIX;

export type AccessCheckResult = {
  ok: boolean;
  status: number;
  error?: string;
  accessLevel: AccessLevel;
  features: (typeof FEATURE_MATRIX)[AccessLevel];
};

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

export async function getUserAccess(
  userId: string | null | undefined
): Promise<AccessCheckResult> {
  if (!userId) {
    return {
      ok: false,
      status: 401,
      error: "You must be logged in.",
      accessLevel: "guest",
      features: FEATURE_MATRIX.guest,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("user_access")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserAccess error:", error);

    return {
      ok: false,
      status: 500,
      error: "Failed to verify access.",
      accessLevel: "guest",
      features: FEATURE_MATRIX.guest,
    };
  }

  const activeRecord = (data || []).find((row) => isStillActive(row.ends_at)) || null;

  if (!activeRecord) {
    return {
      ok: true,
      status: 200,
      accessLevel: "guest",
      features: FEATURE_MATRIX.guest,
    };
  }

  const accessLevel = normalizeAccessLevel(activeRecord.access_level);

  return {
    ok: true,
    status: 200,
    accessLevel,
    features: FEATURE_MATRIX[accessLevel],
  };
}

export async function requireFeature(
  userId: string | null | undefined,
  feature: FeatureKey
): Promise<AccessCheckResult> {
  const access = await getUserAccess(userId);

  if (!access.ok) return access;

  if (!access.features[feature]) {
    return {
      ...access,
      ok: false,
      status: 403,
      error: `This feature requires access to ${feature}.`,
    };
  }

  return access;
}