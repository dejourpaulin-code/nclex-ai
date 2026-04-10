"use client";

type Props = { itemKey: string; itemType: string; size?: number };

export default function ItemPreview({ itemKey, itemType, size = 52 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {itemType === "scrubs" && <ScrubsPreview itemKey={itemKey} />}
      {itemType === "hat" && <HatPreview itemKey={itemKey} />}
      {itemType === "badge" && <BadgePreview itemKey={itemKey} />}
      {itemType === "stethoscope" && <StethoscopePreview itemKey={itemKey} />}
    </svg>
  );
}

function ScrubsPreview({ itemKey }: { itemKey: string }) {
  const colors: Record<string, { body: string; collar: string; dark: string }> = {
    "scrubs-blue":   { body: "#3B82F6", collar: "#1D4ED8", dark: "#1E40AF" },
    "scrubs-orange": { body: "#F97316", collar: "#EA6C00", dark: "#C25A00" },
    "scrubs-green":  { body: "#22C55E", collar: "#15803D", dark: "#166534" },
    "scrubs-purple": { body: "#A855F7", collar: "#7E22CE", dark: "#6B21A8" },
    "scrubs-pink":   { body: "#EC4899", collar: "#BE185D", dark: "#9D174D" },
    "scrubs-teal":   { body: "#14B8A6", collar: "#0F766E", dark: "#0D9488" },
  };
  const c = colors[itemKey] || colors["scrubs-blue"];
  return (
    <g>
      <rect x="4" y="20" width="44" height="32" rx="6" fill={c.body} />
      <path d="M22,20 L26,30 L30,20 Z" fill={c.collar} />
      <rect x="2" y="18" width="13" height="20" rx="6" fill={c.body} />
      <rect x="37" y="18" width="13" height="20" rx="6" fill={c.body} />
      <rect x="8" y="20" width="1" height="1" rx="0" fill={c.collar} />
      {/* Pocket */}
      <rect x="13" y="30" width="10" height="8" rx="2" fill={c.dark} opacity="0.4" />
    </g>
  );
}

function HatPreview({ itemKey }: { itemKey: string }) {
  if (itemKey === "hat-nurse-cap") {
    return (
      <g>
        <rect x="8" y="14" width="36" height="22" rx="4" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="22" y="18" width="7" height="14" rx="2" fill="#EF4444" />
        <rect x="17" y="23" width="17" height="5" rx="2" fill="#EF4444" />
        <rect x="6" y="32" width="40" height="5" rx="2" fill="#E2E8F0" />
      </g>
    );
  }
  // grad cap
  return (
    <g>
      <polygon points="26,6 4,18 26,26 48,18" fill="#1E293B" />
      <rect x="19" y="21" width="14" height="10" rx="2" fill="#1E293B" />
      <rect x="32" y="18" width="2" height="14" rx="1" fill="#64748B" />
      <circle cx="34" cy="33" r="3" fill="#F97316" />
      <rect x="14" y="34" width="24" height="5" rx="2" fill="#334155" />
    </g>
  );
}

function BadgePreview({ itemKey }: { itemKey: string }) {
  const BADGE_COLORS: Record<string, { bg: string; inner: string; text: string; clip: string }> = {
    "badge-blue":   { bg: "#1D4ED8", inner: "#3B82F6", text: "white",   clip: "#1E40AF" },
    "badge-green":  { bg: "#15803D", inner: "#22C55E", text: "white",   clip: "#166534" },
    "badge-purple": { bg: "#7E22CE", inner: "#A855F7", text: "white",   clip: "#6B21A8" },
    "badge-gold":   { bg: "#B45309", inner: "#D4A017", text: "#7C4A0A", clip: "#92400E" },
  };
  const bc = BADGE_COLORS[itemKey] ?? BADGE_COLORS["badge-blue"];
  return (
    <g>
      <rect x="8" y="10" width="36" height="24" rx="5" fill={bc.bg} />
      <rect x="11" y="13" width="30" height="18" rx="3" fill={bc.inner} />
      <text x="26" y="27" textAnchor="middle" fontSize="10" fill={bc.text} fontWeight="bold">SN</text>
      <rect x="22" y="34" width="8" height="8" rx="1" fill={bc.bg} />
      <rect x="10" y="40" width="32" height="4" rx="2" fill={bc.clip} />
    </g>
  );
}

function StethoscopePreview({ itemKey }: { itemKey: string }) {
  const colors: Record<string, string> = {
    "stethoscope-silver": "#94A3B8",
    "stethoscope-blue":   "#3B82F6",
    "stethoscope-orange": "#F97316",
    "stethoscope-pink":   "#EC4899",
    "stethoscope-gold":   "#D4A017",
  };
  const color = colors[itemKey] || "#94A3B8";
  return (
    <g>
      {/* Earpieces */}
      <circle cx="16" cy="10" r="4" fill={color} />
      <circle cx="36" cy="10" r="4" fill={color} />
      {/* Tubes going down and meeting */}
      <path d="M16,14 Q14,24 20,32 Q26,38 26,40" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M36,14 Q38,24 32,32 Q26,38 26,40" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      {/* Chest piece */}
      <circle cx="26" cy="44" r="7" fill={color} />
      <circle cx="26" cy="44" r="4" fill="white" opacity="0.4" />
      {/* Connecting bar */}
      <rect x="14" y="8" width="24" height="4" rx="2" fill={color} />
    </g>
  );
}
