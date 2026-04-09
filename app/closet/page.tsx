"use client";

import Navbar from "../../components/Navbar";
import AvatarDisplay, { AvatarConfig } from "../../components/AvatarDisplay";
import ItemPreview from "../../components/ItemPreview";
import { supabase } from "../../lib/supabase";
import { saveAvatarConfigLocal, resolveAvatarConfig } from "../../lib/avatarConfig";
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
  avatar_gender?: string | null;
  avatar_skin_tone?: string | null;
  avatar_hair_color?: string | null;
  avatar_eye_color?: string | null;
};

function formatItemName(itemKey: string | null) {
  if (!itemKey) return "None";
  return itemKey.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SKIN_OPTIONS: { key: AvatarConfig["skinTone"]; label: string; color: string }[] = [
  { key: "light",  label: "Light",  color: "#FFE0BA" },
  { key: "medium", label: "Medium", color: "#D4956A" },
  { key: "tan",    label: "Tan",    color: "#C68642" },
  { key: "dark",   label: "Dark",   color: "#8D5524" },
];

const HAIR_OPTIONS: { key: AvatarConfig["hairColor"]; label: string; color: string }[] = [
  { key: "black",  label: "Black",  color: "#1C1C1C" },
  { key: "brown",  label: "Brown",  color: "#5C3010" },
  { key: "blonde", label: "Blonde", color: "#D4A017" },
  { key: "red",    label: "Red",    color: "#B83020" },
  { key: "auburn", label: "Auburn", color: "#7B3F00" },
];

const EYE_OPTIONS: { key: AvatarConfig["eyeColor"]; label: string; color: string }[] = [
  { key: "brown", label: "Brown", color: "#7B4A2A" },
  { key: "blue",  label: "Blue",  color: "#3B82F6" },
  { key: "green", label: "Green", color: "#16A34A" },
  { key: "hazel", label: "Hazel", color: "#9B7020" },
  { key: "gray",  label: "Gray",  color: "#6B7280" },
];


export default function ClosetPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Unlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"items" | "customize">("items");

  const [customGender, setCustomGender] = useState<"female" | "male">("female");
  const [customSkin,   setCustomSkin]   = useState<AvatarConfig["skinTone"]>("light");
  const [customHair,   setCustomHair]   = useState<AvatarConfig["hairColor"]>("black");
  const [customEye,    setCustomEye]    = useState<AvatarConfig["eyeColor"]>("brown");
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => { loadCloset(); }, []);

  async function loadCloset() {
    setLoading(true);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setMessage("You must be logged in."); return; }
    setUserId(user.id);

    const [profileRes, unlockRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_unlocks").select("*").eq("user_id", user.id).order("unlocked_at", { ascending: true }),
    ]);

    if (profileRes.data) {
      const p = profileRes.data as Profile;
      setProfile(p);

      // If DB has no avatar config but localStorage does, use localStorage values
      // and immediately sync them back to DB so they persist across devices
      const { loadAvatarConfigLocal } = await import("../../lib/avatarConfig");
      const local = loadAvatarConfigLocal();
      const dbMissing = !p.avatar_gender && !p.avatar_skin_tone && !p.avatar_hair_color;

      const resolvedGender = (dbMissing && local?.gender ? local.gender : p.avatar_gender as "female" | "male") ?? "female";
      const resolvedSkin   = (dbMissing && local?.skinTone ? local.skinTone : p.avatar_skin_tone as AvatarConfig["skinTone"]) ?? "light";
      const resolvedHair   = (dbMissing && local?.hairColor ? local.hairColor : p.avatar_hair_color as AvatarConfig["hairColor"]) ?? "black";
      const resolvedEye    = (dbMissing && local?.eyeColor ? local.eyeColor : p.avatar_eye_color as AvatarConfig["eyeColor"]) ?? "brown";

      setCustomGender(resolvedGender);
      setCustomSkin(resolvedSkin);
      setCustomHair(resolvedHair);
      setCustomEye(resolvedEye);

      // Sync localStorage values to DB if DB was empty
      if (dbMissing && local) {
        fetch("/api/save-avatar-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, gender: resolvedGender, skinTone: resolvedSkin, hairColor: resolvedHair, eyeColor: resolvedEye }),
        }).catch(() => {});
      }
    }

    setItems((unlockRes.data || []) as Unlock[]);
    setLoading(false);
  }

  async function equipItem(itemKey: string, itemType: string) {
    if (!userId) return;
    setMessage("Equipping...");
    const res = await fetch("/api/equip-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, itemKey, itemType }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Failed to equip item."); return; }
    setMessage("Item equipped!");
    await loadCloset();
  }

  async function saveAvatarConfig() {
    if (!userId) return;
    setSavingConfig(true);

    const config: AvatarConfig = { gender: customGender, skinTone: customSkin, hairColor: customHair, eyeColor: customEye };

    // Always save to localStorage first — guaranteed to work immediately
    saveAvatarConfigLocal(config);

    // Update local profile state so My Items tab reflects it instantly
    setProfile((prev) => prev ? {
      ...prev,
      avatar_gender: customGender,
      avatar_skin_tone: customSkin,
      avatar_hair_color: customHair,
      avatar_eye_color: customEye,
    } : prev);

    // Persist to DB
    try {
      const dbRes = await fetch("/api/save-avatar-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, gender: customGender, skinTone: customSkin, hairColor: customHair, eyeColor: customEye }),
      });
      if (!dbRes.ok) {
        const errData = await dbRes.json().catch(() => ({}));
        console.error("Avatar DB save failed:", errData);
      }
    } catch (e) {
      console.error("Avatar save network error:", e);
    }

    setSavingConfig(false);
    setMessage("Avatar saved!");
  }

  const hats        = items.filter((i) => i.item_type === "hat");
  const badges      = items.filter((i) => i.item_type === "badge");
  const stethoscopes = items.filter((i) => i.item_type === "stethoscope");
  const scrubs      = items.filter((i) => i.item_type === "scrubs");
  const totalUnlocked = items.length;
  const totalEquipped = items.filter((i) => i.equipped).length;

  const itemTypeCounts = useMemo(() => ({
    hats: hats.length, badges: badges.length, stethoscopes: stethoscopes.length, scrubs: scrubs.length,
  }), [hats.length, badges.length, stethoscopes.length, scrubs.length]);

  const liveConfig: AvatarConfig  = { gender: customGender, skinTone: customSkin, hairColor: customHair, eyeColor: customEye };
  const savedConfig = resolveAvatarConfig(profile);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-6">

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-700">Avatar Locker</div>
            <h1 className="text-2xl font-black tracking-tight">Your Nurse Identity</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Unlocked", val: totalUnlocked, border: "border-blue-100" },
              { label: "Equipped", val: totalEquipped, border: "border-emerald-100" },
              { label: "Scrubs", val: itemTypeCounts.scrubs, border: "border-orange-100" },
              { label: "Accessories", val: itemTypeCounts.hats + itemTypeCounts.badges + itemTypeCounts.stethoscopes, border: "border-slate-200" },
            ].map(({ label, val, border }) => (
              <div key={label} className={`rounded-xl border ${border} bg-white px-3 py-1.5 text-center shadow-sm`}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-base font-black">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          {(["items", "customize"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab ? "bg-orange-500 text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}>
              {tab === "items" ? "My Items" : "Create Your Avatar"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading locker...</div>
        ) : activeTab === "customize" ? (

          /* ── CUSTOMIZE TAB ── */
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold">Live Preview</h2>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">Editing</span>
                </div>
                <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50 py-6">
                  <AvatarDisplay
                    scrubs={profile?.equipped_scrubs} hat={profile?.equipped_hat}
                    badge={profile?.equipped_badge} stethoscope={profile?.equipped_stethoscope}
                    size={160} config={liveConfig}
                  />
                </div>
                {message && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700">{message}</div>
                )}
                <button onClick={saveAvatarConfig} disabled={savingConfig}
                  className="mt-3 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60">
                  {savingConfig ? "Saving..." : "Save Avatar"}
                </button>
              </div>
            </aside>

            <div className="space-y-4">
              {/* Gender */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold">Gender</h2>
                <div className="flex gap-3">
                  {(["female", "male"] as const).map((g) => (
                    <button key={g} onClick={() => setCustomGender(g)}
                      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 py-4 transition ${
                        customGender === g ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}>
                      <AvatarDisplay size={80} config={{ gender: g, skinTone: customSkin, hairColor: customHair, eyeColor: customEye }} />
                      <span className="text-sm font-semibold capitalize text-slate-700">{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin tone */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold">Skin Tone</h2>
                <div className="grid grid-cols-4 gap-3">
                  {SKIN_OPTIONS.map(({ key, label, color }) => (
                    <button key={key} onClick={() => setCustomSkin(key)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-3 transition ${
                        customSkin === key ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}>
                      <span className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }}/>
                      <span className="text-xs font-medium text-slate-600">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair color */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold">Hair Color</h2>
                <div className="grid grid-cols-5 gap-3">
                  {HAIR_OPTIONS.map(({ key, label, color }) => (
                    <button key={key} onClick={() => setCustomHair(key)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-3 transition ${
                        customHair === key ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}>
                      <span className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }}/>
                      <span className="text-xs font-medium text-slate-600">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Eye color */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold">Eye Color</h2>
                <div className="grid grid-cols-5 gap-3">
                  {EYE_OPTIONS.map(({ key, label, color }) => (
                    <button key={key} onClick={() => setCustomEye(key)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-3 transition ${
                        customEye === key ? "border-orange-400 bg-orange-50" : "border-slate-200 bg-slate-50 hover:bg-white"
                      }`}>
                      <span className="h-8 w-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: color }}/>
                      <span className="text-xs font-medium text-slate-600">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        ) : (

          /* ── MY ITEMS TAB ── */
          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold">Avatar Preview</h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">Live</span>
                </div>
                <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50 py-4">
                  <AvatarDisplay
                    scrubs={profile?.equipped_scrubs} hat={profile?.equipped_hat}
                    badge={profile?.equipped_badge} stethoscope={profile?.equipped_stethoscope}
                    size={160} config={savedConfig}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: "Hat",          value: profile?.equipped_hat },
                    { label: "Badge",        value: profile?.equipped_badge },
                    { label: "Stethoscope",  value: profile?.equipped_stethoscope },
                    { label: "Scrubs",       value: profile?.equipped_scrubs },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900">{formatItemName(value || null)}</p>
                    </div>
                  ))}
                </div>
                {message && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700">{message}</div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a href="/quiz" className="rounded-xl bg-orange-500 py-2 text-center text-xs font-semibold text-white transition hover:bg-orange-600">Practice</a>
                  <a href="/dashboard" className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-900 transition hover:bg-slate-50">Dashboard</a>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-bold">Collection</h2>
                <div className="space-y-3">
                  <CollectionRow label="Scrub Sets"    value={itemTypeCounts.scrubs}       color="bg-orange-500" />
                  <CollectionRow label="Hats"          value={itemTypeCounts.hats}          color="bg-blue-600"   />
                  <CollectionRow label="Badges"        value={itemTypeCounts.badges}        color="bg-emerald-500"/>
                  <CollectionRow label="Stethoscopes"  value={itemTypeCounts.stethoscopes}  color="bg-purple-500" />
                </div>
              </div>
            </aside>

            <div className="space-y-4">
              <LockerSection title="Scrub Sets"   items={scrubs}       onEquip={equipItem} />
              <LockerSection title="Stethoscopes" items={stethoscopes} onEquip={equipItem} />
              <LockerSection title="Badges"       items={badges}       onEquip={equipItem} />
              <LockerSection title="Hats"         items={hats}         onEquip={equipItem} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function CollectionRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value * 25, 100)}%` }} />
      </div>
    </div>
  );
}

function LockerSection({ title, items, onEquip }: {
  title: string; items: Unlock[]; onEquip: (itemKey: string, itemType: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{items.length} unlocked</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          No unlocked {title.toLowerCase()} yet. Keep answering questions to unlock more!
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className={`rounded-xl border p-3 transition ${
              item.equipped ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <ItemPreview itemKey={item.item_key} itemType={item.item_type} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  item.equipped ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-500"
                }`}>
                  {item.equipped ? "Equipped" : "Unlocked"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatItemName(item.item_key)}</p>
              <p className="text-xs capitalize text-slate-500">{item.item_type}</p>
              <div className="mt-2">
                {item.equipped ? (
                  <button disabled className="w-full rounded-xl bg-slate-200 py-1.5 text-xs font-semibold text-slate-500">Currently Equipped</button>
                ) : (
                  <button onClick={() => onEquip(item.item_key, item.item_type)}
                    className="w-full rounded-xl bg-orange-500 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600">
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
