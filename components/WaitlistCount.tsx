"use client";

import { useEffect, useMemo, useState } from "react";

type WaitlistCountProps = {
  className?: string;
  dark?: boolean;
};

export default function WaitlistCount({
  className = "",
  dark = false,
}: WaitlistCountProps) {
  const [count, setCount] = useState<number | null>(null);

 useEffect(() => {
  let interval: NodeJS.Timeout;

  async function loadCount() {
    try {
      const res = await fetch("/api/waitlist/count");
      const data = await res.json();

      if (!res.ok) return;
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      setCount(null);
    }
  }

  loadCount();
  interval = setInterval(loadCount, 10000); // refresh every 10s

  return () => clearInterval(interval);
}, []);
  const message = useMemo(() => {
    if (count === null) return "";

    if (count === 0) {
      return "Be early before the next access wave opens";
    }

    if (count === 1) {
      return "1 student already joined early access";
    }

    if (count < 10) {
      return `${count} students already joined early access`;
    }

    if (count < 50) {
      return `${count} nursing students already joined early access`;
    }

    if (count < 250) {
      return `${count} nursing students are already on the waitlist`;
    }

    return `${count.toLocaleString()} nursing students are already on the waitlist`;
  }, [count]);

  if (!message) return null;

  return (
    <p
      className={`text-sm font-semibold ${
        dark ? "text-orange-100" : "text-slate-600"
      } ${className}`}
    >
      <span className={dark ? "text-white" : "text-blue-900"}>{message}</span>
    </p>
  );
}