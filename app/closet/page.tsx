"use client";

import Navbar from "../../components/Navbar";
import AvatarDisplay from "../../components/AvatarDisplay";
import { supabase } from "../../lib/supabase";
import { useEffect, useMemo, useState } from "react";

type Unlock = {
  id: string;
  item_key: string;
  item_type: string;
  unlocked: boolean;
  equipped: boolean;
};

type Profile = {
  avatar_id: string;
  equipped_hat: string | null;
  equipped_badge: string | null;
  equipped_stethoscope: string | null;
  equipped_scrubs: string | null;
};

function itemVisual(itemKey: string, itemType: string) {
  if (itemType === "hat") {
    return itemKey === "hat-nurse-cap" ? "⛑️" : "🎓";
  }

  if (itemType === "badge") {
    return itemKey === "badge-bronze" ? "🥉" : "🏅";
  }

  if (itemType === "stethoscope") {
    return "🩺";
  }

  if (itemType === "scrubs") {
    if (itemKey === "scrubs-blue") return "🔵";
    if (itemKey === "scrubs-green") return "🟢";
    if (itemKey === "scrubs-purple") return "🟣";
  }

  return "✨";
}

function formatItemName(itemKey: string | null) {
  if (!itemKey) return "None";

  return itemKey
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ClosetPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Unlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCloset();
  }, []);

  async function loadCloset() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setMessage("You must be logged in to use the locker.");
      return;
    }

    setUserId(user.id);

    const [profileRes, unlockRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),

      supabase
        .from("user_unlocks")
        .select("*")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: true }),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
    }

    setItems((unlockRes.data || []) as Unlock[]);
    setLoading(false);
  }

  async function equipItem(itemKey: string, itemType: string) {
    if (!userId) return;

    setMessage("Equipping item...");

    const res = await fetch("/api/equip-item", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        itemKey,
        itemType,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Failed to equip item.");
      return;
    }

    setMessage("Item equipped.");
    await loadCloset();
  }

  const hats = items.filter((item) => item.item_type === "hat");
  const badges = items.filter((item) => item.item_type === "badge");
  const stethoscopes = items.filter((item) => item.item_type === "stethoscope");
  const scrubs = items.filter((item) => item.item_type === "scrubs");

  const totalUnlocked = items.length;
  const totalEquipped = items.filter((item) => item.equipped).length;

  const itemTypeCounts = useMemo(() => {
    return {
      hats: hats.length,
      badges: badges.length,
      stethoscopes: stethoscopes.length,
      scrubs: scrubs.length,
    };
  }, [hats.length, badges.length, stethoscopes.length, scrubs.length]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-[1500px] px-6 py-10 xl:px-10">
        <div className="mb-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-orange-200 bg-orange-100 px-4 py-1 text-sm font-medium text-orange-700">
              Avatar locker
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl xl:text-6xl">
              Build your
              <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                nurse identity
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Preview your avatar, equip unlocked gear, and build a visual identity
              that grows with your study progress.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Progression rewards
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Equip your gear
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Student identity
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Motivation system
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Unlocked</p>
              <p className="mt-2 text-3xl font-black">{totalUnlocked}</p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Equipped</p>
              <p className="mt-2 text-3xl font-black">{totalEquipped}</p>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Scrub Sets</p>
              <p className="mt-2 text-3xl font-black">{itemTypeCounts.scrubs}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Accessories</p>
              <p className="mt-2 text-3xl font-black">
                {itemTypeCounts.hats + itemTypeCounts.badges + itemTypeCounts.stethoscopes}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-blue-100 bg-white p-10 shadow-2xl">
            Loading locker...
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[400px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Avatar Preview</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Your current loadout and student look.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
                    Live Preview
                  </span>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto flex justify-center">
                    <AvatarDisplay
                      avatarId={profile?.avatar_id}
                      scrubs={profile?.equipped_scrubs}
                      hat={profile?.equipped_hat}
                      badge={profile?.equipped_badge}
                      stethoscope={profile?.equipped_stethoscope}
                      size={220}
                    />
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Hat</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatItemName(profile?.equipped_hat || null)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Badge</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatItemName(profile?.equipped_badge || null)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Stethoscope</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatItemName(profile?.equipped_stethoscope || null)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Scrubs</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatItemName(profile?.equipped_scrubs || null)}
                      </p>
                    </div>
                  </div>
                </div>

                {message && (
                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                    {message}
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <a
                    href="/quiz"
                    className="rounded-2xl bg-orange-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
                  >
                    Practice More
                  </a>

                  <a
                    href="/dashboard"
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Open Dashboard
                  </a>
                </div>
              </div>

              <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold">Collection Breakdown</h2>
                <p className="mt-2 text-sm text-slate-500">
                  What you’ve already unlocked across categories.
                </p>

                <div className="mt-5 space-y-4">
                  <CollectionRow label="Scrub Sets" value={itemTypeCounts.scrubs} color="bg-orange-500" />
                  <CollectionRow label="Hats" value={itemTypeCounts.hats} color="bg-blue-600" />
                  <CollectionRow label="Badges" value={itemTypeCounts.badges} color="bg-emerald-500" />
                  <CollectionRow
                    label="Stethoscopes"
                    value={itemTypeCounts.stethoscopes}
                    color="bg-purple-500"
                  />
                </div>
              </div>

              <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-xl">
                <h2 className="text-xl font-bold">Why this matters</h2>
                <p className="mt-2 text-sm text-slate-500">
                  The locker is more than visual — it rewards consistency.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    Answer more questions to unlock more gear.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    Equip items that reflect your progression and study identity.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    Build a system that feels motivating, memorable, and yours.
                  </div>
                </div>
              </div>
            </aside>

            <div className="space-y-6">
              <LockerSection title="Scrub Sets" items={scrubs} onEquip={equipItem} />
              <LockerSection title="Hats" items={hats} onEquip={equipItem} />
              <LockerSection title="Badges" items={badges} onEquip={equipItem} />
              <LockerSection title="Stethoscopes" items={stethoscopes} onEquip={equipItem} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function CollectionRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const width = Math.min(value * 25, 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function LockerSection({
  title,
  items,
  onEquip,
}: {
  title: string;
  items: Unlock[];
  onEquip: (itemKey: string, itemType: string) => void;
}) {
  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Equip unlocked gear and customize your student look.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {items.length} unlocked
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
          No unlocked {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-3xl border p-5 transition ${
                item.equipped
                  ? "border-blue-300 bg-blue-50 shadow-md"
                  : "border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-4xl">{itemVisual(item.item_key, item.item_type)}</div>

                {item.equipped ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Equipped
                  </span>
                ) : (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Unlocked
                  </span>
                )}
              </div>

              <p className="mt-4 text-lg font-semibold text-slate-900">
                {formatItemName(item.item_key)}
              </p>
              <p className="mt-1 text-sm text-slate-500 capitalize">{item.item_type}</p>

              <div className="mt-4 rounded-2xl border border-white/80 bg-white p-4 text-sm text-slate-600">
                {item.equipped
                  ? "This item is currently part of your active loadout."
                  : "Equip this item to update your avatar instantly."}
              </div>

              <div className="mt-4">
                {item.equipped ? (
                  <button
                    disabled
                    className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
                  >
                    Currently Equipped
                  </button>
                ) : (
                  <button
                    onClick={() => onEquip(item.item_key, item.item_type)}
                    className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                  >
                    Equip Item
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}