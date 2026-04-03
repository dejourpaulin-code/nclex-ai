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

      <section className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-700">
              Avatar Locker
            </div>
            <h1 className="text-2xl font-black tracking-tight">Your Nurse Identity</h1>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-blue-100 bg-white px-3 py-1.5 text-center shadow-sm">
              <p className="text-xs text-slate-500">Unlocked</p>
              <p className="text-base font-black">{totalUnlocked}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-1.5 text-center shadow-sm">
              <p className="text-xs text-slate-500">Equipped</p>
              <p className="text-base font-black">{totalEquipped}</p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white px-3 py-1.5 text-center shadow-sm">
              <p className="text-xs text-slate-500">Scrubs</p>
              <p className="text-base font-black">{itemTypeCounts.scrubs}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center shadow-sm">
              <p className="text-xs text-slate-500">Accessories</p>
              <p className="text-base font-black">
                {itemTypeCounts.hats + itemTypeCounts.badges + itemTypeCounts.stethoscopes}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading locker...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">

            {/* Sidebar */}
            <aside className="space-y-4">
              {/* Avatar preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold">Avatar Preview</h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Live</span>
                </div>

                <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50 py-4">
                  <AvatarDisplay
                    avatarId={profile?.avatar_id}
                    scrubs={profile?.equipped_scrubs}
                    hat={profile?.equipped_hat}
                    badge={profile?.equipped_badge}
                    stethoscope={profile?.equipped_stethoscope}
                    size={160}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: "Hat", value: profile?.equipped_hat },
                    { label: "Badge", value: profile?.equipped_badge },
                    { label: "Stethoscope", value: profile?.equipped_stethoscope },
                    { label: "Scrubs", value: profile?.equipped_scrubs },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900">{formatItemName(value || null)}</p>
                    </div>
                  ))}
                </div>

                {message && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700">
                    {message}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href="/quiz"
                    className="rounded-xl bg-orange-500 py-2 text-center text-xs font-semibold text-white transition hover:bg-orange-600"
                  >
                    Practice
                  </a>
                  <a
                    href="/dashboard"
                    className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    Dashboard
                  </a>
                </div>
              </div>

              {/* Collection breakdown */}
              <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-bold">Collection</h2>
                <div className="space-y-3">
                  <CollectionRow label="Scrub Sets" value={itemTypeCounts.scrubs} color="bg-orange-500" />
                  <CollectionRow label="Hats" value={itemTypeCounts.hats} color="bg-blue-600" />
                  <CollectionRow label="Badges" value={itemTypeCounts.badges} color="bg-emerald-500" />
                  <CollectionRow label="Stethoscopes" value={itemTypeCounts.stethoscopes} color="bg-purple-500" />
                </div>
              </div>
            </aside>

            {/* Item sections */}
            <div className="space-y-4">
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
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {items.length} unlocked
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          No unlocked {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 transition ${
                item.equipped
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl">{itemVisual(item.item_key, item.item_type)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.equipped
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {item.equipped ? "Equipped" : "Unlocked"}
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-900">{formatItemName(item.item_key)}</p>
              <p className="text-xs capitalize text-slate-500">{item.item_type}</p>

              <div className="mt-2">
                {item.equipped ? (
                  <button
                    disabled
                    className="w-full rounded-xl bg-slate-200 py-1.5 text-xs font-semibold text-slate-500"
                  >
                    Currently Equipped
                  </button>
                ) : (
                  <button
                    onClick={() => onEquip(item.item_key, item.item_type)}
                    className="w-full rounded-xl bg-orange-500 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
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
