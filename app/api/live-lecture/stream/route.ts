import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      message:
        "Streaming v2 scaffold is ready. Next step is wiring a websocket or realtime audio pipeline.",
      received: {
        sessionId: body.sessionId || null,
        mode: body.mode || "raw-stream",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to initialize live stream scaffold." },
      { status: 500 }
    );
  }
}