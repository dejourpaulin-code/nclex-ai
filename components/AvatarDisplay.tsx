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

const SKIN_TONES: Record<string, { face: string; neck: string; shadow: string; lip: string }> = {
  light:  { face: "#FFE0BA", neck: "#F5C89A", shadow: "#E8A87C", lip: "#E07060" },
  medium: { face: "#D4956A", neck: "#C07A50", shadow: "#A85E38", lip: "#B85040" },
  tan:    { face: "#C68642", neck: "#B5722E", shadow: "#9A5E20", lip: "#A05030" },
  dark:   { face: "#8D5524", neck: "#7A4519", shadow: "#5C3010", lip: "#6A3020" },
};

const SKIN_FROM_AVATAR: Record<string, string> = {
  "starter-blue":   "light",
  "starter-green":  "medium",
  "starter-orange": "dark",
};

const HAIR_COLORS: Record<string, { main: string; shadow: string; highlight: string }> = {
  black:  { main: "#1A1A1A", shadow: "#333333", highlight: "#4A4A4A" },
  brown:  { main: "#4A2810", shadow: "#3A1E0A", highlight: "#6A3810" },
  blonde: { main: "#D4A93E", shadow: "#B8882A", highlight: "#E8C460" },
  red:    { main: "#C0392B", shadow: "#922B21", highlight: "#D44030" },
  auburn: { main: "#7B3F00", shadow: "#5C2E00", highlight: "#9B5010" },
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
      <path d="M24,100 C22,82 30,72 36,68 L64,68 C70,72 78,82 76,100 Z" fill="#1D4ED8" />
      <ellipse cx="50" cy="68" rx="25" ry="8" fill="#1D4ED8" />
      {/* V-collar detail */}
      <path d="M44,68 L50,77 L56,68 Z" fill="white" opacity="0.9" />
      {/* Chest curves subtle */}
      <ellipse cx="44" cy="72" rx="6" ry="3.5" fill="#2563EB" opacity="0.4" />
      <ellipse cx="56" cy="72" rx="6" ry="3.5" fill="#2563EB" opacity="0.4" />

      {/* Arms */}
      <rect x="14" y="64" width="13" height="20" rx="6" fill="#2563EB" />
      <rect x="73" y="64" width="13" height="20" rx="6" fill="#2563EB" />
      <ellipse cx="20" cy="85" rx="7" ry="5" fill="#FFE0BA" />
      <ellipse cx="80" cy="85" rx="7" ry="5" fill="#FFE0BA" />

      {/* Long flowing hair — behind head */}
      {/* Right side flowing down */}
      <path d="M67,32 Q80,50 76,78" stroke="#1A1A1A" strokeWidth="13" strokeLinecap="round" fill="none"/>
      {/* Left side flowing down */}
      <path d="M33,32 Q20,50 24,78" stroke="#1A1A1A" strokeWidth="13" strokeLinecap="round" fill="none"/>

      {/* Neck */}
      <rect x="44" y="57" width="12" height="13" rx="5" fill="#FFE0BA" />

      {/* Head */}
      <ellipse cx="50" cy="44" rx="19" ry="20" fill="#FFE0BA" />

      {/* Cheek blush */}
      <ellipse cx="37" cy="50" rx="5.5" ry="3" fill="#F4A0B0" opacity="0.55" />
      <ellipse cx="63" cy="50" rx="5.5" ry="3" fill="#F4A0B0" opacity="0.55" />

      {/* Hair top */}
      <ellipse cx="50" cy="28" rx="19" ry="13" fill="#1A1A1A" />
      <ellipse cx="32" cy="37" rx="5" ry="10" fill="#1A1A1A" />
      <ellipse cx="68" cy="37" rx="5" ry="10" fill="#1A1A1A" />
      {/* High ponytail bun */}
      <circle cx="50" cy="20" r="9" fill="#1A1A1A" />
      <rect x="47" y="14" width="6" height="10" rx="3" fill="#1A1A1A" />
      {/* Hair tie */}
      <circle cx="50" cy="19" r="3.5" fill="#F97316" />
      {/* Hair sheen */}
      <path d="M38,25 Q44,22 52,24" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>

      {/* Eyebrows */}
      <path d="M37,37 Q42,34 47,36" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M53,36 Q58,34 63,37" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" fill="none"/>

      {/* Big almond eyes */}
      <ellipse cx="42" cy="44" rx="6" ry="5.5" fill="white" />
      <ellipse cx="58" cy="44" rx="6" ry="5.5" fill="white" />
      {/* Iris */}
      <ellipse cx="42" cy="44.5" rx="4" ry="4" fill="#1E293B" />
      <ellipse cx="58" cy="44.5" rx="4" ry="4" fill="#1E293B" />
      {/* Blue color ring */}
      <ellipse cx="42" cy="44.5" rx="2.5" ry="2.5" fill="#3B82F6" />
      <ellipse cx="58" cy="44.5" rx="2.5" ry="2.5" fill="#3B82F6" />
      {/* Pupil */}
      <circle cx="42" cy="44.5" r="1.4" fill="#0F172A" />
      <circle cx="58" cy="44.5" r="1.4" fill="#0F172A" />
      {/* Eye shine */}
      <circle cx="43.8" cy="42.8" r="1.4" fill="white" />
      <circle cx="59.8" cy="42.8" r="1.4" fill="white" />
      {/* Upper lashes */}
      <path d="M36.5,41 Q42,37.5 47.5,41" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M52.5,41 Q58,37.5 63.5,41" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none"/>

      {/* Cute nose */}
      <path d="M47.5,51 Q50,53.5 52.5,51" stroke="#E8A87C" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      <circle cx="47" cy="52" r="1" fill="#E8A87C" opacity="0.4"/>
      <circle cx="53" cy="52" r="1" fill="#E8A87C" opacity="0.4"/>

      {/* Lips */}
      <path d="M43,57.5 Q46.5,56 50,56.5 Q53.5,56 57,57.5" stroke="#E07060" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M43,57.5 Q50,64 57,57.5" fill="#F4756A" opacity="0.8"/>
      {/* Lip shine */}
      <path d="M46,60 Q50,62 54,60" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5"/>

      {/* Nurse cap */}
      <rect x="34" y="18" width="32" height="13" rx="4" fill="white" stroke="#E2E8F0" strokeWidth="1" />
      <rect x="45" y="20" width="5" height="9" rx="1.5" fill="#EF4444" />
      <rect x="41" y="23" width="13" height="4" rx="1.5" fill="#EF4444" />

      {/* Stethoscope */}
      <circle cx="38" cy="72" r="2.5" fill="#F97316" />
      <circle cx="62" cy="72" r="2.5" fill="#F97316" />
      <path d="M38,72 Q33,82 40,90 Q45,96 50,96 Q55,96 60,90 Q67,82 62,72"
        fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="96" r="5" fill="#F97316" />
      <circle cx="50" cy="96" r="2.5" fill="#FED7AA" />

      {/* AI badge */}
      <rect x="41" y="78" width="18" height="10" rx="3" fill="#F97316" />
      <text x="50" y="86" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">AI RN</text>
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
  skin: { face: string; neck: string; shadow: string; lip: string };
  hair: { main: string; shadow: string; highlight: string };
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
      {/* Scrubs body — female hourglass vs male boxy */}
      {gender === "female" ? (
        <>
          <path d="M26,100 C24,84 32,74 36,68 L64,68 C68,74 76,84 74,100 Z" fill={scrubsStyle.body} />
          <ellipse cx="50" cy="68" rx="24" ry="8" fill={scrubsStyle.body} />
          {/* V-collar */}
          <path d="M43,68 L50,78 L57,68 Z" fill={scrubsStyle.collar} />
          {/* Subtle chest indication */}
          <ellipse cx="44" cy="72" rx="5.5" ry="3" fill={scrubsStyle.collar} opacity="0.35" />
          <ellipse cx="56" cy="72" rx="5.5" ry="3" fill={scrubsStyle.collar} opacity="0.35" />
          {/* Cleavage hint at V */}
          <path d="M46,68 Q50,72 54,68" stroke={skin.shadow} strokeWidth="0.8" fill="none" opacity="0.5" />
        </>
      ) : (
        <>
          <rect x="20" y="66" width="60" height="36" rx="10" fill={scrubsStyle.body} />
          <ellipse cx="50" cy="66" rx="28" ry="9" fill={scrubsStyle.body} />
          <path d="M43,66 L50,76 L57,66 Z" fill={scrubsStyle.collar} />
        </>
      )}

      {/* Arms */}
      {gender === "female" ? (
        <>
          <rect x="13" y="64" width="13" height="20" rx="6" fill={scrubsStyle.body} />
          <rect x="74" y="64" width="13" height="20" rx="6" fill={scrubsStyle.body} />
          <ellipse cx="19" cy="85" rx="7" ry="5" fill={skin.face} />
          <ellipse cx="81" cy="85" rx="7" ry="5" fill={skin.face} />
        </>
      ) : (
        <>
          <rect x="12" y="62" width="14" height="22" rx="6" fill={scrubsStyle.body} />
          <rect x="74" y="62" width="14" height="22" rx="6" fill={scrubsStyle.body} />
          <ellipse cx="19" cy="85" rx="7" ry="5" fill={skin.face} />
          <ellipse cx="81" cy="85" rx="7" ry="5" fill={skin.face} />
        </>
      )}

      {/* Long flowing hair BEHIND head — female only */}
      {gender === "female" && (
        <>
          <path d="M67,33 Q80,55 75,80" stroke={hair.main} strokeWidth="12" strokeLinecap="round" fill="none"/>
          <path d="M33,33 Q20,55 25,80" stroke={hair.main} strokeWidth="12" strokeLinecap="round" fill="none"/>
          {/* Hair ends feather */}
          <path d="M67,33 Q82,58 77,82" stroke={hair.shadow} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5"/>
          <path d="M33,33 Q18,58 23,82" stroke={hair.shadow} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5"/>
        </>
      )}

      {/* Neck */}
      <rect x="44" y="55" width="12" height="14" rx="5" fill={skin.neck} />

      {/* Head — female slightly rounder/softer, male slightly wider */}
      {gender === "female" ? (
        <ellipse cx="50" cy="43" rx="18" ry="21" fill={skin.face} />
      ) : (
        <ellipse cx="50" cy="43" rx="20" ry="20" fill={skin.face} />
      )}

      {/* Cheek blush — female only */}
      {gender === "female" && (
        <>
          <ellipse cx="35" cy="50" rx="5.5" ry="3" fill="#F9A8D4" opacity="0.45" />
          <ellipse cx="65" cy="50" rx="5.5" ry="3" fill="#F9A8D4" opacity="0.45" />
        </>
      )}

      {/* Hair — top overlay */}
      {gender === "female" ? (
        <>
          <ellipse cx="50" cy="27" rx="18" ry="13" fill={hair.main} />
          <ellipse cx="33" cy="36" rx="5" ry="9" fill={hair.main} />
          <ellipse cx="67" cy="36" rx="5" ry="9" fill={hair.main} />
          {/* Bun */}
          <circle cx="50" cy="20" r="9" fill={hair.main} />
          <rect x="47" y="14" width="6" height="10" rx="3" fill={hair.main} />
          {/* Hair tie */}
          <circle cx="50" cy="19" r="3.5" fill="#F97316" />
          {/* Sheen */}
          <path d="M38,24 Q44,21 52,23" stroke={hair.highlight} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
        </>
      ) : (
        <>
          {/* Short neat male hair */}
          <ellipse cx="50" cy="26" rx="20" ry="10" fill={hair.main} />
          <ellipse cx="31" cy="33" rx="6" ry="8" fill={hair.main} />
          <ellipse cx="69" cy="33" rx="6" ry="8" fill={hair.main} />
          {/* Side fade */}
          <path d="M30,38 Q28,44 31,50" stroke={hair.main} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
          <path d="M70,38 Q72,44 69,50" stroke={hair.main} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
        </>
      )}

      {/* Eyebrows */}
      {gender === "female" ? (
        <>
          <path d="M37,37 Q42,34.5 47,36" stroke={hair.main} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M53,36 Q58,34.5 63,37" stroke={hair.main} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        </>
      ) : (
        <>
          <path d="M36,37 Q42,35 47,36.5" stroke={hair.main} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          <path d="M53,36.5 Q58,35 64,37" stroke={hair.main} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        </>
      )}

      {/* Eyes */}
      {gender === "female" ? (
        <>
          <ellipse cx="42" cy="44" rx="6" ry="5.5" fill="white" />
          <ellipse cx="58" cy="44" rx="6" ry="5.5" fill="white" />
          <ellipse cx="42" cy="44.5" rx="3.8" ry="3.8" fill="#1E293B" />
          <ellipse cx="58" cy="44.5" rx="3.8" ry="3.8" fill="#1E293B" />
          <circle cx="43.5" cy="43" r="1.4" fill="white" />
          <circle cx="59.5" cy="43" r="1.4" fill="white" />
          {/* Upper lashes */}
          <path d="M36.5,41 Q42,37.5 47.5,41" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M52.5,41 Q58,37.5 63.5,41" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        </>
      ) : (
        <>
          <ellipse cx="42" cy="44" rx="5.5" ry="5" fill="white" />
          <ellipse cx="58" cy="44" rx="5.5" ry="5" fill="white" />
          <circle cx="42" cy="44.5" r="3.2" fill="#1E293B" />
          <circle cx="58" cy="44.5" r="3.2" fill="#1E293B" />
          <circle cx="43.5" cy="43" r="1.2" fill="white" />
          <circle cx="59.5" cy="43" r="1.2" fill="white" />
        </>
      )}

      {/* Nose */}
      <path d="M47.5,51 Q50,53.5 52.5,51" stroke={skin.shadow} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      {gender === "female" && (
        <>
          <circle cx="47" cy="52" r="0.9" fill={skin.shadow} opacity="0.5"/>
          <circle cx="53" cy="52" r="0.9" fill={skin.shadow} opacity="0.5"/>
        </>
      )}

      {/* Lips / mouth */}
      {gender === "female" ? (
        <>
          <path d="M43,57.5 Q46.5,56 50,56.5 Q53.5,56 57,57.5" stroke={skin.lip} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M43,57.5 Q50,64 57,57.5" fill={skin.lip} opacity="0.75" />
          <path d="M46,60 Q50,62 54,60" stroke="white" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.45"/>
        </>
      ) : (
        <path d="M43,58 Q50,64 57,58" stroke={skin.lip} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      )}

      {/* Hat */}
      {hat === "hat-nurse-cap" && (
        <g>
          <rect x="33" y="17" width="34" height="14" rx="4" fill="white" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="45" y="19" width="5" height="10" rx="1.5" fill="#EF4444" />
          <rect x="41" y="22" width="13" height="4" rx="1.5" fill="#EF4444" />
        </g>
      )}
      {hat === "hat-grad-cap" && (
        <g>
          <polygon points="50,10 18,22 50,30 82,22" fill="#1E293B" />
          <rect x="42" y="24" width="16" height="9" rx="2" fill="#1E293B" />
          <line x1="76" y1="22" x2="80" y2="35" stroke="#F97316" strokeWidth="2" />
          <circle cx="80" cy="36" r="2.5" fill="#F97316" />
        </g>
      )}

      {/* Stethoscope */}
      {stethColor && (
        <g>
          <circle cx="38" cy="72" r="2.5" fill={stethColor} />
          <circle cx="62" cy="72" r="2.5" fill={stethColor} />
          <path d="M38,72 Q33,82 40,90 Q45,96 50,96 Q55,96 60,90 Q67,82 62,72"
            fill="none" stroke={stethColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="96" r="5" fill={stethColor} />
          <circle cx="50" cy="96" r="2.5" fill="white" opacity="0.4" />
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
  const gender  = config?.gender ?? "female";
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
