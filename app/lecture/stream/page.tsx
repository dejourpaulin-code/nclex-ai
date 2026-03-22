"use client";

import Navbar from "../../../components/Navbar";

export default function LectureStreamPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 shadow-2xl">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-semibold text-cyan-300">
            Streaming Live Mode v2
          </div>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Raw Audio Streaming Pipeline
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            This will be the true enterprise-level lecture companion with lower latency,
            continuous audio streaming, and stronger real-time classroom intelligence.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-bold">Step 1</h2>
              <p className="mt-2 text-slate-300">
                Open microphone stream and chunk raw audio continuously.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-bold">Step 2</h2>
              <p className="mt-2 text-slate-300">
                Send audio frames through websocket or WebRTC transport.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-bold">Step 3</h2>
              <p className="mt-2 text-slate-300">
                Return low-latency Lexi prompts and participation coaching.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-orange-400/20 bg-orange-500/10 p-6 text-orange-100">
            This page is the scaffold. The current shippable live product is{" "}
            <span className="font-bold">Live Full v1</span>.
          </div>
        </div>
      </section>
    </main>
  );
}