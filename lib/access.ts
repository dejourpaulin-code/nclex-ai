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

const ACCESS_RANK: Record<AccessLevel, number> = {
  free: 0,
  starter: 1,
  core: 2,
  semester: 3,
  "three-semester": 4,
  "full-program": 5,
};

export function hasRequiredAccess(
  userAccessLevel: string | null | undefined,
  requiredAccessLevel: AccessLevel
) {
  const normalizedUserLevel: AccessLevel =
    userAccessLevel === "starter" ||
    userAccessLevel === "core" ||
    userAccessLevel === "semester" ||
    userAccessLevel === "three-semester" ||
    userAccessLevel === "full-program"
      ? userAccessLevel
      : "free";

  return ACCESS_RANK[normalizedUserLevel] >= ACCESS_RANK[requiredAccessLevel];
}