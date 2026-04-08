"use client";

export type AvatarConfig = {
  gender?: "female" | "male";
  skinTone?: "light" | "medium" | "tan" | "dark";
  hairColor?: "black" | "brown" | "blonde" | "red" | "auburn";
};

type AvatarDisplayProps = {
  avatarId?: string | null;
  scrubs?: string | null;
  hat?: string | null;
  badge?: string | null;
  stethoscope?: string | null;
  size?: number;
  lexi?: boolean;
  config?: AvatarConfig;
};

const SKIN_TONES: Record<string, { face: string; neck: string; shadow: string }> = {
  light:  { face: "#FFE0BA", neck: "#F5C89A", shadow: "#E8A87C" },
  medium: { face: "#D4956A", neck: "#C07A50", shadow: "#A85E38" },
  tan:    { face: "#C68642", neck: "#B5722E", shadow: "#9A5E20" },
  dark:   { face: "#8D5524", neck: "#7A4519", shadow: "#5C3010" },
};

// avatarId legacy mapping
const SKIN_FROM_AVATAR: Record<string, string> = {
  "starter-blue":   "light",
  "starter-green":  "medium",
  "starter-orange": "dark",
};

const HAIR_COLORS: Record<string, { main: string; shadow: string }> = {
  black:  { main: "#1A1A1A", shadow: "#333333" },
  brown:  { main: "#4A2810", shadow: "#3A1E0A" },
  blonde: { main: "#D4A93E", shadow: "#B8882A" },
  red:    { main: "#C0392B", shadow: "#922B21" },
  auburn: { main: "#7B3F00", shadow: "#5C2E00" },
};

const SCRUBS_COLORS: Record<string, { body: string; collar: string; dark: string }> = {
  "scrubs-blue":   { body: "#3B82F6", collar: "#1D4ED8", dark: "#1E40AF" },
  "scrubs-green":  { body: "#22C55E", collar: "#15803D", dark: "#166534" },
  "scrubs-purple": { body: "#A855F7", collar: "#7E22CE", dark: "#6B21A8" },
};

// ─── LEXI ──────────────────────────────────────────────────────────────────
function LexiSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#EFF6FF" />

      {/* Scrubs body */}
      <rect x="22" y="66" width="56" height="36" rx="10" fill="#1D4ED8" />
      <ellipse cx="50" cy="66" rx="26" ry="9" fill="#1D4ED8" />
      {/* White collar */}
      <path d="M43,66 L50,76 L57,66 Z" fill="white" opacity="0.9" />

      {/* Arms */}
      <rect x="14" y="62" width="13" height="20" rx="6" fill="#2563EB" />
      <rect x="73" y="62" width="13" height="20" rx="6" fill="#2563EB" />
      <ellipse cx="20" cy="83" rx="7" ry="5" fill="#FFE0BA" />
      <ellipse cx="80" cy="83" rx="7" ry="5" fill="#FFE0BA" />

      {/* Neck */}
      <rect x="44" y="55" width="12" height="13" rx="5" fill="#FFE0BA" />

      {/* Head — rounder, younger */}
      <ellipse cx="50" cy="43" rx="19" ry="20" fill="#FFE0BA" />

      {/* Cheek blush */}
      <ellipse cx="37" cy="50" rx="5" ry="3" fill="#F4A0B0" opacity="0.5" />
      <ellipse cx="63" cy="50" rx="5" ry="3" fill="#F4A0B0" opacity="0.5" />

      {/* Hair — dark, high ponytail/bun — young look */}
      <ellipse cx="50" cy="27" rx="19" ry="12" fill="#1A1A1A" />
      {/* Side pieces framing face */}
      <ellipse cx="32" cy="36" rx="5" ry="10" fill="#1A1A1A" />
      <ellipse cx="68" cy="36" rx="5" ry="10" fill="#1A1A1A" />
      {/* Ponytail */}
      <ellipse cx="50" cy="22" rx="8" ry="8" fill="#1A1A1A" />
      <rect x="47" y="16" width="6" height="10" rx="3" fill="#1A1A1A" />
      {/* Hair tie */}
      <circle cx="50" cy="20" r="3" fill="#F97316" />

      {/* Big cute eyes */}
      <ellipse cx="42" cy="44" rx="5.5" ry="6" fill="white" />
      <ellipse cx="58" cy="44" rx="5.5" ry="6" fill="white" />
      <ellipse cx="42" cy="45" rx="3.5" ry="4" fill="#1E293B" />
      <ellipse cx="58" cy="45" rx="3.5" ry="4" fill="#1E293B" />
      {/* Iris color */}
      <ellipse cx="42" cy="45" rx="2" ry="2.5" fill="#3B82F6" />
      <ellipse cx="58" cy="45" rx="2" ry="2.5" fill="#3B82F6" />
      {/* Pupil */}
      <circle cx="42" cy="45" r="1.2" fill="#0F172A" />
      <circle cx="58" cy="45" r="1.2" fill="#0F172A" />
      {/* Eye shine */}
      <circle cx="43.5" cy="43.5" r="1.2" fill="white" />
      <circle cx="59.5" cy="43.5" r="1.2" fill="white" />
      {/* Lashes */}
      <path d="M37,40 Q42,37 47,40" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M53,40 Q58,37 63,40" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Small cute nose */}
      <path d="M48,51 Q50,53 52,51" stroke="#E8A87C" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Big smile */}
      <path d="M42,57 Q50,65 58,57" stroke="#E07060" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Teeth */}
      <path d="M44,58 Q50,63 56,58" fill="white" opacity="0.7" />

      {/* Nurse cap */}
      <rect x="34" y="20" width="32" height="13" rx="4" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <rect x="45" y="22" width="5" height="9" rx="1.5" fill="#EF4444" />
      <rect x="41" y="25" width="13" height="4" rx="1.5" fill="#EF4444" />

      {/* Stethoscope orange */}
      <circle cx="38" cy="70" r="2.5" fill="#F97316" />
      <circle cx="62" cy="70" r="2.5" fill="#F97316" />
      <path d="M38,70 Q34,80 40,88 Q45,94 50,94 Q55,94 60,88 Q66,80 62,70"
        fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="94" r="5" fill="#F97316" />
      <circle cx="50" cy="94" r="2.5" fill="#FED7AA" />

      {/* AI badge */}
      <rect x="41" y="76" width="18" height="10" rx="3" fill="#F97316" />
      <text x="50" y="84" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">AI RN</text>
    </svg>
  );
}

// ─── STUDENT AVATAR ────────────────────────────────────────────────────────
function StudentSVG({
  skin,
  hair,
  scrubsStyle,
  hat,
  badge,
  stethoscope,
  gender,
}: {
  skin: { face: string; neck: string; shadow: string };
  hair: { main: string; shadow: string };
  scrubsStyle: { body: string; collar: string; dark: string };
  hat: string | null;
  badge: string | null;
  stethoscope: string | null;
  gender: "female" | "male";
}) {
  const stethColors: Record<string, string> = {
    "stethoscope-blue":   "#3B82F6",
    "stethoscope-orange": "#F97316",
    "stethoscope-pink":   "#EC4899",
  };
  const stethColor = stethoscope ? (stethColors[stethoscope] || "#64748B") : null;

  return (
    <>
      {/* Scrubs body */}
      <rect x="22" y="66" width="56" height="36" rx="10" fill={scrubsStyle.body} />
      <ellipse cx="50" cy="66" rx="26" ry="9" fill={scrubsStyle.body} />
      <path d="M43,66 L50,76 L57,66 Z" fill={scrubsStyle.collar} />
      {/* Arms */}
      <rect x="14" y="62" width="13" height="20" rx="6" fill={scrubsStyle.body} />
      <rect x="73" y="62" width="13" height="20" rx="6" fill={scrubsStyle.body} />
      <ellipse cx="20" cy="83" rx="7" ry="5" fill={skin.face} />
      <ellipse cx="80" cy="83" rx="7" ry="5" fill={skin.face} />

      {/* Neck */}
      <rect x="44" y="55" width="12" height="13" rx="5" fill={skin.neck} />

      {/* Head */}
      <ellipse cx="50" cy="43" rx="19" ry="21" fill={skin.face} />

      {/* Cheek blush */}
      <ellipse cx="36" cy="50" rx="5" ry="3" fill="#F9A8D4" opacity="0.45" />
      <ellipse cx="64" cy="50" rx="5" ry="3" fill="#F9A8D4" opacity="0.45" />

      {/* Hair */}
      {gender === "female" ? (
        <>
          <ellipse cx="50" cy="27" rx="19" ry="12" fill={hair.main} />
          <ellipse cx="32" cy="36" rx="5" ry="11" fill={hair.main} />
          <ellipse cx="68" cy="36" rx="5" ry="11" fill={hair.main} />
          {/* Bun */}
          <circle cx="50" cy="22" r="8" fill={hair.main} />
          <circle cx="50" cy="20" r="3.5" fill="#F97316" />
        </>
      ) : (
        <>
          <ellipse cx="50" cy="26" rx="19" ry="11" fill={hair.main} />
          <ellipse cx="32" cy="34" rx="5" ry="8" fill={hair.main} />
          <ellipse cx="68" cy="34" rx="5" ry="8" fill={hair.main} />
        </>
      )}

      {/* Eyes */}
      <ellipse cx="42" cy="44" rx="5.5" ry="6" fill="white" />
      <ellipse cx="58" cy="44" rx="5.5" ry="6" fill="white" />
      <circle cx="42" cy="45" r="3.5" fill="#1E293B" />
      <circle cx="58" cy="45" r="3.5" fill="#1E293B" />
      <circle cx="43.5" cy="43.5" r="1.3" fill="white" />
      <circle cx="59.5" cy="43.5" r="1.3" fill="white" />
      {/* Lashes */}
      <path d="M37,40 Q42,37 47,40" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M53,40 Q58,37 63,40" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <path d="M48,51 Q50,53 52,51" stroke={skin.shadow} strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Smile */}
      <path d="M43,57 Q50,64 57,57" stroke="#C0724A" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Hat */}
      {hat === "hat-nurse-cap" && (
        <g>
          <rect x="33" y="19" width="34" height="14" rx="4" fill="white" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="45" y="21" width="5" height="10" rx="1.5" fill="#EF4444" />
          <rect x="41" y="24" width="13" height="4" rx="1.5" fill="#EF4444" />
        </g>
      )}
      {hat === "hat-grad-cap" && (
        <g>
          <polygon points="50,12 18,24 50,32 82,24" fill="#1E293B" />
          <rect x="42" y="26" width="16" height="9" rx="2" fill="#1E293B" />
          <line x1="76" y1="24" x2="80" y2="37" stroke="#F97316" strokeWidth="2" />
          <circle cx="80" cy="38" r="2.5" fill="#F97316" />
        </g>
      )}

      {/* Stethoscope */}
      {stethColor && (
        <g>
          <circle cx="38" cy="70" r="2.5" fill={stethColor} />
          <circle cx="62" cy="70" r="2.5" fill={stethColor} />
          <path d="M38,70 Q34,80 40,88 Q45,94 50,94 Q55,94 60,88 Q66,80 62,70"
            fill="none" stroke={stethColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="94" r="5" fill={stethColor} />
          <circle cx="50" cy="94" r="2.5" fill="white" opacity="0.4" />
        </g>
      )}

      {/* Badge */}
      {badge === "badge-bronze" && (
        <g transform="translate(38,72)">
          <rect width="22" height="13" rx="3" fill="#CD7F32" />
          <rect x="2" y="2" width="18" height="9" rx="2" fill="#E8A87C" />
          <text x="11" y="10" textAnchor="middle" fontSize="5.5" fill="#7C4A0A" fontWeight="bold">RN</text>
        </g>
      )}
      {badge === "badge-rn" && (
        <g transform="translate(38,72)">
          <rect width="22" height="13" rx="3" fill="#1D4ED8" />
          <rect x="2" y="2" width="18" height="9" rx="2" fill="#3B82F6" />
          <text x="11" y="10" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">RN</text>
        </g>
      )}
    </>
  );
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────────────
export default function AvatarDisplay({
  avatarId,
  scrubs,
  hat,
  badge,
  stethoscope,
  size = 140,
  lexi = false,
  config,
}: AvatarDisplayProps) {
  if (lexi) {
    return (
      <div className="relative overflow-hidden rounded-full border-2 border-blue-200 bg-blue-50 shadow-lg"
        style={{ width: size, height: size }}>
        <LexiSVG size={size} />
      </div>
    );
  }

  const skinKey = config?.skinTone ?? SKIN_FROM_AVATAR[avatarId || ""] ?? "light";
  const hairKey = config?.hairColor ?? "black";
  const gender = config?.gender ?? "female";
  const skin = SKIN_TONES[skinKey] ?? SKIN_TONES.light;
  const hair = HAIR_COLORS[hairKey] ?? HAIR_COLORS.black;
  const scrubsStyle = SCRUBS_COLORS[scrubs || ""] ?? SCRUBS_COLORS["scrubs-blue"];

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#F8FAFC" />
      <StudentSVG
        skin={skin}
        hair={hair}
        scrubsStyle={scrubsStyle}
        hat={hat ?? null}
        badge={badge ?? null}
        stethoscope={stethoscope ?? null}
        gender={gender}
      />
    </svg>
  );
}
