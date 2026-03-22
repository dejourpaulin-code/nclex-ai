"use client";

import Navbar from "../../../../components/Navbar";
import AvatarDisplay from "../../../../components/AvatarDisplay";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type StudyGuide = {
  title: string;
  bigPicture: string;
  detailedSummary: string[];
  highYieldPoints: string[];
  mustMemorize: string[];
  nclexTraps: string[];
  reviewQuestions: string[];
  quickCramSheet: string[];
};

type StudyMessageRow = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type ConversationResponse = {
  conversation: {
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
  };
  messages: StudyMessageRow[];
  guide: StudyGuide | null;
  guideMeta: {
    id: string;
    source_file_name?: string | null;
    created_at?: string;
    updated_at?: string;
  } | null;
};

function SectionCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudyGuideDetailPage() {
  const params = useParams();
  const rawConversationId = params?.conversationId;
  const conversationId =
    typeof rawConversationId === "string"
      ? rawConversationId
      : Array.isArray(rawConversationId)
      ? rawConversationId[0]
      : "";

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingChat, setSavingChat] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [data, setData] = useState<ConversationResponse | null>(null);

  async function loadSession(targetConversationId: string, explicitUserId?: string | null) {
    const resolvedUserId = explicitUserId || userId;
    if (!resolvedUserId || !targetConversationId) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/study/history/${targetConversationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: resolvedUserId,
        }),
      });

      const payload = await res.json();

      if (!res.ok) {
        setError(payload.error || "Failed to load study guide.");
        setLoading(false);
        return;
      }

      setData(payload);
    } catch {
      setError("Failed to load study guide.");
    }

    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadSession(conversationId, user.id);
    }

    void init();
  }, [conversationId]);

  async function askFollowUp() {
    if (!question.trim() || !userId || !conversationId) return;

    setSavingChat(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("question", question);
      formData.append("userId", userId);
      formData.append("conversationId", conversationId);

      const res = await fetch("/api/study", {
        method: "POST",
        body: formData,
      });

      const payload = await res.json();

      if (!res.ok) {
        setError(payload.error || "Failed to save follow-up.");
        setSavingChat(false);
        return;
      }

      setQuestion("");
      await loadSession(conversationId, userId);
    } catch {
      setError("Failed to save follow-up.");
    }

    setSavingChat(false);
  }

  const guide = data?.guide || null;
  const messages = data?.messages || [];

  const lastAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((msg) => msg.role === "assistant") || null;
  }, [messages]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-5xl px-6 py-10">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Loading study guide...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-xl text-red-700">
            {error}
          </div>
        ) : !data ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            Study guide not found.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
                    Lexi Study Guide
                  </div>

                  <h1 className="text-4xl font-black tracking-tight text-slate-900">
                    {guide?.title || data.conversation.title}
                  </h1>

                  {data.guideMeta?.source_file_name && (
                    <p className="mt-3 text-sm text-slate-500">
                      Source file: {data.guideMeta.source_file_name}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="/study"
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Back to Study
                  </a>

                  <button
                    onClick={() => window.print()}
                    className="rounded-2xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                  >
                    Download as PDF
                  </button>
                </div>
              </div>
            </div>

            {guide?.bigPicture && (
              <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-lg">
                <h2 className="text-2xl font-bold text-slate-900">Big Picture</h2>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="leading-8 text-slate-700">{guide.bigPicture}</p>
                </div>
              </div>
            )}

            <SectionCard title="Detailed Summary" items={guide?.detailedSummary || []} />
            <SectionCard title="High-Yield Points" items={guide?.highYieldPoints || []} />
            <SectionCard title="Must Memorize" items={guide?.mustMemorize || []} />
            <SectionCard title="NCLEX Traps" items={guide?.nclexTraps || []} />
            <SectionCard title="Review Questions" items={guide?.reviewQuestions || []} />
            <SectionCard title="Quick Cram Sheet" items={guide?.quickCramSheet || []} />

            <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start gap-4">
                <AvatarDisplay lexi size={56} />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Continue with Lexi</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ask follow-up questions about this guide and keep the conversation going.
                  </p>
                </div>
              </div>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: Lexi, go deeper into the must-memorize points and explain why they matter clinically."
                className="min-h-[160px] w-full rounded-3xl border border-slate-300 bg-white p-5 text-slate-900 outline-none transition focus:border-blue-500"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => void askFollowUp()}
                  disabled={savingChat}
                  className="rounded-2xl bg-blue-900 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {savingChat ? "Sending..." : "Ask Lexi"}
                </button>
              </div>

              {lastAssistantMessage && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-2 text-sm font-semibold text-slate-900">Latest Lexi reply</p>
                  <p className="whitespace-pre-wrap leading-8 text-slate-700">
                    {lastAssistantMessage.content}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-slate-900">Conversation History</h2>
              <div className="mt-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-500">
                    No messages saved yet.
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`rounded-2xl border p-5 ${
                        msg.role === "assistant"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-blue-200 bg-blue-50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {msg.role === "assistant" ? "Lexi" : "You"}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                        {msg.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}