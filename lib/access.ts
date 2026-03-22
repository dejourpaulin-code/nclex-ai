export const FEATURE_MATRIX = {
  free: {
    quiz: true,
    lexi: true,
    history: false,
    study: false,
    dashboard: false,
    dashboardAdvanced: false,
    weakAreas: false,
    weakAreasAdvanced: false,
    lecture: false,
    liveFull: false,
    catExam: false,
  },

  starter: {
    quiz: true,
    lexi: true,
    history: true,
    study: true,
    dashboard: true,
    dashboardAdvanced: false,
    weakAreas: true,
    weakAreasAdvanced: false,
    lecture: true,
    liveFull: false,
    catExam: false,
  },

  core: {
    quiz: true,
    lexi: true,
    history: true,
    study: true,
    dashboard: true,
    dashboardAdvanced: true,
    weakAreas: true,
    weakAreasAdvanced: true,
    lecture: true,
    liveFull: true,
    catExam: true,
  },

  semester: {
    quiz: true,
    lexi: true,
    history: true,
    study: true,
    dashboard: true,
    dashboardAdvanced: true,
    weakAreas: true,
    weakAreasAdvanced: true,
    lecture: true,
    liveFull: true,
    catExam: true,
  },

  "three-semester": {
    quiz: true,
    lexi: true,
    history: true,
    study: true,
    dashboard: true,
    dashboardAdvanced: true,
    weakAreas: true,
    weakAreasAdvanced: true,
    lecture: true,
    liveFull: true,
    catExam: true,
  },

  "full-program": {
    quiz: true,
    lexi: true,
    history: true,
    study: true,
    dashboard: true,
    dashboardAdvanced: true,
    weakAreas: true,
    weakAreasAdvanced: true,
    lecture: true,
    liveFull: true,
    catExam: true,
  },
} as const;

export type AccessLevel =
  | "free"
  | "starter"
  | "core"
  | "semester"
  | "three-semester"
  | "full-program";

export type AccessFeatures = (typeof FEATURE_MATRIX)[AccessLevel];

const ACCESS_RANK: Record<AccessLevel, number> = {
  free: 0,
  starter: 1,
  core: 2,
  semester: 3,
  "three-semester": 4,
  "full-program": 5,
};

export function normalizeAccessLevel(
  value: string | null | undefined
): AccessLevel {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "starter" ||
    normalized === "starter-monthly" ||
    normalized === "starter_monthly" ||
    normalized === "starter-yearly" ||
    normalized === "starter_yearly"
  ) {
    return "starter";
  }

  if (
    normalized === "core" ||
    normalized === "core-monthly" ||
    normalized === "core_monthly" ||
    normalized === "core-yearly" ||
    normalized === "core_yearly"
  ) {
    return "core";
  }

  if (normalized === "semester") {
    return "semester";
  }

  if (
    normalized === "three-semester" ||
    normalized === "three_semester" ||
    normalized === "three semester"
  ) {
    return "three-semester";
  }

  if (
    normalized === "full-program" ||
    normalized === "full_program" ||
    normalized === "full program"
  ) {
    return "full-program";
  }

  return "free";
}

export function getFeatureSet(
  accessLevel: string | null | undefined
): AccessFeatures {
  return FEATURE_MATRIX[normalizeAccessLevel(accessLevel)];
}

export function hasRequiredAccess(
  userAccessLevel: string | null | undefined,
  requiredAccessLevel: AccessLevel
) {
  const normalizedUserLevel = normalizeAccessLevel(userAccessLevel);
  return ACCESS_RANK[normalizedUserLevel] >= ACCESS_RANK[requiredAccessLevel];
}

export function getAccessConfig(grantType: string) {
  const accessLevel = normalizeAccessLevel(grantType);

  if (accessLevel === "free") {
    return null;
  }

  return {
    access_level: accessLevel,
    features: FEATURE_MATRIX[accessLevel],
  };
}