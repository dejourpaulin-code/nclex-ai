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


type CatalogItem = { key: string; label: string; tier: "starter" | "unlock"; unlockDesc: string | null };

const ITEM_CATALOG: Record<string, CatalogItem[]> = {
  scrubs: [
    { key: "scrubs-orange", label: "Orange Scrubs", tier: "starter", unlockDesc: null },
    { key: "scrubs-blue",   label: "Blue Scrubs",   tier: "unlock",  unlockDesc: "Answer 50 questions" },
    { key: "scrubs-green",  label: "Green Scrubs",  tier: "unlock",  unlockDesc: "Answer 150 questions" },
    { key: "scrubs-purple", label: "Purple Scrubs", tier: "unlock",  unlockDesc: "Answer 175 questions" },
    { key: "scrubs-pink",   label: "Pink Scrubs",   tier: "unlock",  unlockDesc: "Answer 225 questions" },
    { key: "scrubs-teal",   label: "Teal Scrubs",   tier: "unlock",  unlockDesc: "Answer 300 questions" },
  ],
  hat: [
    { key: "hat-nurse-cap", label: "Nurse Cap", tier: "starter", unlockDesc: null },
    { key: "hat-grad-cap",  label: "Grad Cap",  tier: "unlock",  unlockDesc: "Answer 250 questions" },
  ],
  badge: [
    { key: "badge-blue",   label: "Blue Badge",   tier: "starter", unlockDesc: null },
    { key: "badge-green",  label: "Green Badge",  tier: "unlock",  unlockDesc: "Answer 10 questions" },
    { key: "badge-purple", label: "Purple Badge", tier: "unlock",  unlockDesc: "Answer 100 questions" },
    { key: "badge-gold",   label: "Gold Badge",   tier: "unlock",  unlockDesc: "Answer 350 questions or 90% accuracy" },
  ],
  stethoscope: [
    { key: "stethoscope-blue",   label: "Blue Stethoscope",   tier: "starter", unlockDesc: null },
    { key: "stethoscope-silver", label: "Silver Stethoscope", tier: "unlock",  unlockDesc: "Answer 25 questions" },
    { key: "stethoscope-orange", label: "Orange Stethoscope", tier: "unlock",  unlockDesc: "Answer 25 questions" },
    { key: "stethoscope-pink",   label: "Pink Stethoscope",   tier: "unlock",  unlockDesc: "Answer 200 questions or 70% accuracy" },
    { key: "stethoscope-gold",   label: "Gold Stethoscope",   tier: "unlock",  unlockDesc: "Answer 275 questions" },
  ],
};

const STARTER_ITEM_KEYS = new Set(["scrubs-orange", "hat-nurse-cap", "badge-blue", "stethoscope-blue"]);

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

  async function unequipItem(itemType: string) {
    if (!userId) return;
    setMessage("Removing...");
    const res = await fetch("/api/unequip-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, itemType }),
    });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Failed to remove item."); return; }
    setMessage("Item removed!");
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

  const unlockedItemKeys = new Set(items.map((i) => i.item_key));
  const allCatalogItems = Object.values(ITEM_CATALOG).flat();
  const totalUnlocked = allCatalogItems.filter((i) => i.tier === "starter" || unlockedItemKeys.has(i.key)).length;
  const totalEquipped = [profile?.equipped_scrubs, profile?.equipped_hat, profile?.equipped_badge, profile?.equipped_stethoscope].filter(Boolean).length;

  const itemTypeCounts = useMemo(() => ({
    hats:         ITEM_CATALOG.hat.filter((i) => i.tier === "starter" || unlockedItemKeys.has(i.key)).length,
    badges:       ITEM_CATALOG.badge.filter((i) => i.tier === "starter" || unlockedItemKeys.has(i.key)).length,
    stethoscopes: ITEM_CATALOG.stethoscope.filter((i) => i.tier === "starter" || unlockedItemKeys.has(i.key)).length,
    scrubs:       ITEM_CATALOG.scrubs.filter((i) => i.tier === "starter" || unlockedItemKeys.has(i.key)).length,
  }), [unlockedItemKeys]);

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
              <CatalogSection title="Scrub Sets"   itemType="scrubs"       catalog={ITEM_CATALOG.scrubs}       unlockedKeys={unlockedItemKeys} equippedKey={profile?.equipped_scrubs}       onEquip={equipItem} onUnequip={unequipItem} />
              <CatalogSection title="Stethoscopes" itemType="stethoscope"  catalog={ITEM_CATALOG.stethoscope}  unlockedKeys={unlockedItemKeys} equippedKey={profile?.equipped_stethoscope} onEquip={equipItem} onUnequip={unequipItem} />
              <CatalogSection title="Badges"       itemType="badge"        catalog={ITEM_CATALOG.badge}        unlockedKeys={unlockedItemKeys} equippedKey={profile?.equipped_badge}       onEquip={equipItem} onUnequip={unequipItem} />
              <CatalogSection title="Hats"         itemType="hat"          catalog={ITEM_CATALOG.hat}          unlockedKeys={unlockedItemKeys} equippedKey={profile?.equipped_hat}         onEquip={equipItem} onUnequip={unequipItem} />
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

function CatalogSection({ title, itemType, catalog, unlockedKeys, equippedKey, onEquip, onUnequip }: {
  title: string;
  itemType: string;
  catalog: CatalogItem[];
  unlockedKeys: Set<string>;
  equippedKey: string | null | undefined;
  onEquip: (itemKey: string, itemType: string) => void;
  onUnequip: (itemType: string) => void;
}) {
  const available = catalog.filter((i) => i.tier === "starter" || unlockedKeys.has(i.key)).length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {available}/{catalog.length} unlocked
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.map((item) => {
          const isEquipped = equippedKey === item.key;
          const isUnlocked = item.tier === "starter" || unlockedKeys.has(item.key);
          return (
            <div key={item.key} className={`rounded-xl border p-3 transition ${
              isEquipped ? "border-blue-300 bg-blue-50"
              : isUnlocked ? "border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm"
              : "border-slate-100 bg-slate-50 opacity-60"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <ItemPreview itemKey={item.key} itemType={itemType} />
                <div className="flex flex-col items-end gap-1">
                  {isEquipped && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Equipped</span>
                  )}
                  {item.tier === "starter" && !isEquipped && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">Free</span>
                  )}
                  {item.tier === "unlock" && isUnlocked && !isEquipped && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Earned</span>
                  )}
                  {item.tier === "unlock" && !isUnlocked && (
                    <span className="text-base" title={item.unlockDesc ?? undefined}>&#128274;</span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.label}</p>
              {item.tier === "unlock" && !isUnlocked && item.unlockDesc && (
                <p className="mt-0.5 text-xs text-slate-400">{item.unlockDesc}</p>
              )}
              <div className="mt-2">
                {isEquipped ? (
                  <button
                    onClick={() => onUnequip(itemType)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Unequip
                  </button>
                ) : isUnlocked ? (
                  <button
                    onClick={() => onEquip(item.key, itemType)}
                    className="w-full rounded-xl bg-orange-500 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600"
                  >
                    Equip
                  </button>
                ) : (
                  <button disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 py-1.5 text-xs font-semibold text-slate-400">Locked</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
