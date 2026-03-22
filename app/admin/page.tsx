"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch("/api/admin/events")
      .then(res => res.json())
      .then(data => setEvents(data.events || []));
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Revenue Dashboard</h1>

      <div className="mt-6">
        {events.map((e: any) => (
          <div key={e.id} className="border p-3 rounded mb-2">
            ${e.value} • {e.label} • {e.source}
          </div>
        ))}
      </div>
    </div>
  );
}