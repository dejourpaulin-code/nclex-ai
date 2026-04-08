"use client";

type AvatarDisplayProps = {
  avatarId?: string | null;
  scrubs?: string | null;
  hat?: string | null;
  badge?: string | null;
  stethoscope?: string | null;
  size?: number;
  lexi?: boolean;
};

// Skin tones mapped to avatarId
const SKIN: Record<string, { face: string; neck: string }> = {
  "starter-blue":   { face: "#FDDCB5", neck: "#F5C89A" },
  "starter-green":  { face: "#C8A882", neck: "#B8976E" },
  "starter-orange": { face: "#8D5524", neck: "#7A4519" },
};

// Scrubs colors
const SCRUBS_COLORS: Record<string, { body: string; collar: string }> = {
  "scrubs-blue":   { body: "#3B82F6", collar: "#1D4ED8" },
  "scrubs-green":  { body: "#22C55E", collar: "#15803D" },
  "scrubs-purple": { body: "#A855F7", collar: "#7E22CE" },
};

// Hat styles
function HatSVG({ hat }: { hat: string }) {
  if (hat === "hat-nurse-cap") {
    return (
      <g>
        {/* Nurse cap: white rectangular cap with red cross */}
        <rect x="32" y="16" width="36" height="18" rx="3" fill="white" stroke="#CBD5E1" strokeWidth="1" />
        <rect x="47" y="19" width="6" height="12" rx="1" fill="#EF4444" />
        <rect x="43" y="23" width="14" height="4" rx="1" fill="#EF4444" />
      </g>
    );
  }
  if (hat === "hat-grad-cap") {
    return (
      <g>
        {/* Graduation cap */}
        <polygon points="50,12 18,26 50,34 82,26" fill="#1E293B" />
        <rect x="42" y="28" width="16" height="8" rx="1" fill="#1E293B" />
        {/* Tassel */}
        <line x1="76" y1="26" x2="80" y2="38" stroke="#F97316" strokeWidth="2" />
        <circle cx="80" cy="39" r="2" fill="#F97316" />
      </g>
    );
  }
  return null;
}

// Badge styles
function BadgeSVG({ badge, x, y }: { badge: string; x: number; y: number }) {
  if (badge === "badge-bronze") {
    return (
      <g transform={`translate(${x},${y})`}>
        <rect width="22" height="14" rx="3" fill="#CD7F32" />
        <rect x="2" y="2" width="18" height="10" rx="2" fill="#E8A87C" />
        <text x="11" y="10" textAnchor="middle" fontSize="6" fill="#7C4A0A" fontWeight="bold">RN</text>
      </g>
    );
  }
  if (badge === "badge-rn") {
    return (
      <g transform={`translate(${x},${y})`}>
        <rect width="22" height="14" rx="3" fill="#1D4ED8" />
        <rect x="2" y="2" width="18" height="10" rx="2" fill="#3B82F6" />
        <text x="11" y="10" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">RN</text>
      </g>
    );
  }
  return null;
}

// Stethoscope
function StethoscopeSVG({ stethoscope, scrubsColor }: { stethoscope: string; scrubsColor: string }) {
  const colors: Record<string, string> = {
    "stethoscope-blue":   "#3B82F6",
    "stethoscope-orange": "#F97316",
    "stethoscope-pink":   "#EC4899",
  };
  const color = colors[stethoscope] || "#64748B";
  return (
    <g>
      {/* Earpieces */}
      <circle cx="38" cy="68" r="3" fill={color} />
      <circle cx="62" cy="68" r="3" fill={color} />
      {/* Tubing over shoulders */}
      <path d={`M38,68 Q35,80 40,88 Q45,95 50,95 Q55,95 60,88 Q65,80 62,68`}
        fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Chest piece */}
      <circle cx="50" cy="95" r="5" fill={color} stroke="white" strokeWidth="1" />
    </g>
  );
}

// Lexi — distinctive AI tutor look
function LexiSVG({ size }: { size: number }) {
  const s = size / 100;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="50" cy="50" r="50" fill="#EFF6FF" />

      {/* Scrubs body — blue */}
      <ellipse cx="50" cy="85" rx="30" ry="20" fill="#1D4ED8" />
      <rect x="28" y="70" width="44" height="25" rx="6" fill="#1D4ED8" />
      {/* White collar */}
      <path d="M44,70 L50,80 L56,70 Z" fill="white" />

      {/* Neck */}
      <rect x="44" y="57" width="12" height="14" rx="4" fill="#FDDCB5" />

      {/* Head */}
      <ellipse cx="50" cy="48" rx="20" ry="22" fill="#FDDCB5" />

      {/* Hair — dark brown bun */}
      <ellipse cx="50" cy="30" rx="20" ry="12" fill="#3D1F0A" />
      <ellipse cx="50" cy="26" rx="9" ry="9" fill="#3D1F0A" />
      {/* Hair side pieces */}
      <ellipse cx="31" cy="42" rx="5" ry="9" fill="#3D1F0A" />
      <ellipse cx="69" cy="42" rx="5" ry="9" fill="#3D1F0A" />

      {/* Eyes */}
      <ellipse cx="43" cy="48" rx="4" ry="4.5" fill="white" />
      <ellipse cx="57" cy="48" rx="4" ry="4.5" fill="white" />
      <circle cx="44" cy="48" r="2.5" fill="#1E293B" />
      <circle cx="58" cy="48" r="2.5" fill="#1E293B" />
      {/* Eye shine */}
      <circle cx="45" cy="47" r="1" fill="white" />
      <circle cx="59" cy="47" r="1" fill="white" />

      {/* Eyebrows */}
      <path d="M39,43 Q43,40 47,43" stroke="#3D1F0A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M53,43 Q57,40 61,43" stroke="#3D1F0A" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <circle cx="50" cy="53" r="1.2" fill="#E8A87C" />

      {/* Smile */}
      <path d="M44,59 Q50,65 56,59" stroke="#C0724A" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Nurse cap */}
      <rect x="33" y="22" width="34" height="14" rx="3" fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <rect x="46" y="24" width="5" height="10" rx="1" fill="#EF4444" />
      <rect x="43" y="27" width="12" height="4" rx="1" fill="#EF4444" />

      {/* Stethoscope */}
      <path d="M38,72 Q33,82 40,90 Q45,96 50,96 Q55,96 60,90 Q67,82 62,72"
        fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="96" r="4" fill="#F97316" />
      <circle cx="38" cy="72" r="2.5" fill="#F97316" />
      <circle cx="62" cy="72" r="2.5" fill="#F97316" />

      {/* "AI" badge on chest */}
      <rect x="43" y="78" width="14" height="9" rx="2" fill="#F97316" />
      <text x="50" y="86" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">AI RN</text>
    </svg>
  );
}

export default function AvatarDisplay({
  avatarId,
  scrubs,
  hat,
  badge,
  stethoscope,
  size = 140,
  lexi = false,
}: AvatarDisplayProps) {
  if (lexi) {
    return (
      <div className="relative overflow-hidden rounded-full border-2 border-blue-200 bg-blue-50 shadow-lg"
        style={{ width: size, height: size }}>
        <LexiSVG size={size} />
      </div>
    );
  }

  const skin = SKIN[avatarId || ""] || SKIN["starter-blue"];
  const scrubsStyle = SCRUBS_COLORS[scrubs || ""] || SCRUBS_COLORS["scrubs-blue"];

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <circle cx="50" cy="50" r="50" fill="#F8FAFC" />

      {/* Scrubs body */}
      <rect x="22" y="68" width="56" height="35" rx="8" fill={scrubsStyle.body} />
      <ellipse cx="50" cy="68" rx="28" ry="10" fill={scrubsStyle.body} />
      {/* Collar V */}
      <path d="M43,68 L50,80 L57,68 Z" fill={scrubsStyle.collar} />

      {/* Arms */}
      <rect x="14" y="65" width="14" height="22" rx="7" fill={scrubsStyle.body} />
      <rect x="72" y="65" width="14" height="22" rx="7" fill={scrubsStyle.body} />
      {/* Hands */}
      <ellipse cx="21" cy="88" rx="7" ry="5" fill={skin.face} />
      <ellipse cx="79" cy="88" rx="7" ry="5" fill={skin.face} />

      {/* Neck */}
      <rect x="43" y="55" width="14" height="15" rx="5" fill={skin.neck} />

      {/* Head */}
      <ellipse cx="50" cy="44" rx="22" ry="24" fill={skin.face} />

      {/* Hair */}
      <ellipse cx="50" cy="26" rx="22" ry="14" fill="#3D1F0A" />
      {/* Side hair */}
      <ellipse cx="29" cy="39" rx="6" ry="11" fill="#3D1F0A" />
      <ellipse cx="71" cy="39" rx="6" ry="11" fill="#3D1F0A" />

      {/* Eyes */}
      <ellipse cx="42" cy="43" rx="5" ry="5.5" fill="white" />
      <ellipse cx="58" cy="43" rx="5" ry="5.5" fill="white" />
      <circle cx="43" cy="43" r="3" fill="#1E293B" />
      <circle cx="59" cy="43" r="3" fill="#1E293B" />
      <circle cx="44" cy="42" r="1.2" fill="white" />
      <circle cx="60" cy="42" r="1.2" fill="white" />

      {/* Eyebrows */}
      <path d="M37,37 Q42,34 47,37" stroke="#3D1F0A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M53,37 Q58,34 63,37" stroke="#3D1F0A" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <circle cx="50" cy="49" r="1.5" fill={skin.neck} />

      {/* Smile */}
      <path d="M43,56 Q50,63 57,56" stroke="#C0724A" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Hat layer */}
      {hat && <HatSVG hat={hat} />}

      {/* Stethoscope */}
      {stethoscope && <StethoscopeSVG stethoscope={stethoscope} scrubsColor={scrubsStyle.body} />}

      {/* Badge on chest */}
      {badge && <BadgeSVG badge={badge} x={38} y={72} />}
    </svg>
  );
}
