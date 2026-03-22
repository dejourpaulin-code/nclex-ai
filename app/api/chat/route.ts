import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StoredMessageRow = {
  role: "user" | "assistant";
  content: string;
};

const SITE_CONTEXT = `
You are Lexi, the built-in tutor and product guide for this nursing study platform.

Website/product knowledge:
- Quiz Generator creates NCLEX-style practice questions.
- Quiz modes:
  - Tutor Mode: answer, reveal, learn from rationale.
  - Exam Mode: simulate test-style pacing and answer flow.
- Weak Areas tracks weaker topics based on quiz performance.
- Dashboard shows progress and performance.
- Study tools help users review material and prepare for exams.
- Lecture tools support lecture workflows, uploads, and lecture-based learning.
- CAT is adaptive exam-style practice.
- Lexi explains nursing concepts, helps users study, answers feature questions, and recommends what tool to use on the website.
- Some features may require paid access depending on plan.

Your job:
- Answer nursing study questions clearly.
- Answer questions about the website and its features clearly.
- Use prior conversation context so follow-up questions make sense.
- Use the user profile, weak areas, and recent quiz history when relevant.
- Be supportive, accurate, practical, and concise.
- Do not invent fake website features.
`;

export async function POST(req: Request) {
  try {
    const { message, userId, conversationId } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Missing message." }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    let activeConversationId = conversationId as string | null;

    let profileText = "No saved user profile.";
    let weakAreasText = "No weak areas recorded yet.";
    let recentQuizText = "No recent quiz history.";
    let recentMemoryText = "No saved conversation memory.";

    const [profileRes, weakAreasRes, historyRes, memoryRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),

      supabase
        .from("user_weak_areas")
        .select("topic, misses, correct")
        .eq("user_id", userId)
        .order("misses", { ascending: false })
        .limit(5),

      supabase
        .from("quiz_history")
        .select("topic, difficulty, is_correct, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),

      supabase
        .from("user_conversation_memory")
        .select("summary, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (profileRes.data) {
      const profile = profileRes.data;
      profileText = `
Education level: ${profile.education_level || "Not set"}
Semester: ${profile.semester_label || "Not set"}
Explanation style: ${profile.explanation_style || "Not set"}
Avatar: ${profile.avatar_id || "Not set"}
Equipped hat: ${profile.equipped_hat || "None"}
Equipped badge: ${profile.equipped_badge || "None"}
Equipped stethoscope: ${profile.equipped_stethoscope || "None"}
Equipped scrubs: ${profile.equipped_scrubs || "None"}
      `.trim();
    }

    if (weakAreasRes.data && weakAreasRes.data.length > 0) {
      weakAreasText = weakAreasRes.data
        .map(
          (area) => `${area.topic}: ${area.misses} misses, ${area.correct} correct`
        )
        .join("\n");
    }

    if (historyRes.data && historyRes.data.length > 0) {
      recentQuizText = historyRes.data
        .map(
          (row) =>
            `${row.topic} | ${row.difficulty} | ${
              row.is_correct ? "correct" : "incorrect"
            } | ${row.created_at}`
        )
        .join("\n");
    }

    if (memoryRes.data && memoryRes.data.length > 0) {
      recentMemoryText = memoryRes.data.map((row) => `- ${row.summary}`).join("\n");
    }

    if (!activeConversationId) {
      const title = message.trim().slice(0, 60) || "New Lexi Chat";

      const { data: newConversation, error: conversationError } = await supabase
        .from("lexi_conversations")
        .insert({
          user_id: userId,
          title,
        })
        .select("id")
        .single();

      if (conversationError || !newConversation) {
        console.error("Conversation create error:", conversationError);
        return NextResponse.json(
          { error: "Failed to create conversation." },
          { status: 500 }
        );
      }

      activeConversationId = newConversation.id;
    } else {
      const { data: existingConversation, error: conversationLookupError } =
        await supabase
          .from("lexi_conversations")
          .select("id")
          .eq("id", activeConversationId)
          .eq("user_id", userId)
          .maybeSingle();

      if (conversationLookupError || !existingConversation) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 }
        );
      }
    }

    const { data: existingMessages, error: existingMessagesError } = await supabase
      .from("lexi_messages")
      .select("role, content")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true });

    if (existingMessagesError) {
      console.error("Message history load error:", existingMessagesError);
      return NextResponse.json(
        { error: "Failed to load conversation history." },
        { status: 500 }
      );
    }

    const historyMessages =
      ((existingMessages || []) as StoredMessageRow[]).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) || [];

    const { error: saveUserMessageError } = await supabase
      .from("lexi_messages")
      .insert({
        conversation_id: activeConversationId,
        role: "user",
        content: message.trim(),
      });

    if (saveUserMessageError) {
      console.error("Save user message error:", saveUserMessageError);
      return NextResponse.json(
        { error: "Failed to save user message." },
        { status: 500 }
      );
    }

    const systemPrompt = `
${SITE_CONTEXT}

You are also an adaptive AI nurse tutor.

Tutor behavior:
- Teach nursing students clearly and accurately.
- Adapt to the student's education level, semester, and explanation style.
- Use their weak areas and recent performance to personalize your tutoring.
- If the student asks about something they struggle with, connect the answer to their weak areas.
- If the student seems confused, slow down and explain step-by-step.
- If the user asks homework-style questions, teach instead of just giving the answer.
- Keep explanations practical, supportive, and direct.
- Be encouraging, smart, and concise.
- Do not claim you cannot track progress if progress data is available below.
- If progress data exists, reference it naturally.

Student profile:
${profileText}

Weak areas:
${weakAreasText}

Recent quiz history:
${recentQuizText}

Recent conversation memory:
${recentMemoryText}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...historyMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user",
          content: message.trim(),
        },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "I’m sorry, something went wrong while generating a reply.";

    const { error: saveAssistantMessageError } = await supabase
      .from("lexi_messages")
      .insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: reply,
      });

    if (saveAssistantMessageError) {
      console.error("Save assistant message error:", saveAssistantMessageError);
      return NextResponse.json(
        { error: "Failed to save assistant response." },
        { status: 500 }
      );
    }

    await supabase
      .from("lexi_conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId);

    const memorySummary = `User asked: ${message}\nLexi replied: ${reply.slice(0, 500)}`;

    await supabase.from("user_conversation_memory").insert({
      user_id: userId,
      summary: memorySummary,
    });

    return NextResponse.json({
      reply,
      conversationId: activeConversationId,
    });
  } catch (error) {
    console.error("CHAT ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    );
  }
}