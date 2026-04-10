import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Milestones ─────────────────────────────────────────────────────────────
// type: "q" = questions answered, "acc" = accuracy %, "streak" = max correct streak
const MILESTONES: { type: "q" | "acc" | "streak"; threshold: number; item_key: string; item_type: string; label: string }[] = [
  // ── Scrubs (questions answered) ──
  { type: "q", threshold:  25,  item_key: "scrubs-navy",     item_type: "scrubs", label: "Navy Scrubs — 25 Questions!"     },
  { type: "q", threshold:  50,  item_key: "scrubs-blue",     item_type: "scrubs", label: "Blue Scrubs — 50 Questions!"     },
  { type: "q", threshold:  75,  item_key: "scrubs-red",      item_type: "scrubs", label: "Red Scrubs — 75 Questions!"      },
  { type: "q", threshold: 100,  item_key: "scrubs-gray",     item_type: "scrubs", label: "Gray Scrubs — 100 Questions!"    },
  { type: "q", threshold: 125,  item_key: "scrubs-maroon",   item_type: "scrubs", label: "Maroon Scrubs — 125 Questions!"  },
  { type: "q", threshold: 150,  item_key: "scrubs-green",    item_type: "scrubs", label: "Green Scrubs — 150 Questions!"   },
  { type: "q", threshold: 175,  item_key: "scrubs-purple",   item_type: "scrubs", label: "Purple Scrubs — 175 Questions!"  },
  { type: "q", threshold: 200,  item_key: "scrubs-black",    item_type: "scrubs", label: "Black Scrubs — 200 Questions!"   },
  { type: "q", threshold: 225,  item_key: "scrubs-pink",     item_type: "scrubs", label: "Pink Scrubs — 225 Questions!"    },
  { type: "q", threshold: 250,  item_key: "scrubs-white",    item_type: "scrubs", label: "White Scrubs — 250 Questions!"   },
  { type: "q", threshold: 300,  item_key: "scrubs-teal",     item_type: "scrubs", label: "Teal Scrubs — 300 Questions!"    },
  { type: "q", threshold: 350,  item_key: "scrubs-coral",    item_type: "scrubs", label: "Coral Scrubs — 350 Questions!"   },
  { type: "q", threshold: 400,  item_key: "scrubs-lavender", item_type: "scrubs", label: "Lavender Scrubs — 400 Questions!"},
  { type: "q", threshold: 450,  item_key: "scrubs-mint",     item_type: "scrubs", label: "Mint Scrubs — 450 Questions!"    },
  { type: "q", threshold: 500,  item_key: "scrubs-burgundy", item_type: "scrubs", label: "Burgundy Scrubs — 500 Questions!"},
  { type: "q", threshold: 550,  item_key: "scrubs-olive",    item_type: "scrubs", label: "Olive Scrubs — 550 Questions!"   },
  { type: "q", threshold: 600,  item_key: "scrubs-yellow",   item_type: "scrubs", label: "Yellow Scrubs — 600 Questions!"  },
  { type: "q", threshold: 650,  item_key: "scrubs-crimson",  item_type: "scrubs", label: "Crimson Scrubs — 650 Questions!" },
  { type: "q", threshold: 700,  item_key: "scrubs-sky",      item_type: "scrubs", label: "Sky Scrubs — 700 Questions!"     },
  { type: "q", threshold: 750,  item_key: "scrubs-indigo",   item_type: "scrubs", label: "Indigo Scrubs — 750 Questions!"  },
  { type: "q", threshold: 800,  item_key: "scrubs-rose",     item_type: "scrubs", label: "Rose Scrubs — 800 Questions!"    },
  { type: "q", threshold: 850,  item_key: "scrubs-lime",     item_type: "scrubs", label: "Lime Scrubs — 850 Questions!"    },
  { type: "q", threshold: 900,  item_key: "scrubs-amber",    item_type: "scrubs", label: "Amber Scrubs — 900 Questions!"   },
  { type: "acc", threshold: 95, item_key: "scrubs-gold",     item_type: "scrubs", label: "Gold Scrubs — 95% Accuracy!"     },

  // ── Stethoscopes ──
  { type: "q",   threshold:  25, item_key: "stethoscope-silver",    item_type: "stethoscope", label: "Silver Stethoscope — 25 Questions!"      },
  { type: "q",   threshold:  40, item_key: "stethoscope-orange",    item_type: "stethoscope", label: "Orange Stethoscope — 40 Questions!"      },
  { type: "q",   threshold:  60, item_key: "stethoscope-red",       item_type: "stethoscope", label: "Red Stethoscope — 60 Questions!"         },
  { type: "q",   threshold:  90, item_key: "stethoscope-green",     item_type: "stethoscope", label: "Green Stethoscope — 90 Questions!"       },
  { type: "q",   threshold: 120, item_key: "stethoscope-purple",    item_type: "stethoscope", label: "Purple Stethoscope — 120 Questions!"     },
  { type: "q",   threshold: 160, item_key: "stethoscope-teal",      item_type: "stethoscope", label: "Teal Stethoscope — 160 Questions!"       },
  { type: "q",   threshold: 210, item_key: "stethoscope-black",     item_type: "stethoscope", label: "Black Stethoscope — 210 Questions!"      },
  { type: "q",   threshold: 260, item_key: "stethoscope-navy",      item_type: "stethoscope", label: "Navy Stethoscope — 260 Questions!"       },
  { type: "q",   threshold: 320, item_key: "stethoscope-white",     item_type: "stethoscope", label: "White Stethoscope — 320 Questions!"      },
  { type: "q",   threshold: 380, item_key: "stethoscope-coral",     item_type: "stethoscope", label: "Coral Stethoscope — 380 Questions!"      },
  { type: "q",   threshold: 440, item_key: "stethoscope-crimson",   item_type: "stethoscope", label: "Crimson Stethoscope — 440 Questions!"    },
  { type: "q",   threshold: 500, item_key: "stethoscope-gold",      item_type: "stethoscope", label: "Gold Stethoscope — 500 Questions!"       },
  { type: "acc", threshold:  70, item_key: "stethoscope-pink",      item_type: "stethoscope", label: "Pink Stethoscope — 70% Accuracy!"        },
  { type: "acc", threshold:  80, item_key: "stethoscope-rose-gold", item_type: "stethoscope", label: "Rose Gold Stethoscope — 80% Accuracy!"   },

  // ── Badges ──
  { type: "q",      threshold:  10,  item_key: "badge-green",    item_type: "badge", label: "Green Badge — 10 Questions!"     },
  { type: "q",      threshold:  30,  item_key: "badge-red",      item_type: "badge", label: "Red Badge — 30 Questions!"       },
  { type: "q",      threshold:  60,  item_key: "badge-teal",     item_type: "badge", label: "Teal Badge — 60 Questions!"      },
  { type: "q",      threshold:  80,  item_key: "badge-orange",   item_type: "badge", label: "Orange Badge — 80 Questions!"    },
  { type: "q",      threshold: 100,  item_key: "badge-purple",   item_type: "badge", label: "Purple Badge — 100 Questions!"   },
  { type: "q",      threshold: 150,  item_key: "badge-black",    item_type: "badge", label: "Black Badge — 150 Questions!"    },
  { type: "q",      threshold: 200,  item_key: "badge-silver",   item_type: "badge", label: "Silver Badge — 200 Questions!"   },
  { type: "q",      threshold: 300,  item_key: "badge-maroon",   item_type: "badge", label: "Maroon Badge — 300 Questions!"   },
  { type: "q",      threshold: 350,  item_key: "badge-gold",     item_type: "badge", label: "Gold Badge — 350 Questions!"     },
  { type: "q",      threshold: 400,  item_key: "badge-navy",     item_type: "badge", label: "Navy Badge — 400 Questions!"     },
  { type: "q",      threshold: 450,  item_key: "badge-pink",     item_type: "badge", label: "Pink Badge — 450 Questions!"     },
  { type: "q",      threshold: 500,  item_key: "badge-emerald",  item_type: "badge", label: "Emerald Badge — 500 Questions!"  },
  { type: "acc",    threshold:  75,  item_key: "badge-crimson",  item_type: "badge", label: "Crimson Badge — 75% Accuracy!"   },
  { type: "acc",    threshold:  90,  item_key: "badge-gold",     item_type: "badge", label: "Gold Badge — 90% Accuracy!"      },
  { type: "acc",    threshold:  95,  item_key: "badge-platinum", item_type: "badge", label: "Platinum Badge — 95% Accuracy!"  },

  // ── Hats ──
  { type: "q",      threshold:  15,  item_key: "hat-surgical-cap",     item_type: "hat", label: "Surgical Cap — 15 Questions!"      },
  { type: "q",      threshold:  35,  item_key: "hat-scrub-cap-teal",   item_type: "hat", label: "Teal Scrub Cap — 35 Questions!"    },
  { type: "q",      threshold:  55,  item_key: "hat-scrub-cap-purple", item_type: "hat", label: "Purple Scrub Cap — 55 Questions!"  },
  { type: "q",      threshold:  90,  item_key: "hat-scrub-cap-pink",   item_type: "hat", label: "Pink Scrub Cap — 90 Questions!"    },
  { type: "q",      threshold: 120,  item_key: "hat-beanie",           item_type: "hat", label: "Cozy Beanie — 120 Questions!"      },
  { type: "q",      threshold: 160,  item_key: "hat-beret",            item_type: "hat", label: "Beret — 160 Questions!"            },
  { type: "q",      threshold: 250,  item_key: "hat-grad-cap",         item_type: "hat", label: "Graduation Cap — 250 Questions!"   },
  { type: "q",      threshold: 500,  item_key: "hat-crown",            item_type: "hat", label: "Crown — 500 Questions!"            },
  { type: "q",      threshold: 700,  item_key: "hat-cat-ears",         item_type: "hat", label: "Cat Ears — 700 Questions!"         },
  { type: "q",      threshold: 900,  item_key: "hat-santa",            item_type: "hat", label: "Santa Hat — 900 Questions!"        },
  { type: "acc",    threshold:  80,  item_key: "hat-flower-crown",     item_type: "hat", label: "Flower Crown — 80% Accuracy!"      },
  { type: "acc",    threshold:  90,  item_key: "hat-halo",             item_type: "hat", label: "Halo — 90% Accuracy!"              },
  { type: "streak", threshold:  10,  item_key: "hat-surgical-cap",     item_type: "hat", label: "Surgical Cap — 10 Correct in a Row!"},
];

async function grantItem(userId: string, itemKey: string, itemType: string) {
  const { data: existing } = await supabase
    .from("user_unlocks")
    .select("id")
    .eq("user_id", userId)
    .eq("item_key", itemKey)
    .maybeSingle();

  if (existing) return null;

  const { data, error } = await supabase
    .from("user_unlocks")
    .insert({
      user_id: userId,
      item_key: itemKey,
      item_type: itemType,
      unlocked: true,
      equipped: false,
      unlocked_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error(`grantItem failed for ${itemKey}:`, error.message, error.details);
    return null;
  }

  return data;
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ newUnlocks: [] });

    const { data: historyRows, error: historyError } = await supabase
      .from("quiz_history")
      .select("is_correct")
      .eq("user_id", userId);

    if (historyError) {
      console.error("check-unlocks: failed to fetch quiz_history:", historyError.message);
      return NextResponse.json({ newUnlocks: [] });
    }

    const rows = historyRows ?? [];
    const totalAnswered = rows.length;
    const totalCorrect = rows.filter((r) => r.is_correct === true).length;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    // Compute max correct streak
    let maxStreak = 0, streak = 0;
    for (const r of rows) {
      if (r.is_correct === true) { streak++; if (streak > maxStreak) maxStreak = streak; }
      else streak = 0;
    }

    const newUnlocks: { item_key: string; item_type: string; label: string }[] = [];

    for (const m of MILESTONES) {
      let qualified = false;
      if (m.type === "q"      && totalAnswered >= m.threshold) qualified = true;
      if (m.type === "acc"    && totalAnswered >= 20 && accuracy >= m.threshold) qualified = true;
      if (m.type === "streak" && maxStreak >= m.threshold) qualified = true;

      if (qualified) {
        const granted = await grantItem(userId, m.item_key, m.item_type);
        if (granted) newUnlocks.push({ item_key: m.item_key, item_type: m.item_type, label: m.label });
      }
    }

    return NextResponse.json({ newUnlocks });
  } catch (err) {
    console.error("check-unlocks error:", err);
    return NextResponse.json({ newUnlocks: [] });
  }
}
