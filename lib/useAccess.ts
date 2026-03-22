"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type AccessRow = {
  id: string;
  access_level: string;
  plan: string;
  status: string;
  ends_at: string | null;
};

export function useAccess() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessRow | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setUserId(null);
          setAccess(null);
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const res = await fetch("/api/access/current", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAccess(null);
          setLoading(false);
          return;
        }

        setAccess(data.access || null);
      } catch {
        setAccess(null);
      }

      setLoading(false);
    }

    void load();
  }, []);

  return {
    loading,
    userId,
    access,
    accessLevel: access?.access_level || "free",
    plan: access?.plan || null,
  };
}