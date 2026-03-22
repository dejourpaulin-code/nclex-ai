"use client";

import Navbar from "../../../components/Navbar";
import { useEffect, useMemo, useState } from "react";

type WaitlistRow = {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
};

function formatDayLabel(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AdminWaitlistPage() {
  const [signups, setSignups] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWaitlist();
  }, []);

  async function loadWaitlist() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load waitlist signups.");
        setLoading(false);
        return;
      }

      setSignups(data.signups || []);
    } catch {
      setError("Failed to load waitlist signups.");
    }

    setLoading(false);
  }

  function exportCsv() {
    if (signups.length === 0) return;

    const headers = ["email", "source", "created_at"];
    const rows = signups.map((signup) => [
      signup.email,
      signup.source || "homepage",
      signup.created_at,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "waitlist-signups.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  const growthData = useMemo(() => {
    const grouped = new Map<string, number>();

    signups.forEach((signup) => {
      const day = formatDayLabel(signup.created_at);
      grouped.set(day, (grouped.get(day) || 0) + 1);
    });

    const entries = Array.from(grouped.entries()).map(([day, count]) => ({
      day,
      count,
    }));

    return entries.reverse().slice(-10);
  }, [signups]);

  const maxGrowth = Math.max(...growthData.map((item) => item.count), 1);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
              Internal admin view
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">
              Waitlist Signups
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              View emails collected from the NCLEXAI waitlist forms.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCsv}
              disabled={signups.length === 0}
              className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              Export CSV
            </button>

            <button
              onClick={loadWaitlist}
              disabled={loading}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white px-5 py-4 text-center shadow-lg">
            <div className="text-sm text-slate-500">Total Signups</div>
            <div className="mt-1 text-2xl font-bold">{signups.length}</div>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-white px-5 py-4 text-center shadow-lg">
            <div className="text-sm text-slate-500">Latest Source</div>
            <div className="mt-1 text-2xl font-bold">
              {signups[0]?.source || (signups.length ? "homepage" : "-")}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 text-center shadow-lg">
            <div className="text-sm text-slate-500">Status</div>
            <div className="mt-1 text-2xl font-bold">
              {error ? "Error" : loading ? "Loading" : "Live"}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-xl">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-xl">
            Loading waitlist...
          </div>
        ) : signups.length === 0 ? (
          <div className="rounded-3xl border border-blue-100 bg-white p-10 shadow-xl">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                📬
              </div>
              <h2 className="text-2xl font-bold">No signups yet</h2>
              <p className="mt-3 text-slate-600">
                Once people join the waitlist, they’ll show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Waitlist Growth</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Signups by day from the most recent entries.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {growthData.map((item) => (
                  <div
                    key={item.day}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{item.day}</span>
                      <span className="text-sm text-slate-500">{item.count}</span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-900 to-orange-500"
                        style={{ width: `${(item.count / maxGrowth) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-bold">Collected Emails</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Newest signups appear first.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-sm text-slate-500">
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Source</th>
                      <th className="px-6 py-4 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signups.map((signup, index) => (
                      <tr
                        key={signup.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}
                      >
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {signup.email}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {signup.source || "homepage"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(signup.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}