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

      <section className="mx-auto max-w-7xl px-4 py-5">
        {/* Compact header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-800">
              Nursing tutor chat
            </div>
            <h1 className="text-2xl font-black tracking-tight">Lexi</h1>
          </div>
          <button
            onClick={startNewChat}
            className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            New Chat
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Tutor duo */}
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-slate-700">Tutor Duo</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="relative shrink-0">
                    <AvatarDisplay lexi size={44} />
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold text-blue-900 shadow">RN</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Lexi</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      <span className="rounded-full bg-white px-2 py-0.5 text-blue-800">smart tutor</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-orange-700">feature-aware</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3">
                  <AvatarDisplay
                    avatarId={profile?.avatar_id}
                    scrubs={profile?.equipped_scrubs}
                    hat={profile?.equipped_hat}
                    badge={profile?.equipped_badge}
                    stethoscope={profile?.equipped_stethoscope}
                    size={44}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">You</p>
                    <p className="text-xs text-slate-500">{profile?.education_level || "Student"} · {profile?.semester_label || "Not set"}</p>
                  </div>
                </div>
              </div>
              <a href="/closet" className="mt-3 block rounded-xl bg-orange-500 py-2 text-center text-sm font-semibold text-white transition hover:bg-orange-600">
                Avatar Closet
              </a>
            </div>

            {/* Quick prompts */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-bold text-slate-700">Quick Prompts</h2>
              <div className="space-y-1.5">
                {([
                  ["Teach me at my level", "Teach me at my current level and focus on my weakest topic.", "bg-blue-50 hover:bg-blue-100"],
                  ["Weak-area mini quiz", "Give me a 5-question mini quiz based on my weak areas.", "bg-orange-50 hover:bg-orange-100"],
                  ["What am I struggling with?", "What do I seem to be struggling with most lately?", "bg-emerald-50 hover:bg-emerald-100"],
                  ["Explain website features", "What features are on this website and what should I use first?", "bg-purple-50 hover:bg-purple-100"],
                ] as [string, string, string][]).map(([label, msg, cls]) => (
                  <button
                    key={label}
                    onClick={() => void sendMessage(msg)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-xs text-slate-800 transition ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved chats */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-bold text-slate-700">Saved Chats</h2>
              <div className="space-y-1.5">
                {historyLoading ? (
                  <p className="text-xs text-slate-500">Loading...</p>
                ) : history.length === 0 ? (
                  <p className="text-xs text-slate-500">No saved chats yet.</p>
                ) : (
                  history.map((item) => {
                    const active = item.id === conversationId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => void openConversation(item.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="truncate text-xs font-semibold text-slate-900">{item.title}</p>
                        <p className="text-[10px] text-slate-400">{new Date(item.updated_at).toLocaleString()}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          {/* Chat area */}
          <div className="flex flex-col rounded-2xl border border-blue-100 bg-white shadow-sm" style={{ height: "calc(100vh - 160px)", minHeight: "500px" }}>
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">Conversation</h2>
              <p className="text-xs text-slate-500">Lexi responds using your level, style, and thread history.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && <AvatarDisplay lexi size={36} />}
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-blue-900 to-blue-700 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-900"
                      }`}
                    >
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                        {msg.role === "user" ? "You" : "Lexi"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <AvatarDisplay
                        avatarId={profile?.avatar_id}
                        scrubs={profile?.equipped_scrubs}
                        hat={profile?.equipped_hat}
                        badge={profile?.equipped_badge}
                        stethoscope={profile?.equipped_stethoscope}
                        size={36}
                      />
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-3">
                    <AvatarDisplay lexi size={36} />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs text-slate-500">Lexi is thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 px-4 py-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Talk to Lexi..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                  onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
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