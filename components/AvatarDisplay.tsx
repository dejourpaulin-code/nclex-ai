"use client";

export type AvatarConfig = {
  gender?: "female" | "male";
  skinTone?: "light" | "medium" | "tan" | "dark";
  hairColor?: "black" | "brown" | "blonde" | "red" | "auburn";
  eyeColor?: "brown" | "blue" | "green" | "hazel" | "gray";
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
  light:  { face: "#FFE4C4", neck: "#F5D0A0", shadow: "#DDB080", lip: "#E8706A" },
  medium: { face: "#D4956A", neck: "#C07A50", shadow: "#A85E38", lip: "#C05040" },
  tan:    { face: "#C68642", neck: "#B5722E", shadow: "#9A5E20", lip: "#A04830" },
  dark:   { face: "#8D5524", neck: "#7A4519", shadow: "#5C3010", lip: "#6A3020" },
};

const SKIN_FROM_AVATAR: Record<string, string> = {
  "starter-blue":   "light",
  "starter-green":  "medium",
  "starter-orange": "dark",
};

const HAIR_COLORS: Record<string, { main: string; shadow: string; hi: string; brow: string }> = {
  black:  { main: "#1C1C1C", shadow: "#111",    hi: "#555",    brow: "#1C1C1C" },
  brown:  { main: "#5C3010", shadow: "#3A1E08", hi: "#8A5820", brow: "#4A2808" },
  blonde: { main: "#D4A017", shadow: "#A07010", hi: "#F0CC50", brow: "#9A7010" },
  red:    { main: "#B83020", shadow: "#802010", hi: "#D85030", brow: "#902010" },
  auburn: { main: "#7B3F00", shadow: "#5C2E00", hi: "#9B5510", brow: "#6A3400" },
};

const EYE_COLORS: Record<string, string> = {
  brown: "#7B4A2A",
  blue:  "#3B82F6",
  green: "#16A34A",
  hazel: "#9B7020",
  gray:  "#6B7280",
};

const SCRUBS_COLORS: Record<string, { body: string; collar: string; dark: string }> = {
  "scrubs-blue":   { body: "#3B82F6", collar: "#1D4ED8", dark: "#1E40AF" },
  "scrubs-orange": { body: "#F97316", collar: "#EA6C00", dark: "#C25A00" },
  "scrubs-green":  { body: "#22C55E", collar: "#15803D", dark: "#166534" },
  "scrubs-purple": { body: "#A855F7", collar: "#7E22CE", dark: "#6B21A8" },
  "scrubs-pink":   { body: "#EC4899", collar: "#BE185D", dark: "#9D174D" },
  "scrubs-teal":   { body: "#14B8A6", collar: "#0F766E", dark: "#0D9488" },
};

const STETH_COLORS: Record<string, string> = {
  "stethoscope-silver": "#94A3B8",
  "stethoscope-blue":   "#3B82F6",
  "stethoscope-orange": "#F97316",
  "stethoscope-pink":   "#EC4899",
  "stethoscope-gold":   "#D4A017",
};

// ─── LEXI ──────────────────────────────────────────────────────────────────
function LexiSVG({ size }: { size: number }) {
  const hairMain   = "#C8920A";
  const hairHi     = "#EEC040";
  const hairShadow = "#9A7008";
  const skin       = "#FFE4C4";
  const skinNeck   = "#F5D0A0";
  const skinShadow = "#DDB080";
  const lip        = "#E8706A";
  const irisColor  = "#16A34A"; // green eyes

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#EFF6FF" />

      {/* ── Hair behind — drawn first ── */}
      <path d="M35,28 Q18,52 22,92 Q36,98 50,97 Q64,98 78,92 Q82,52 65,28 Q58,23 50,23 Q42,23 35,28 Z" fill={hairMain}/>
      <path d="M35,28 Q18,52 22,92 Q29,96 36,94 Q20,55 32,30 Z" fill={hairShadow} opacity="0.35"/>
      <path d="M65,28 Q82,52 78,92 Q71,96 64,94 Q80,55 68,30 Z" fill={hairShadow} opacity="0.35"/>

      {/* ── Body ── */}
      <path d="M27,102 L27,80 C26,73 31,69 37,67 L63,67 C69,69 74,73 73,80 L73,102 Z" fill="#1D4ED8"/>
      <ellipse cx="50" cy="67" rx="22" ry="8" fill="#1D4ED8"/>
      <path d="M44,67 L50,77 L56,67 Z" fill="white" opacity="0.85"/>
      <ellipse cx="44" cy="73" rx="5.5" ry="3" fill="#1640B0" opacity="0.35"/>
      <ellipse cx="56" cy="73" rx="5.5" ry="3" fill="#1640B0" opacity="0.35"/>

      {/* Arms */}
      <rect x="13" y="63" width="14" height="21" rx="7" fill="#2563EB"/>
      <rect x="73" y="63" width="14" height="21" rx="7" fill="#2563EB"/>
      <ellipse cx="20" cy="85" rx="7" ry="5" fill={skin}/>
      <ellipse cx="80" cy="85" rx="7" ry="5" fill={skin}/>

      {/* ── Neck ── */}
      <rect x="44" y="56" width="12" height="13" rx="5" fill={skinNeck}/>

      {/* ── Head ── */}
      <ellipse cx="50" cy="40" rx="18" ry="20" fill={skin}/>

      {/* Cheek blush */}
      <ellipse cx="36.5" cy="47" rx="6.5" ry="4" fill="#FFB3C6" opacity="0.5"/>
      <ellipse cx="63.5" cy="47" rx="6.5" ry="4" fill="#FFB3C6" opacity="0.5"/>

      {/* ── Hair top ── */}
      <path d="M50,20 C35,20 31,28 31,36 C34,31 41,29 50,29 C59,29 66,31 69,36 C69,28 65,20 50,20 Z" fill={hairMain}/>
      <path d="M31,36 C29,41 31,47 33,49 C31,43 32,38 31,36 Z" fill={hairMain}/>
      <path d="M69,36 C71,41 69,47 67,49 C69,43 68,38 69,36 Z" fill={hairMain}/>
      {/* Bun */}
      <circle cx="50" cy="19" r="8.5" fill={hairMain}/>
      <rect x="47" y="13" width="6" height="10" rx="3" fill={hairMain}/>
      <circle cx="50" cy="18.5" r="3.5" fill="#F97316"/>
      <path d="M37,23 Q50,19 63,23" stroke={hairHi} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6"/>

      {/* ── Eyebrows ── */}
      <path d="M36.5,33 C38,31 41.5,30.5 44.5,32" stroke={hairShadow} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M55.5,32 C58.5,30.5 62,31 63.5,33" stroke={hairShadow} strokeWidth="2" strokeLinecap="round" fill="none"/>

      {/* ── Eyes ── */}
      <ellipse cx="42" cy="40" rx="5.8" ry="5" fill="white"/>
      <ellipse cx="58" cy="40" rx="5.8" ry="5" fill="white"/>
      <circle cx="42" cy="40.5" r="3.8" fill={irisColor}/>
      <circle cx="58" cy="40.5" r="3.8" fill={irisColor}/>
      <circle cx="42" cy="40.5" r="2" fill="#0F172A"/>
      <circle cx="58" cy="40.5" r="2" fill="#0F172A"/>
      <circle cx="43.8" cy="38.8" r="1.4" fill="white"/>
      <circle cx="59.8" cy="38.8" r="1.4" fill="white"/>
      <path d="M36.2,38.8 Q42,34 47.8,38.8" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M52.2,38.8 Q58,34 63.8,38.8" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M37,42.5 Q42,44.8 47,43" stroke="#555" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.35"/>
      <path d="M53,43 Q58,44.8 63,42.5" stroke="#555" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.35"/>

      {/* ── Nose ── */}
      <path d="M47.5,48 Q50,50.5 52.5,48" stroke={skinShadow} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      <ellipse cx="47.2" cy="49" rx="1.2" ry="0.9" fill={skinShadow} opacity="0.4"/>
      <ellipse cx="52.8" cy="49" rx="1.2" ry="0.9" fill={skinShadow} opacity="0.4"/>

      {/* ── Lips ── */}
      <path d="M43.5,53.5 Q47,51.8 50,52.2 Q53,51.8 56.5,53.5" stroke={lip} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      <path d="M43.5,53.5 Q50,60 56.5,53.5" fill={lip} opacity="0.85"/>
      <path d="M47,57 Q50,58.5 53,57" stroke="white" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.5"/>

      {/* ── Nurse cap ── */}
      <rect x="34" y="17" width="32" height="12" rx="3.5" fill="white" stroke="#E2E8F0" strokeWidth="0.8"/>
      <rect x="45.5" y="19" width="5" height="8" rx="1.5" fill="#EF4444"/>
      <rect x="42" y="22" width="12" height="3.5" rx="1.5" fill="#EF4444"/>

      {/* ── Stethoscope — on shoulders, arch drapes down chest ── */}
      <circle cx="37" cy="68" r="2.2" fill="#F97316"/>
      <circle cx="63" cy="68" r="2.2" fill="#F97316"/>
      <path d="M37,68 Q35,77 41,84 Q45,88 50,88 Q55,88 59,84 Q65,77 63,68"
        fill="none" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="50" cy="89" r="4" fill="#F97316"/>
      <circle cx="50" cy="89" r="2" fill="#FED7AA"/>

      {/* AI badge — left breast pocket */}
      <rect x="27" y="74" width="16" height="9" rx="2.5" fill="#F97316"/>
      <text x="35" y="81.5" textAnchor="middle" fontSize="4.5" fill="white" fontWeight="bold">AI RN</text>
    </svg>
  );
}

// ─── STUDENT AVATAR ────────────────────────────────────────────────────────
function StudentSVG({
  skin, hair, scrubsStyle, stethColor, hat, badge, gender, irisColor,
}: {
  skin: { face: string; neck: string; shadow: string; lip: string };
  hair: { main: string; shadow: string; hi: string; brow: string };
  scrubsStyle: { body: string; collar: string; dark: string };
  stethColor: string;
  hat: string | null;
  badge: string | null;
  gender: "female" | "male";
  irisColor: string;
}) {
  return (
    <>
      {/* ── Back hair — drawn FIRST ── */}
      {gender === "female" && (
        <>
          <path d="M35,28 Q18,52 22,92 Q36,98 50,97 Q64,98 78,92 Q82,52 65,28 Q58,23 50,23 Q42,23 35,28 Z" fill={hair.main}/>
          <path d="M35,28 Q18,52 22,92 Q29,96 36,94 Q20,55 32,30 Z" fill={hair.shadow} opacity="0.35"/>
          <path d="M65,28 Q82,52 78,92 Q71,96 64,94 Q80,55 68,30 Z" fill={hair.shadow} opacity="0.35"/>
        </>
      )}

      {/* ── Body ── */}
      {gender === "female" ? (
        <>
          <path d="M28,102 L28,80 C27,73 32,69 37,67 L63,67 C68,69 73,73 72,80 L72,102 Z" fill={scrubsStyle.body}/>
          <ellipse cx="50" cy="67" rx="22" ry="8" fill={scrubsStyle.body}/>
          <path d="M44,67 L50,77 L56,67 Z" fill={scrubsStyle.collar}/>
          <ellipse cx="44" cy="73" rx="5" ry="3" fill={scrubsStyle.dark} opacity="0.3"/>
          <ellipse cx="56" cy="73" rx="5" ry="3" fill={scrubsStyle.dark} opacity="0.3"/>
          <rect x="14" y="63" width="13" height="21" rx="6.5" fill={scrubsStyle.body}/>
          <rect x="73" y="63" width="13" height="21" rx="6.5" fill={scrubsStyle.body}/>
        </>
      ) : (
        <>
          <path d="M22,102 L22,78 C21,72 27,67 34,66 L66,66 C73,67 79,72 78,78 L78,102 Z" fill={scrubsStyle.body}/>
          <ellipse cx="50" cy="66" rx="26" ry="9" fill={scrubsStyle.body}/>
          <path d="M43,66 L50,76 L57,66 Z" fill={scrubsStyle.collar}/>
          <rect x="11" y="62" width="15" height="23" rx="7" fill={scrubsStyle.body}/>
          <rect x="74" y="62" width="15" height="23" rx="7" fill={scrubsStyle.body}/>
        </>
      )}

      {/* Hands */}
      <ellipse cx="20" cy={gender === "female" ? 85 : 86} rx="7" ry="5" fill={skin.face}/>
      <ellipse cx="80" cy={gender === "female" ? 85 : 86} rx="7" ry="5" fill={skin.face}/>

      {/* ── Neck ── */}
      <rect x="44" y="56" width="12" height="13" rx="5" fill={skin.neck}/>

      {/* ── Head ── */}
      {gender === "female" ? (
        <ellipse cx="50" cy="40" rx="17.5" ry="20" fill={skin.face}/>
      ) : (
        <ellipse cx="50" cy="41" rx="19" ry="19" fill={skin.face}/>
      )}

      {/* Cheek blush — female */}
      {gender === "female" && (
        <>
          <ellipse cx="36.5" cy="47" rx="6.5" ry="4" fill="#F9A8D4" opacity="0.4"/>
          <ellipse cx="63.5" cy="47" rx="6.5" ry="4" fill="#F9A8D4" opacity="0.4"/>
        </>
      )}

      {/* ── Hair top ── */}
      {gender === "female" ? (
        <>
          <path d="M50,20 C36,20 32,28 32,36 C35,31 41,29 50,29 C59,29 65,31 68,36 C68,28 64,20 50,20 Z" fill={hair.main}/>
          <path d="M32,36 C30,41 31,47 33,49 C31,43 32,38 32,36 Z" fill={hair.main}/>
          <path d="M68,36 C70,41 69,47 67,49 C69,43 68,38 68,36 Z" fill={hair.main}/>
          <circle cx="50" cy="19" r="8.5" fill={hair.main}/>
          <rect x="47" y="13" width="6" height="10" rx="3" fill={hair.main}/>
          <circle cx="50" cy="18.5" r="3.5" fill="#F97316"/>
          <path d="M37,23 Q50,18 63,23" stroke={hair.hi} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55"/>
        </>
      ) : (
        <>
          {/* Short clean male hair — no fade blobs */}
          <path d="M50,22 C36,22 30,29 30,37 C33,32 40,30 50,30 C60,30 67,32 70,37 C70,29 64,22 50,22 Z" fill={hair.main}/>
          {/* Side hair pieces — clean, no circles */}
          <path d="M30,37 C29,40 30,44 31,47 C30,42 30,39 30,37 Z" fill={hair.main}/>
          <path d="M70,37 C71,40 70,44 69,47 C70,42 70,39 70,37 Z" fill={hair.main}/>
        </>
      )}

      {/* ── Eyebrows ── */}
      {gender === "female" ? (
        <>
          <path d="M36.5,33 C38,31 41.5,30.5 44.5,32" stroke={hair.brow} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <path d="M55.5,32 C58.5,30.5 62,31 63.5,33" stroke={hair.brow} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        </>
      ) : (
        <>
          <path d="M35.5,34 C37.5,31.5 41.5,31 44.5,32.5" stroke={hair.brow} strokeWidth="2.4" strokeLinecap="round" fill="none"/>
          <path d="M55.5,32.5 C58.5,31 62.5,31.5 64.5,34" stroke={hair.brow} strokeWidth="2.4" strokeLinecap="round" fill="none"/>
        </>
      )}

      {/* ── Eyes ── */}
      {gender === "female" ? (
        <>
          <ellipse cx="42" cy="40" rx="5.8" ry="5" fill="white"/>
          <ellipse cx="58" cy="40" rx="5.8" ry="5" fill="white"/>
          <circle cx="42" cy="40.5" r="3.7" fill={irisColor}/>
          <circle cx="58" cy="40.5" r="3.7" fill={irisColor}/>
          <circle cx="42" cy="40.5" r="2" fill="#0F172A"/>
          <circle cx="58" cy="40.5" r="2" fill="#0F172A"/>
          <circle cx="43.8" cy="38.8" r="1.4" fill="white"/>
          <circle cx="59.8" cy="38.8" r="1.4" fill="white"/>
          <path d="M36.2,38.8 Q42,34.2 47.8,38.8" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <path d="M52.2,38.8 Q58,34.2 63.8,38.8" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <path d="M37,43 Q42,45 47,43.2" stroke="#555" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.3"/>
          <path d="M53,43.2 Q58,45 63,43" stroke="#555" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.3"/>
        </>
      ) : (
        <>
          <ellipse cx="42" cy="41" rx="5.2" ry="4.5" fill="white"/>
          <ellipse cx="58" cy="41" rx="5.2" ry="4.5" fill="white"/>
          <circle cx="42" cy="41.5" r="3.2" fill={irisColor}/>
          <circle cx="58" cy="41.5" r="3.2" fill={irisColor}/>
          <circle cx="42" cy="41.5" r="1.7" fill="#0F172A"/>
          <circle cx="58" cy="41.5" r="1.7" fill="#0F172A"/>
          <circle cx="43.5" cy="39.8" r="1.2" fill="white"/>
          <circle cx="59.5" cy="39.8" r="1.2" fill="white"/>
          <path d="M37,39.5 Q42,36 47,39.5" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <path d="M53,39.5 Q58,36 63,39.5" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </>
      )}

      {/* ── Nose ── */}
      <path d="M47.5,48 Q50,50.5 52.5,48" stroke={skin.shadow} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      {gender === "female" && (
        <>
          <ellipse cx="47.2" cy="49" rx="1.1" ry="0.8" fill={skin.shadow} opacity="0.4"/>
          <ellipse cx="52.8" cy="49" rx="1.1" ry="0.8" fill={skin.shadow} opacity="0.4"/>
        </>
      )}

      {/* ── Mouth ── */}
      {gender === "female" ? (
        <>
          <path d="M43.5,53.5 Q47,51.8 50,52.2 Q53,51.8 56.5,53.5" stroke={skin.lip} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          <path d="M43.5,53.5 Q50,60 56.5,53.5" fill={skin.lip} opacity="0.82"/>
          <path d="M47,57 Q50,58.5 53,57" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.45"/>
        </>
      ) : (
        <path d="M44,55 Q50,60.5 56,55" stroke={skin.lip} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      )}

      {/* ── Hat ── */}
      {hat === "hat-nurse-cap" && (
        <g>
          <rect x="33" y="17" width="34" height="13" rx="4" fill="white" stroke="#CBD5E1" strokeWidth="0.8"/>
          <rect x="45.5" y="19" width="5" height="9" rx="1.5" fill="#EF4444"/>
          <rect x="42" y="22" width="12" height="3.5" rx="1.5" fill="#EF4444"/>
        </g>
      )}
      {hat === "hat-grad-cap" && (
        <g>
          <polygon points="50,11 18,23 50,31 82,23" fill="#1E293B"/>
          <rect x="42" y="25" width="16" height="9" rx="2" fill="#1E293B"/>
          <line x1="76" y1="23" x2="80" y2="36" stroke="#F97316" strokeWidth="2"/>
          <circle cx="80" cy="37" r="2.5" fill="#F97316"/>
        </g>
      )}

      {/* ── Stethoscope — earpiece dots on shoulders, arch drapes down chest ── */}
      <circle cx="37" cy="68" r="2.2" fill={stethColor}/>
      <circle cx="63" cy="68" r="2.2" fill={stethColor}/>
      <path d="M37,68 Q35,77 41,84 Q45,88 50,88 Q55,88 59,84 Q65,77 63,68"
        fill="none" stroke={stethColor} strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="50" cy="89" r="4" fill={stethColor}/>
      <circle cx="50" cy="89" r="2" fill="white" opacity="0.4"/>

      {/* ── Badge — left breast pocket, below stethoscope arch ── */}
      {!badge || badge === "" ? (
        <g transform="translate(27,74)">
          <rect width="18" height="10" rx="2.5" fill="#E2E8F0"/>
          <rect x="1.5" y="1.5" width="15" height="7" rx="1.5" fill="white"/>
          <text x="9" y="8" textAnchor="middle" fontSize="4" fill="#64748B" fontWeight="bold">SN</text>
        </g>
      ) : badge ? (
        (() => {
          const BADGE_COLORS: Record<string, { bg: string; inner: string; text: string }> = {
            "badge-blue":   { bg: "#1D4ED8", inner: "#3B82F6", text: "white" },
            "badge-green":  { bg: "#15803D", inner: "#22C55E", text: "white" },
            "badge-purple": { bg: "#7E22CE", inner: "#A855F7", text: "white" },
            "badge-gold":   { bg: "#B45309", inner: "#D4A017", text: "#7C4A0A" },
          };
          const bc = BADGE_COLORS[badge] ?? BADGE_COLORS["badge-blue"];
          return (
            <g transform="translate(27,74)">
              <rect width="18" height="10" rx="2.5" fill={bc.bg}/>
              <rect x="1.5" y="1.5" width="15" height="7" rx="1.5" fill={bc.inner}/>
              <text x="9" y="8" textAnchor="middle" fontSize="4.5" fill={bc.text} fontWeight="bold">SN</text>
            </g>
          );
        })()
      ) : null}
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
      <div
        className="relative overflow-hidden rounded-full border-2 border-blue-200 bg-blue-50 shadow-lg"
        style={{ width: size, height: size }}
      >
        <LexiSVG size={size} />
      </div>
    );
  }

  const skinKey     = config?.skinTone  ?? SKIN_FROM_AVATAR[avatarId || ""] ?? "light";
  const hairKey     = config?.hairColor ?? "black";
  const eyeKey      = config?.eyeColor  ?? "brown";
  const gender      = config?.gender    ?? "female";
  const skin        = SKIN_TONES[skinKey]        ?? SKIN_TONES.light;
  const hair        = HAIR_COLORS[hairKey]       ?? HAIR_COLORS.black;
  const irisColor   = EYE_COLORS[eyeKey]         ?? EYE_COLORS.brown;
  const scrubsStyle = SCRUBS_COLORS[scrubs || ""] ?? SCRUBS_COLORS["scrubs-blue"];
  const stethColor  = STETH_COLORS[stethoscope || ""] ?? STETH_COLORS["stethoscope-silver"];

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#F8FAFC"/>
      <StudentSVG
        skin={skin}
        hair={hair}
        scrubsStyle={scrubsStyle}
        stethColor={stethColor}
        hat={hat ?? null}
        badge={badge ?? null}
        gender={gender}
        irisColor={irisColor}
      />
    </svg>
  );
}
