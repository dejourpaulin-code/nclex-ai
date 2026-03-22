"use client";

import Navbar from "../../components/Navbar";
import AvatarDisplay from "../../components/AvatarDisplay";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Profile = {
  education_level: string;
  semester_label: string;
  explanation_style: string;
  avatar_id: string;
  equipped_hat: string | null;
  equipped_badge: string | null;
  equipped_stethoscope: string | null;
  equipped_scrubs: string | null;
};

type Unlock = {
  item_key: string;
  item_type: string;
};

type ConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const STARTER_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi, I’m Lexi. I can help with nursing concepts, weak areas, quiz strategy, and how to use features across the whole website.",
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([STARTER_MESSAGE]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ConversationRow[]>([]);

  useEffect(() => {
    void loadProfileAndHistory();
  }, []);

  async function loadProfileAndHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const [profileRes, unlockRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_unlocks").select("*").eq("user_id", user.id),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
    }

    setUnlocks((unlockRes.data || []) as Unlock[]);

    await fetch("/api/avatar-progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id }),
    });

    await loadHistory(user.id);
  }

  async function loadHistory(explicitUserId?: string) {
    const resolvedUserId = explicitUserId || userId;
    if (!resolvedUserId) return;

    setHistoryLoading(true);

    try {
      const res = await fetch("/api/chat/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: resolvedUserId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setHistory(data.conversations || []);
      }
    } catch {
      //
    }

    setHistoryLoading(false);
  }

  async function openConversation(targetConversationId: string) {
    if (!userId) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/chat/history/${targetConversationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        return;
      }

      setConversationId(targetConversationId);

      const loadedMessages: Message[] = (data.messages || []).map(
        (msg: { role: "user" | "assistant"; content: string }) => ({
          role: msg.role,
          content: msg.content,
        })
      );

      setMessages(
        loadedMessages.length > 0 ? loadedMessages : [STARTER_MESSAGE]
      );
    } catch {
      //
    }

    setLoading(false);
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([STARTER_MESSAGE]);
    setInput("");
  }

  async function sendMessage(customMessage?: string) {
    const finalMessage = (customMessage ?? input).trim();
    if (!finalMessage || loading || !userId) return;

    const userMessage: Message = { role: "user", content: finalMessage };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: finalMessage,
          userId,
          conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages([
          ...updatedMessages,
          { role: "assistant", content: data.error || "Something went wrong." },
        ]);
        setLoading(false);
        return;
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: data.reply },
      ]);

      await loadHistory(userId);
    } catch {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "Failed to connect to the server." },
      ]);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
            Creator mode chat
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Lexi + Your Avatar
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-600">
            Lexi now keeps conversation context, can answer questions about the
            whole website, and saves study chats into history.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Tutor duo</h2>

              <div className="mt-5 space-y-5">
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <AvatarDisplay lexi size={80} />
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-blue-900 shadow">
                        RN
                      </span>
                    </div>

                    <div>
                      <p className="text-lg font-bold text-slate-900">Lexi</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Adaptive nurse tutor + website guide
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-3 py-1 text-blue-800">
                          smart tutor
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-orange-700">
                          feature-aware
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                          remembers thread
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                  <div className="flex items-start gap-4">
                    <AvatarDisplay
                      avatarId={profile?.avatar_id}
                      scrubs={profile?.equipped_scrubs}
                      hat={profile?.equipped_hat}
                      badge={profile?.equipped_badge}
                      stethoscope={profile?.equipped_stethoscope}
                      size={80}
                    />

                    <div>
                      <p className="text-lg font-bold text-slate-900">You</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {profile?.education_level || "Student"} •{" "}
                        {profile?.semester_label || "Not set"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-3 py-1 text-blue-800">
                          {profile?.explanation_style || "Simple first"}
                        </span>
                        {unlocks.slice(0, 3).map((item) => (
                          <span
                            key={item.item_key}
                            className="rounded-full bg-white px-3 py-1 text-orange-700"
                          >
                            {item.item_key}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href="/closet"
                  className="block rounded-2xl bg-orange-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-orange-600"
                >
                  Open Avatar Closet
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Saved Chats</h2>
                <button
                  onClick={startNewChat}
                  className="rounded-2xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  New Chat
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {historyLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Loading chat history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No saved Lexi chats yet.
                  </div>
                ) : (
                  history.map((item) => {
                    const active = item.id === conversationId;

                    return (
                      <button
                        key={item.id}
                        onClick={() => void openConversation(item.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(item.updated_at).toLocaleString()}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Quick prompts</h2>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() =>
                    void sendMessage(
                      "Teach me at my current level and focus on my weakest topic."
                    )
                  }
                  className="w-full rounded-2xl bg-blue-50 px-4 py-3 text-left text-sm text-slate-800 transition hover:bg-blue-100"
                >
                  Teach me at my level
                </button>

                <button
                  onClick={() =>
                    void sendMessage(
                      "Give me a 5-question mini quiz based on my weak areas."
                    )
                  }
                  className="w-full rounded-2xl bg-orange-50 px-4 py-3 text-left text-sm text-slate-800 transition hover:bg-orange-100"
                >
                  Weak-area mini quiz
                </button>

                <button
                  onClick={() =>
                    void sendMessage(
                      "What do I seem to be struggling with most lately?"
                    )
                  }
                  className="w-full rounded-2xl bg-emerald-50 px-4 py-3 text-left text-sm text-slate-800 transition hover:bg-emerald-100"
                >
                  What am I struggling with?
                </button>

                <button
                  onClick={() =>
                    void sendMessage(
                      "What features are on this website and what should I use first?"
                    )
                  }
                  className="w-full rounded-2xl bg-purple-50 px-4 py-3 text-left text-sm text-slate-800 transition hover:bg-purple-100"
                >
                  Explain the website features
                </button>
              </div>
            </div>
          </aside>

          <div className="rounded-3xl border border-blue-100 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-xl font-bold">Conversation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lexi responds using your level, style, remembered progress,
                website knowledge, and your current thread history.
              </p>
            </div>

            <div className="h-[560px] overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && <AvatarDisplay lexi size={48} />}

                    <div
                      className={`max-w-[78%] rounded-3xl px-5 py-4 shadow-md ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-blue-900 to-blue-700 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-900"
                      }`}
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
                        {msg.role === "user" ? "You" : "Lexi"}
                      </p>
                      <p className="whitespace-pre-wrap leading-7">
                        {msg.content}
                      </p>
                    </div>

                    {msg.role === "user" && (
                      <AvatarDisplay
                        avatarId={profile?.avatar_id}
                        scrubs={profile?.equipped_scrubs}
                        hat={profile?.equipped_hat}
                        badge={profile?.equipped_badge}
                        stethoscope={profile?.equipped_stethoscope}
                        size={48}
                      />
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-4">
                    <AvatarDisplay lexi size={48} />
                    <div className="max-w-[78%] rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Lexi
                      </p>
                      <p className="text-slate-700">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Talk to Lexi..."
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-4 text-slate-900 outline-none transition focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void sendMessage();
                    }
                  }}
                />

                <button
                  onClick={() => void sendMessage()}
                  disabled={loading || !input.trim()}
                  className="rounded-2xl bg-orange-500 px-6 py-4 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}