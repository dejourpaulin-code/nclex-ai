"use client";

import { useMemo, useState } from "react";

type WaitlistFormProps = {
  source?: string;
  dark?: boolean;
};

export default function WaitlistForm({
  source = "homepage",
  dark = false,
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const buttonText = useMemo(() => {
    if (loading) return "Joining...";
    return dark ? "Get Early Access" : "Join Early Access";
  }, [loading, dark]);

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          source,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setMessage("You’re in. You secured early access — watch your email.");
      setEmail("");
    } catch {
      setMessage("Failed to connect to the server.");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={joinWaitlist} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your school email"
            className={`w-full rounded-2xl border px-5 py-4 outline-none transition ${
              dark
                ? "border-white/20 bg-white/10 text-white placeholder:text-blue-100/70 focus:border-white/40"
                : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className={`rounded-2xl px-6 py-4 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            dark
              ? "bg-white text-blue-950 hover:bg-slate-100"
              : "bg-orange-500 text-white hover:bg-orange-600"
          }`}
        >
          {buttonText}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {!message && (
          <p className={`text-xs ${dark ? "text-blue-100/80" : "text-slate-500"}`}>
  Early access is limited per rollout — secure your spot now.
</p>
        )}

        {message && (
          <p
            className={`text-sm font-medium ${
              success
                ? dark
                  ? "text-emerald-200"
                  : "text-emerald-700"
                : dark
                ? "text-red-200"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}