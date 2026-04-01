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

const STUDY_BUCKET = "study-uploads";

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

  function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
  }

  async function uploadToStudyBucket(uploadFile: File, folder: "pdfs" | "images") {
    if (!userId) {
      throw new Error("You must be logged in to upload files.");
    }

    const safeName = sanitizeFileName(uploadFile.name);
    const path = `${userId}/${folder}/${Date.now()}-${safeName}`;

    const { data, error } = await supabase.storage
      .from(STUDY_BUCKET)
      .upload(path, uploadFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: uploadFile.type || undefined,
      });

    if (error || !data?.path) {
      throw new Error(error?.message || "Upload failed.");
    }

    return data.path;
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

        formData.append("file", file, file.name);
        formData.append("fileName", file.name);
        formData.append("fileType", file.type || "application/pdf");
      }

      if (image) {
        if (image.size > 10 * 1024 * 1024) {
          setResponse("That image is too large right now. Please keep it under 10 MB.");
          setLoading(false);
          return;
        }

        formData.append("image", image, image.name);
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

      <section className="mx-auto max-w-[1500px] px-6 py-10 xl:px-10">
        <div className="mb-10 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-4 py-1 text-sm font-medium text-orange-700">
              Lexi-powered study workspace
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-5xl xl:text-6xl">
              Turn your class material into
              <span className="ml-3 inline-block rounded-2xl bg-gradient-to-r from-blue-900 to-orange-500 px-4 py-1 text-white">
                better study sessions
              </span>
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Upload lectures, notes, or screenshots and let Lexi turn them into
              clearer explanations, study guides, and NCLEX-style review help.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Lecture summaries
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                NCLEX-style questions
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Homework breakdowns
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                High-yield concepts
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">PDF Support</p>
              <p className="mt-2 text-2xl font-black">Yes</p>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Image Uploads</p>
              <p className="mt-2 text-2xl font-black">Yes</p>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-lg">
              <p className="text-sm text-slate-500">Lexi Status</p>
              <p className="mt-2 text-2xl font-black">{lexiMood.label}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-xl">
              <h2 className="text-2xl font-bold">What Lexi can do here</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This is your AI study workspace for turning class material into
                something actually useful.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="font-semibold text-slate-900">Lecture support</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Upload PDFs and ask Lexi for summaries, study guides, or NCLEX-style questions.
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <p className="font-semibold text-slate-900">Homework help</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Upload screenshots and let Lexi explain what the question is really testing.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="font-semibold text-slate-900">Custom study prompts</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Ask for flashcards, simpler explanations, key takeaways, or high-yield review.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Study with Lexi History</h2>
                <button
                  onClick={startNewStudyChat}
                  className="rounded-2xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  New Study Chat
                </button>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Reopen past study sessions and continue where you left off.
              </p>

              <div className="mt-4 space-y-3">
                {historyLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Loading study history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No saved study sessions yet.
                  </div>
                ) : (
                  history.map((item) => {
                    const active = item.id === conversationId;

                    return (
                      <button
                        key={item.id}
                        onClick={() => void openStudyConversation(item.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(item.updated_at).toLocaleString()}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start gap-4">
                <AvatarDisplay lexi size={56} />
                <div>
                  <h2 className="text-xl font-bold">Lexi is hosting this section</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ask like you would ask a private tutor.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Best results come from prompts like:
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>• “Summarize this in simpler terms.”</li>
                  <li>• “Make me NCLEX questions from this.”</li>
                  <li>• “What are the highest-yield points here?”</li>
                  <li>• “Break this down step-by-step.”</li>
                </ul>
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-100 bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">Quick launch prompts</h2>
              <p className="mt-2 text-sm text-slate-500">
                Tap one to instantly load it into the input box.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => applyPrompt(prompt)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-white hover:shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-2xl">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Upload your material</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Add a class PDF or a homework screenshot.
                  </p>
                </div>

                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  Workspace input
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Class material (PDF)
                    </label>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-800">
                      PDF
                    </span>
                  </div>

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      setFile(selected);
                      if (selected) {
                        setImage(null);
                      }
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900"
                  />

                  <div className="mt-4 rounded-2xl border border-white/80 bg-white p-4">
                    {file ? (
                      <>
                        <p className="text-sm font-semibold text-slate-900">Loaded file</p>
                        <p className="mt-1 text-sm text-slate-600">{file.name}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-900">Nothing uploaded yet</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Add a lecture PDF, note packet, or class handout.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Homework screenshot or image
                    </label>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-700">
                      Image
                    </span>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const selected = e.target.files?.[0] || null;
                      setImage(selected);
                      if (selected) {
                        setFile(null);
                      }
                    }}
                    className="w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900"
                  />

                  <div className="mt-4 rounded-2xl border border-white/80 bg-white p-4">
                    {image ? (
                      <>
                        <p className="text-sm font-semibold text-slate-900">Loaded image</p>
                        <p className="mt-1 text-sm text-slate-600">{image.name}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-900">Nothing uploaded yet</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Add a screenshot, worksheet, or assignment image.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-orange-100 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Ask Lexi</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    The more specific your prompt, the better the output.
                  </p>
                </div>

                <div className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                  Prompt builder
                </div>
              </div>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Example: Lexi, make me 5 NCLEX-style questions from this PDF, summarize the key points, or explain the concept in this screenshot."
                className="min-h-[200px] w-full rounded-3xl border border-slate-300 bg-white p-5 text-slate-900 outline-none transition focus:border-blue-500"
              />

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => void askLexi()}
                  disabled={loading}
                  className="rounded-2xl bg-orange-500 px-6 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? "Lexi is thinking..." : "Ask Lexi"}
                </button>

                <button
                  onClick={() => setQuestion("")}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Clear Prompt
                </button>

                <a
                  href="/chat"
                  className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-3.5 font-semibold text-blue-900 transition hover:bg-blue-100"
                >
                  Open Full Lexi Chat
                </a>
              </div>
            </div>

            <div className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className={loading ? "animate-pulse" : ""}>
                  <AvatarDisplay lexi size={72} />
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold">Lexi’s Response</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {lexiMood.emoji} {lexiMood.label}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">{lexiMood.description}</p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-emerald-50 p-5">
                {loading ? (
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="animate-pulse">
                        <AvatarDisplay lexi size={48} />
                      </div>
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">
                        🧠
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">Lexi</p>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-slate-700">Thinking</span>
                        <div className="flex items-end gap-1">
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-blue-700"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-blue-700"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-blue-700"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="h-4 w-5/6 animate-pulse rounded-full bg-emerald-200" />
                        <div className="h-4 w-full animate-pulse rounded-full bg-emerald-200" />
                        <div className="h-4 w-4/5 animate-pulse rounded-full bg-emerald-200" />
                        <div className="h-4 w-3/5 animate-pulse rounded-full bg-emerald-200" />
                      </div>
                    </div>
                  </div>
                ) : response ? (
                  <div className="flex items-start gap-4">
                    <AvatarDisplay lexi size={48} />
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">Lexi</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {conversationId ? "Saved study response" : "Study response"}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-white/80 bg-white p-5">
                        <p className="whitespace-pre-wrap leading-7 text-slate-800">
                          {response}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <AvatarDisplay lexi size={48} />
                    <div className="flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">Lexi</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          Waiting for material
                        </span>
                      </div>

                      <div className="rounded-2xl border border-white/80 bg-white p-5">
                        <p className="leading-7 text-slate-700">
                          Upload a PDF, add a screenshot, or ask Lexi a focused question to begin.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!!response && !loading && (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      setQuestion("Lexi, turn your last response into a cleaner study guide.")
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Turn into study guide
                  </button>

                  <button
                    onClick={() =>
                      setQuestion("Lexi, make 5 NCLEX-style questions from your last response.")
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Make quiz from this
                  </button>

                  <button
                    onClick={() =>
                      setQuestion("Lexi, simplify your last response even more.")
                    }
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
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