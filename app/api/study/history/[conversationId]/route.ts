import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await req.json();
    const { conversationId } = await context.params;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 }
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("lexi_conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .eq("source", "study")
      .maybeSingle();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const { data: messages, error: messagesError } = await supabase
      .from("lexi_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Study messages load error:", messagesError);
      return NextResponse.json(
        { error: "Failed to load messages." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error("Study conversation route error:", error);
    return NextResponse.json(
      { error: "Failed to load messages." },
      { status: 500 }
    );
  }
}