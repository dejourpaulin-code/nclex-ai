"use client";

import Image from "next/image";

type AvatarDisplayProps = {
  avatarId?: string | null;
  scrubs?: string | null;
  hat?: string | null;
  badge?: string | null;
  stethoscope?: string | null;
  size?: number;
  lexi?: boolean;
};

export default function AvatarDisplay({
  avatarId,
  scrubs,
  hat,
  badge,
  stethoscope,
  size = 140,
  lexi = false,
}: AvatarDisplayProps) {
  const dimension = `${size}px`;

  if (lexi) {
    return (
      <div
        className="relative overflow-hidden rounded-full border border-blue-200 bg-white shadow-lg"
        style={{ width: dimension, height: dimension }}
      >
        <Image
          src="/lexi/lexi-base.png"
          alt="Lexi"
          fill
          className="object-contain"
          sizes={dimension}
        />
      </div>
    );
  }

  const baseSrc = avatarId ? `/avatar/base/${avatarId}.png` : null;
  const scrubsSrc = scrubs ? `/avatar/scrubs/${scrubs}.png` : null;
  const hatSrc = hat ? `/avatar/hats/${hat}.png` : null;
  const badgeSrc = badge ? `/avatar/badges/${badge}.png` : null;
  const stethoscopeSrc = stethoscope
    ? `/avatar/stethoscopes/${stethoscope}.png`
    : null;

  return (
    <div
      className="relative overflow-hidden rounded-full border border-slate-200 bg-white shadow-lg"
      style={{ width: dimension, height: dimension }}
    >
      {baseSrc && (
        <Image
          src={baseSrc}
          alt="Avatar base"
          fill
          className="object-contain"
          sizes={dimension}
        />
      )}

      {scrubsSrc && (
        <Image
          src={scrubsSrc}
          alt="Avatar scrubs"
          fill
          className="object-contain"
          sizes={dimension}
        />
      )}

      {hatSrc && (
        <Image
          src={hatSrc}
          alt="Avatar hat"
          fill
          className="object-contain"
          sizes={dimension}
        />
      )}

      {badgeSrc && (
        <Image
          src={badgeSrc}
          alt="Avatar badge"
          fill
          className="object-contain"
          sizes={dimension}
        />
      )}

      {stethoscopeSrc && (
        <Image
          src={stethoscopeSrc}
          alt="Avatar stethoscope"
          fill
          className="object-contain"
          sizes={dimension}
        />
      )}
    </div>
  );
}