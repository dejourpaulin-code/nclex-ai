"use client";

import Navbar from "../../components/Navbar";
import AvatarDisplay from "../../components/AvatarDisplay";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const QUICK_PROMPTS = [
  "Lexi, summarize this lecture in simpler terms.",
  "Lexi, make me 5 NCLEX-style questions from this PDF.",
  "Lexi, explain the concept in this screenshot.",
  "Lexi, pull out the most testable points from this material.",
  "Lexi, turn this into a focused study guide.",
  "Lexi, tell me what I absolutely need to memorize here.",
];

type AccessResponse = {
  loggedIn: boolean;
  accessLevel: string;
  plan: string | null;
  status: string;
  features: {
    quiz: boolean;
    lexi: boolean;
    history: boolean;
    study: boolean;
    dashboard: boolean;
    dashboardAdvanced?: boolean;
    weakAreas: boolean;
    weakAreasAdvanced?: boolean;
    lecture: boolean;
    liveFull: boolean;
    catExam: boolean;
  };
};

type StudyConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type StudyMessageRow = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export default function StudyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const [accessLoading, setAccessLoading] = useState(true);
  const [access, setAccess] = useState<AccessResponse | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<StudyConversationRow[]>([]);

  useEffect(() => {
    async function loadAccess() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.id) {
          setUserId(user.id);
        }

        const res = await fetch("/api/access/me", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.id || null,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAccess(null);
          setAccessLoading(false);
          return;
        }

        setAccess(data);

        if (user?.id) {
          await loadStudyHistory(user.id);
        }
      } catch {
        setAccess(null);
      }

      setAccessLoading(false);
    }

    void loadAccess();
  }, []);

  async function loadStudyHistory(explicitUserId?: string) {
    const resolvedUserId = explicitUserId || userId;
    if (!resolvedUserId) return;

    setHistoryLoading(true);

    try {
      const res = await fetch("/api/study/history", {
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

  async function openStudyConversation(targetConversationId: string) {
    if (!userId) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/study/history/${targetConversationId}`, {
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
        setResponse(data.error || "Failed to reopen this study session.");
        setLoading(false);
        return;
      }

      setConversationId(targetConversationId);
      setFile(null);
      setImage(null);

      const loadedMessages: StudyMessageRow[] = data.messages || [];

      const lastUserMessage = [...loadedMessages]
        .reverse()
        .find((msg) => msg.role === "user");

      const lastAssistantMessage = [...loadedMessages]
        .reverse()
        .find((msg) => msg.role === "assistant");

      setQuestion(lastUserMessage?.content || "");
      setResponse(lastAssistantMessage?.content || "");
    } catch {
      setResponse("Failed to reopen this study session.");
    }

    setLoading(false);
  }

  function startNewStudyChat() {
    setConversationId(null);
    setQuestion("");
    setResponse("");
    setFile(null);
    setImage(null);
  }

  async function uploadToStudyBucket(uploadFile: File, folder: "pdfs" | "images") {
    if (!userId) {
      throw new Error("You must be logged in to upload files.");
    }

    // Get a signed upload URL from the server (uses service role key, bypasses RLS)
    const signRes = await fetch("/api/study/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, fileName: uploadFile.name, folder }),
    });

    if (!signRes.ok) {
      const err = await signRes.json();
      throw new Error(err.error || "Failed to get upload URL.");
    }

    const { signedUrl, path } = await signRes.json();

    // Upload directly to Supabase storage (file never goes through Vercel)
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
      body: uploadFile,
    });

    if (!uploadRes.ok) {
      throw new Error("Upload to storage failed.");
    }

    return path as string;
  }

  const lexiMood = useMemo(() => {
    if (loading) {
      return {
        emoji: "🧠",
        label: "Thinking",
        description: "Lexi is analyzing your material.",
      };
    }

    if (!response) {
      return {
        emoji: "🩺",
        label: "Ready",
        description: "Lexi is ready to help.",
      };
    }

    const lower = response.toLowerCase();

    if (
      lower.includes("correct") ||
      lower.includes("great job") ||
      lower.includes("well done") ||
      lower.includes("nice work")
    ) {
      return {
        emoji: "🎉",
        label: "Encouraging",
        description: "Lexi is hyping you up.",
      };
    }

    if (
      lower.includes("priority") ||
      lower.includes("important") ||
      lower.includes("warning") ||
      lower.includes("risk") ||
      lower.includes("monitor")
    ) {
      return {
        emoji: "⚠️",
        label: "Alert",
        description: "Lexi is emphasizing something high-yield.",
      };
    }

    if (
      lower.includes("step") ||
      lower.includes("first") ||
      lower.includes("next") ||
      lower.includes("because")
    ) {
      return {
        emoji: "📘",
        label: "Explaining",
        description: "Lexi is breaking it down step-by-step.",
      };
    }

    return {
      emoji: "🩺",
      label: "Teaching",
      description: "Lexi is helping you study.",
    };
  }, [loading, response]);

  async function askLexi() {
    if (!file && !image && !question.trim()) {
      setResponse("Please upload a file or image, or ask Lexi a question.");
      return;
    }

    if (file && image) {
      setResponse("Please upload either one PDF or one image, not both at the same time.");
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const formData = new FormData();

      if (userId) {
        formData.append("userId", userId);
      }

      if (conversationId) {
        formData.append("conversationId", conversationId);
      }

      formData.append("question", question);

      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          setResponse("That PDF is too large right now. Please keep it under 10 MB.");
          setLoading(false);
          return;
        }

        const uploadedPdfPath = await uploadToStudyBucket(file, "pdfs");
        formData.append("filePath", uploadedPdfPath);
        formData.append("fileName", file.name);
        formData.append("fileType", file.type || "application/pdf");
      }

      if (image) {
        if (image.size > 10 * 1024 * 1024) {
          setResponse("That image is too large right now. Please keep it under 10 MB.");
          setLoading(false);
          return;
        }

        const uploadedImagePath = await uploadToStudyBucket(image, "images");
        formData.append("imagePath", uploadedImagePath);
        formData.append("imageName", image.name);
        formData.append("imageType", image.type || "image/png");
      }

      const res = await fetch("/api/study", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setResponse(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setResponse(data.reply || "Lexi did not return a response.");

      if (userId) {
        await loadStudyHistory(userId);
      }
    } catch (error: any) {
      setResponse(error?.message || "Failed to connect to the server.");
    }

    setLoading(false);
  }

  function applyPrompt(prompt: string) {
    setQuestion(prompt);
  }

  if (accessLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />
        <section className="mx-auto max-w-[1100px] px-6 py-20">
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
              🔐
            </div>
            <h1 className="text-3xl font-black text-slate-900">Checking your access...</h1>
            <p className="mt-4 text-lg text-slate-600">
              Loading your membership permissions now.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const canUseStudy = !!access?.features?.study;

  if (!canUseStudy) {
    const loggedIn = !!access?.loggedIn;

    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
        <Navbar />

        <section className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="rounded-[36px] border border-orange-200 bg-white p-8 shadow-2xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700">
                  Study Assistant locked
                </div>

                <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                  This feature is available on
                  <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                    Starter and above
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  Uploading class material, turning lectures into study guides, and using
                  the Lexi study workspace is part of the paid study system.
                </p>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    What unlocks with Starter+
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      "Upload lecture PDFs",
                      "Upload screenshots and assignment images",
                      "Turn material into study guides",
                      "Generate NCLEX-style review from uploads",
                      "Use the Lexi study workspace",
                      "Build smarter review faster",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  {!loggedIn ? (
                    <a
                      href="/login"
                      className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
                    >
                      Log In to Continue
                    </a>
                  ) : (
                    <a
                      href="/checkout?plan=starter-monthly&source=study-gate"
                      className="rounded-2xl bg-orange-500 px-8 py-4 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
                    >
                      Upgrade to Starter
                    </a>
                  )}

                  <a
                    href="/quiz"
                    className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-center text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Go Back to Quiz
                  </a>
                </div>

                <p className="mt-5 text-sm text-slate-500">
                  {loggedIn
                    ? `Your current access level: ${access?.accessLevel || "guest"}`
                    : "You are currently browsing as a guest."}
                </p>
              </div>

              <div className="rounded-[32px] border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-4">
                  <AvatarDisplay lexi size={64} />
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Lexi Study Workspace</p>
                    <h2 className="text-2xl font-bold text-slate-900">Preview</h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">PDF upload</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Turn lectures and handouts into focused study help.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Image analysis</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Break down worksheets, screenshots, and assignment prompts.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Custom study prompts</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Ask for summaries, quizzes, key points, memory hooks, and more.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-semibold text-orange-700">Best upgrade path</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Starter unlocks Study Assistant, History, Dashboard, Weak Areas, and Lecture.
                      Core and one-time plans unlock everything, including Live Full and CAT Exam.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

    return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-6 xl:px-8">

        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Study with Lexi</h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload class material and ask Lexi to turn it into focused study help.
            </p>
          </div>
          <button
            onClick={startNewStudyChat}
            className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 shrink-0"
          >
            New Session
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">

          {/* Sidebar */}
          <aside className="space-y-4">

            {/* History */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Past Sessions</h2>
              <p className="mt-1 text-xs text-slate-400">Tap to reopen a previous study session.</p>
              <div className="mt-3 space-y-2">
                {historyLoading ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
                    Loading...
                  </p>
                ) : history.length === 0 ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
                    No sessions yet.
                  </p>
                ) : (
                  history.map((item) => {
                    const active = item.id === conversationId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => void openStudyConversation(item.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                          active
                            ? "border-blue-300 bg-blue-50 font-semibold text-blue-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="mt-0.5 text-slate-400">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick prompts */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Quick Prompts</h2>
              <p className="mt-1 text-xs text-slate-400">Tap to load into the question box below.</p>
              <div className="mt-3 space-y-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => applyPrompt(prompt)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-white hover:shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Lexi tip */}
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AvatarDisplay lexi size={32} />
                <p className="text-sm font-bold text-slate-900">Lexi tip</p>
              </div>
              <p className="text-xs leading-5 text-slate-600">
                The more specific your prompt, the better the output. Try asking for NCLEX questions, summaries, or step-by-step breakdowns.
              </p>
            </div>

          </aside>

          {/* Main workspace */}
          <div className="space-y-4">

            {/* Upload row */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* PDF upload */}
              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">
                    Class material
                  </label>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    PDF
                  </span>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFile(selected);
                    if (selected) setImage(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700"
                />
                {file && (
                  <p className="mt-2 truncate text-xs text-slate-500">{file.name}</p>
                )}
              </div>

              {/* Image upload */}
              <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">
                    Screenshot or image
                  </label>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                    Image
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setImage(selected);
                    if (selected) setFile(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700"
                />
                {image && (
                  <p className="mt-2 truncate text-xs text-slate-500">{image.name}</p>
                )}
              </div>
            </div>

            {/* Ask Lexi */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                Your question or prompt
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: Lexi, summarize this lecture, make me NCLEX questions, or explain this concept..."
                className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void askLexi()}
                  disabled={loading}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? "Lexi is thinking..." : "Ask Lexi"}
                </button>
                <button
                  onClick={() => setQuestion("")}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>
                <a
                  href="/chat"
                  className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-100"
                >
                  Open Full Chat
                </a>
              </div>
            </div>

            {/* Lexi response */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className={loading ? "animate-pulse" : ""}>
                  <AvatarDisplay lexi size={36} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Lexi&apos;s Response
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {lexiMood.emoji} {lexiMood.label}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">{lexiMood.description}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                {loading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>Thinking</span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "300ms" }} />
                    </div>
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
                  </div>
                ) : response ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{response}</p>
                ) : (
                  <p className="text-sm leading-7 text-slate-400">
                    Upload a PDF or image, or type a question above — then hit Ask Lexi.
                  </p>
                )}
              </div>

              {!!response && !loading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setQuestion("Lexi, turn your last response into a cleaner study guide.")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Turn into study guide
                  </button>
                  <button
                    onClick={() => setQuestion("Lexi, make 5 NCLEX-style questions from your last response.")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Make quiz from this
                  </button>
                  <button
                    onClick={() => setQuestion("Lexi, simplify your last response even more.")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Simplify further
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}    return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-orange-50 text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-6 xl:px-8">

        {/* Hero banner */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <AvatarDisplay lexi size={56} />
              <div>
                <div className="mb-1 inline-flex items-center rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white">
                  Lexi-powered study workspace
                </div>
                <h1 className="text-2xl font-black tracking-tight">Study with Lexi</h1>
                <p className="mt-0.5 text-sm text-blue-200">
                  Upload lectures, notes, or screenshots — Lexi turns them into study guides, NCLEX questions, and clear explanations.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
              <button
                onClick={startNewStudyChat}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50"
              >
                New Session
              </button>
              <a
                href="/chat"
                className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Open Full Chat
              </a>
            </div>
          </div>

          {/* Feature pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {["Lecture summaries", "NCLEX-style questions", "Homework breakdowns", "High-yield concepts", "Study guides"].map((tag) => (
              <span key={tag} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">

          {/* Sidebar */}
          <aside className="space-y-4">

            {/* What Lexi can do */}
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">What Lexi can do here</h2>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-blue-900">Lecture support</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">Upload PDFs — get summaries, study guides, or NCLEX questions.</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-orange-800">Homework help</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">Upload screenshots and let Lexi break down what is being tested.</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-emerald-800">Custom prompts</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">Ask for flashcards, simpler explanations, or key takeaways.</p>
                </div>
              </div>
            </div>

            {/* Past sessions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Past Sessions</h2>
              <p className="mt-1 text-xs text-slate-400">Tap to reopen a previous study session.</p>
              <div className="mt-3 space-y-2">
                {historyLoading ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
                    Loading...
                  </p>
                ) : history.length === 0 ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400">
                    No sessions yet.
                  </p>
                ) : (
                  history.map((item) => {
                    const active = item.id === conversationId;
                    return (
                      <button
                        key={item.id}
                        onClick={() => void openStudyConversation(item.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                          active
                            ? "border-blue-300 bg-blue-50 font-semibold text-blue-900"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="mt-0.5 text-slate-400">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick prompts */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Quick Prompts</h2>
              <p className="mt-1 text-xs text-slate-400">Tap any to load it into your question box.</p>
              <div className="mt-3 space-y-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => applyPrompt(prompt)}
                    className="w-full rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-emerald-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

          </aside>

          {/* Main workspace */}
          <div className="space-y-4">

            {/* Upload row */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* PDF upload */}
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800">Class material</label>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">PDF</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setFile(selected);
                    if (selected) setImage(null);
                  }}
                  className="w-full rounded-xl border border-blue-200 bg-white p-2 text-sm text-slate-700"
                />
                <div className="mt-3 rounded-xl border border-blue-100 bg-white px-3 py-2">
                  {file ? (
                    <p className="truncate text-xs font-medium text-blue-800">{file.name}</p>
                  ) : (
                    <p className="text-xs text-slate-400">No PDF selected — add a lecture, note packet, or handout.</p>
                  )}
                </div>
              </div>

              {/* Image upload */}
              <div className="rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50 to-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800">Screenshot or image</label>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">Image</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null;
                    setImage(selected);
                    if (selected) setFile(null);
                  }}
                  className="w-full rounded-xl border border-orange-200 bg-white p-2 text-sm text-slate-700"
                />
                <div className="mt-3 rounded-xl border border-orange-100 bg-white px-3 py-2">
                  {image ? (
                    <p className="truncate text-xs font-medium text-orange-800">{image.name}</p>
                  ) : (
                    <p className="text-xs text-slate-400">No image selected — add a screenshot, worksheet, or assignment.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Ask Lexi */}
            <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800">Ask Lexi</label>
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">Prompt builder</span>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: Lexi, make me 5 NCLEX-style questions from this PDF, summarize the key points, or explain this concept..."
                className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => void askLexi()}
                  disabled={loading}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? "Lexi is thinking..." : "Ask Lexi"}
                </button>
                <button
                  onClick={() => setQuestion("")}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Lexi response */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <div className={loading ? "animate-pulse" : ""}>
                  <AvatarDisplay lexi size={40} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Lexi&apos;s Response
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {lexiMood.emoji} {lexiMood.label}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">{lexiMood.description}</p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                {loading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>Thinking</span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: "300ms" }} />
                    </div>
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-emerald-200" />
                    <div className="h-3 w-full animate-pulse rounded-full bg-emerald-200" />
                    <div className="h-3 w-4/5 animate-pulse rounded-full bg-emerald-200" />
                  </div>
                ) : response ? (
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{response}</p>
                ) : (
                  <p className="text-sm leading-6 text-slate-500">
                    Upload a PDF or image, or type a question above — then hit <span className="font-semibold text-orange-600">Ask Lexi</span>.
                  </p>
                )}
              </div>

              {!!response && !loading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setQuestion("Lexi, turn your last response into a cleaner study guide.")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Turn into study guide
                  </button>
                  <button
                    onClick={() => setQuestion("Lexi, make 5 NCLEX-style questions from your last response.")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Make quiz from this
                  </button>
                  <button
                    onClick={() => setQuestion("Lexi, simplify your last response even more.")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Simplify further
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
