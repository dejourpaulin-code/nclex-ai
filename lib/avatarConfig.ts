import { AvatarConfig } from "../components/AvatarDisplay";

const KEY = "nclex_avatar_config";

export function saveAvatarConfigLocal(config: AvatarConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {}
}

export function loadAvatarConfigLocal(): AvatarConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AvatarConfig) : null;
  } catch {
    return null;
  }
}

/** Merge DB profile fields with localStorage, preferring localStorage. */
export function resolveAvatarConfig(profile: {
  avatar_gender?: string | null;
  avatar_skin_tone?: string | null;
  avatar_hair_color?: string | null;
  avatar_eye_color?: string | null;
} | null): AvatarConfig {
  const local = loadAvatarConfigLocal();
  return {
    gender:    (local?.gender    ?? profile?.avatar_gender    ?? "female") as AvatarConfig["gender"],
    skinTone:  (local?.skinTone  ?? profile?.avatar_skin_tone ?? "light")  as AvatarConfig["skinTone"],
    hairColor: (local?.hairColor ?? profile?.avatar_hair_color ?? "black") as AvatarConfig["hairColor"],
    eyeColor:  (local?.eyeColor  ?? profile?.avatar_eye_color ?? "brown")  as AvatarConfig["eyeColor"],
  };
}
