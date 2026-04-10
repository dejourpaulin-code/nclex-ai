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
    "scrubs-orange":   { body: "#F97316", collar: "#EA6C00", dark: "#C25A00" },
    "scrubs-navy":     { body: "#1E3A5F", collar: "#162B47", dark: "#0F1E33" },
    "scrubs-blue":     { body: "#3B82F6", collar: "#1D4ED8", dark: "#1E40AF" },
    "scrubs-red":      { body: "#EF4444", collar: "#B91C1C", dark: "#991B1B" },
    "scrubs-gray":     { body: "#6B7280", collar: "#4B5563", dark: "#374151" },
    "scrubs-maroon":   { body: "#9B2335", collar: "#7A1A28", dark: "#5C1220" },
    "scrubs-green":    { body: "#22C55E", collar: "#15803D", dark: "#166534" },
    "scrubs-purple":   { body: "#A855F7", collar: "#7E22CE", dark: "#6B21A8" },
    "scrubs-black":    { body: "#1F2937", collar: "#111827", dark: "#0A0F1A" },
    "scrubs-pink":     { body: "#EC4899", collar: "#BE185D", dark: "#9D174D" },
    "scrubs-white":    { body: "#F1F5F9", collar: "#CBD5E1", dark: "#94A3B8" },
    "scrubs-teal":     { body: "#14B8A6", collar: "#0F766E", dark: "#0D9488" },
    "scrubs-coral":    { body: "#FB7185", collar: "#E11D48", dark: "#BE123C" },
    "scrubs-lavender": { body: "#C4B5FD", collar: "#7C3AED", dark: "#6D28D9" },
    "scrubs-mint":     { body: "#6EE7B7", collar: "#059669", dark: "#047857" },
    "scrubs-burgundy": { body: "#7C2D3B", collar: "#5C2028", dark: "#3F1520" },
    "scrubs-olive":    { body: "#65A30D", collar: "#3F6212", dark: "#2D4A0A" },
    "scrubs-yellow":   { body: "#EAB308", collar: "#A16207", dark: "#854D0E" },
    "scrubs-crimson":  { body: "#DC2626", collar: "#991B1B", dark: "#7F1D1D" },
    "scrubs-sky":      { body: "#38BDF8", collar: "#0284C7", dark: "#0369A1" },
    "scrubs-indigo":   { body: "#6366F1", collar: "#4338CA", dark: "#3730A3" },
    "scrubs-rose":     { body: "#F43F5E", collar: "#BE123C", dark: "#9F1239" },
    "scrubs-lime":     { body: "#84CC16", collar: "#4D7C0F", dark: "#3F6212" },
    "scrubs-amber":    { body: "#F59E0B", collar: "#B45309", dark: "#92400E" },
    "scrubs-gold":     { body: "#D4A017", collar: "#A07010", dark: "#7A5500" },
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
  if (itemKey === "hat-grad-cap") {
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
  const SCRUB_CAP_COLORS: Record<string, { body: string; band: string; dot: string }> = {
    "hat-surgical-cap":    { body: "#3B82F6", band: "#1D4ED8", dot: "#93C5FD" },
    "hat-scrub-cap-teal":  { body: "#14B8A6", band: "#0F766E", dot: "#5EEAD4" },
    "hat-scrub-cap-purple":{ body: "#A855F7", band: "#7E22CE", dot: "#D8B4FE" },
    "hat-scrub-cap-pink":  { body: "#EC4899", band: "#BE185D", dot: "#FBCFE8" },
  };
  if (SCRUB_CAP_COLORS[itemKey]) {
    const sc = SCRUB_CAP_COLORS[itemKey];
    return (
      <g>
        <ellipse cx="26" cy="24" rx="20" ry="11" fill={sc.body} />
        <rect x="6" y="28" width="40" height="8" rx="3" fill={sc.band} />
        <circle cx="16" cy="19" r="3" fill={sc.dot} />
        <circle cx="26" cy="15" r="3" fill={sc.dot} />
        <circle cx="36" cy="19" r="3" fill={sc.dot} />
      </g>
    );
  }
  if (itemKey === "hat-beanie") {
    return (
      <g>
        <ellipse cx="26" cy="26" rx="20" ry="13" fill="#F97316" />
        <rect x="6" y="31" width="40" height="6" rx="3" fill="#C25A00" />
        <circle cx="26" cy="15" r="5" fill="#FDBA74" />
        <circle cx="26" cy="15" r="3" fill="#FED7AA" />
      </g>
    );
  }
  if (itemKey === "hat-beret") {
    return (
      <g>
        <ellipse cx="26" cy="22" rx="22" ry="10" fill="#7E22CE" />
        <ellipse cx="26" cy="21" rx="14" ry="8" fill="#9333EA" />
        <circle cx="37" cy="19" r="3.5" fill="#7E22CE" />
        <rect x="18" y="28" width="16" height="4" rx="2" fill="#6B21A8" />
      </g>
    );
  }
  if (itemKey === "hat-crown") {
    return (
      <g>
        <polygon points="6,36 13,16 20,28 26,10 32,28 39,16 46,36" fill="#D4A017" stroke="#B45309" strokeWidth="1.2" />
        <rect x="6" y="35" width="40" height="7" rx="2" fill="#D4A017" />
        <circle cx="26" cy="12" r="3.5" fill="#EF4444" />
        <circle cx="13" cy="19" r="2.5" fill="#3B82F6" />
        <circle cx="39" cy="19" r="2.5" fill="#3B82F6" />
      </g>
    );
  }
  if (itemKey === "hat-halo") {
    return (
      <g>
        <ellipse cx="26" cy="16" rx="16" ry="4.5" fill="none" stroke="#D4A017" strokeWidth="3.5" />
        <ellipse cx="26" cy="16" rx="16" ry="4.5" fill="none" stroke="#FDE68A" strokeWidth="2" opacity="0.6" />
        <ellipse cx="26" cy="32" rx="12" ry="6" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
      </g>
    );
  }
  if (itemKey === "hat-flower-crown") {
    return (
      <g>
        <path d="M4,28 Q26,35 48,28" fill="none" stroke="#65A30D" strokeWidth="2.5" />
        <circle cx="8"  cy="24" r="5" fill="#EC4899" /><circle cx="8"  cy="24" r="2.5" fill="#FDE68A" />
        <circle cx="17" cy="18" r="5" fill="#F97316" /><circle cx="17" cy="18" r="2.5" fill="#FDE68A" />
        <circle cx="26" cy="15" r="5.5" fill="#A855F7" /><circle cx="26" cy="15" r="2.8" fill="#FDE68A" />
        <circle cx="35" cy="18" r="5" fill="#22C55E" /><circle cx="35" cy="18" r="2.5" fill="#FDE68A" />
        <circle cx="44" cy="24" r="5" fill="#3B82F6" /><circle cx="44" cy="24" r="2.5" fill="#FDE68A" />
      </g>
    );
  }
  if (itemKey === "hat-cat-ears") {
    return (
      <g>
        <ellipse cx="26" cy="32" rx="20" ry="8" fill="#EC4899" />
        <polygon points="8,30 12,12 20,28"  fill="#EC4899" /><polygon points="10,28 13,16 18,27" fill="#FBCFE8" />
        <polygon points="32,28 40,12 44,30" fill="#EC4899" /><polygon points="34,27 39,16 42,28" fill="#FBCFE8" />
      </g>
    );
  }
  if (itemKey === "hat-santa") {
    return (
      <g>
        <path d="M8,34 Q16,12 32,8 L40,34" fill="#DC2626" />
        <rect x="6" y="32" width="38" height="7" rx="3.5" fill="white" />
        <circle cx="32" cy="9" r="5" fill="white" />
      </g>
    );
  }
  return <g><rect x="8" y="20" width="36" height="20" rx="4" fill="#94A3B8"/></g>;
}

function BadgePreview({ itemKey }: { itemKey: string }) {
  const BADGE_COLORS: Record<string, { bg: string; inner: string; text: string; clip: string }> = {
    "badge-blue":     { bg: "#1D4ED8", inner: "#3B82F6", text: "white",   clip: "#1E40AF" },
    "badge-green":    { bg: "#15803D", inner: "#22C55E", text: "white",   clip: "#166534" },
    "badge-purple":   { bg: "#7E22CE", inner: "#A855F7", text: "white",   clip: "#6B21A8" },
    "badge-red":      { bg: "#991B1B", inner: "#EF4444", text: "white",   clip: "#7F1D1D" },
    "badge-teal":     { bg: "#0F766E", inner: "#14B8A6", text: "white",   clip: "#134E4A" },
    "badge-orange":   { bg: "#C2410C", inner: "#F97316", text: "white",   clip: "#9A3412" },
    "badge-black":    { bg: "#111827", inner: "#374151", text: "white",   clip: "#030712" },
    "badge-silver":   { bg: "#64748B", inner: "#94A3B8", text: "white",   clip: "#475569" },
    "badge-maroon":   { bg: "#7C2D3B", inner: "#B45563", text: "white",   clip: "#5C2028" },
    "badge-gold":     { bg: "#B45309", inner: "#D4A017", text: "#7C4A0A", clip: "#92400E" },
    "badge-navy":     { bg: "#1E3A5F", inner: "#2563EB", text: "white",   clip: "#162B47" },
    "badge-pink":     { bg: "#9D174D", inner: "#EC4899", text: "white",   clip: "#831843" },
    "badge-emerald":  { bg: "#065F46", inner: "#10B981", text: "white",   clip: "#064E3B" },
    "badge-crimson":  { bg: "#7F1D1D", inner: "#DC2626", text: "white",   clip: "#450A0A" },
    "badge-platinum": { bg: "#374151", inner: "#D1D5DB", text: "#1F2937", clip: "#1F2937" },
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
    "stethoscope-blue":      "#3B82F6",
    "stethoscope-silver":    "#94A3B8",
    "stethoscope-orange":    "#F97316",
    "stethoscope-red":       "#EF4444",
    "stethoscope-green":     "#22C55E",
    "stethoscope-purple":    "#A855F7",
    "stethoscope-teal":      "#14B8A6",
    "stethoscope-black":     "#1F2937",
    "stethoscope-pink":      "#EC4899",
    "stethoscope-navy":      "#1E3A5F",
    "stethoscope-white":     "#F1F5F9",
    "stethoscope-coral":     "#FB7185",
    "stethoscope-gold":      "#D4A017",
    "stethoscope-rose-gold": "#E8A598",
    "stethoscope-crimson":   "#DC2626",
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
