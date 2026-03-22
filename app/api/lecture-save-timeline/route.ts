import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

type ChunkInput = {
  chunk_index: number;
  started_at_seconds?: number | null;
  ended_at_seconds?: number | null;
  heading?: string | null;
  body?: string | null;
};

type EventInput = {
  event_type: string;
  label?: string | null;
  description?: string | null;
  confidence?: number | null;
  started_at_seconds?: number | null;
  ended_at_seconds?: number | null;
  transcript_chunk_index?: number | null;
};

type LectureSessionRow = {
  id: string;
  transcript: string | null;
  summary: string | null;
};

type InsertedChunkRow = {
  id: string;
  lecture_session_id: string;
  chunk_index: number;
  body: string | null;
  heading: string | null;
};

type ExistingChunkLookupRow = {
  id: string;
  chunk_index: number | null;
};

type ReloadedChunkRow = {
  chunk_index: number | null;
  body: string | null;
  heading: string | null;
};

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toWholeNumberOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function toChunkIndexOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
}

function toConfidenceOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeChunk(raw: unknown): ChunkInput | null {
  if (!raw || typeof raw !== "object") return null;

  const chunk = raw as Partial<ChunkInput>;
  const chunkIndex = toChunkIndexOrNull(chunk.chunk_index);

  if (chunkIndex === null) return null;

  return {
    chunk_index: chunkIndex,
    started_at_seconds: toWholeNumberOrNull(chunk.started_at_seconds),
    ended_at_seconds: toWholeNumberOrNull(chunk.ended_at_seconds),
    heading: toTrimmedString(chunk.heading),
    body: toTrimmedString(chunk.body),
  };
}

function normalizeEvent(raw: unknown): EventInput | null {
  if (!raw || typeof raw !== "object") return null;

  const event = raw as Partial<EventInput>;
  const eventType = toTrimmedString(event.event_type) || "lecture_signal";

  return {
    event_type: eventType,
    label: toTrimmedString(event.label),
    description: toTrimmedString(event.description),
    confidence: toConfidenceOrNull(event.confidence),
    started_at_seconds: toWholeNumberOrNull(event.started_at_seconds),
    ended_at_seconds: toWholeNumberOrNull(event.ended_at_seconds),
    transcript_chunk_index: toChunkIndexOrNull(event.transcript_chunk_index),
  };
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsedBody = (body ?? {}) as {
      sessionId?: unknown;
      chunks?: unknown;
      events?: unknown;
    };

    const sessionId = String(parsedBody.sessionId || "").trim();

    const chunks: ChunkInput[] = Array.isArray(parsedBody.chunks)
      ? parsedBody.chunks
          .map(normalizeChunk)
          .filter((item): item is ChunkInput => item !== null)
      : [];

    const events: EventInput[] = Array.isArray(parsedBody.events)
      ? parsedBody.events
          .map(normalizeEvent)
          .filter((item): item is EventInput => item !== null)
      : [];

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    if (chunks.length === 0 && events.length === 0) {
      return NextResponse.json(
        { error: "At least one valid chunk or event is required." },
        { status: 400 }
      );
    }

    const { data: sessionRow, error: sessionLookupError } = await supabase
      .from("lecture_sessions")
      .select("id, transcript, summary")
      .eq("id", sessionId)
      .maybeSingle<LectureSessionRow>();

    if (sessionLookupError || !sessionRow) {
      console.error("Session lookup error:", sessionLookupError);
      return NextResponse.json({ error: "Lecture session not found." }, { status: 404 });
    }

    let insertedChunks: InsertedChunkRow[] = [];

    if (chunks.length > 0) {
      const dedupedChunkMap = new Map<number, ChunkInput>();

      for (const chunk of chunks) {
        dedupedChunkMap.set(chunk.chunk_index, chunk);
      }

      const chunkRows = Array.from(dedupedChunkMap.values()).map((chunk) => ({
        lecture_session_id: sessionId,
        chunk_index: chunk.chunk_index,
        started_at_seconds: chunk.started_at_seconds ?? null,
        ended_at_seconds: chunk.ended_at_seconds ?? null,
        heading: chunk.heading ?? null,
        body: chunk.body ?? null,
      }));

      const { data, error } = await supabase
        .from("lecture_transcript_chunks")
        .upsert(chunkRows, {
          onConflict: "lecture_session_id,chunk_index",
        })
        .select("id, lecture_session_id, chunk_index, heading, body");

      if (error) {
        console.error("Chunk upsert error:", error);
        return NextResponse.json(
          { error: "Failed to save transcript chunks.", details: error.message },
          { status: 500 }
        );
      }

      insertedChunks = (data ?? []) as InsertedChunkRow[];
    }

    if (events.length > 0) {
      const chunkMap = new Map<number, string>();

      for (const chunk of insertedChunks) {
        if (typeof chunk.chunk_index === "number" && typeof chunk.id === "string") {
          chunkMap.set(chunk.chunk_index, chunk.id);
        }
      }

      const missingChunkIndexes = Array.from(
        new Set(
          events
            .map((event) => event.transcript_chunk_index)
            .filter(
              (value): value is number =>
                typeof value === "number" && Number.isFinite(value) && !chunkMap.has(value)
            )
        )
      );

      if (missingChunkIndexes.length > 0) {
        const { data: existingChunks, error: chunkLookupError } = await supabase
          .from("lecture_transcript_chunks")
          .select("id, chunk_index")
          .eq("lecture_session_id", sessionId)
          .in("chunk_index", missingChunkIndexes);

        if (chunkLookupError) {
          console.error("Chunk lookup error:", chunkLookupError);
          return NextResponse.json(
            { error: "Failed to map timeline events to transcript chunks." },
            { status: 500 }
          );
        }

        for (const chunk of ((existingChunks ?? []) as ExistingChunkLookupRow[])) {
          if (typeof chunk.chunk_index === "number" && typeof chunk.id === "string") {
            chunkMap.set(chunk.chunk_index, chunk.id);
          }
        }
      }

      const touchedChunkIndexes = Array.from(
        new Set(
          events
            .map((event) => event.transcript_chunk_index)
            .filter(
              (value): value is number => typeof value === "number" && Number.isFinite(value)
            )
        )
      );

      if (touchedChunkIndexes.length > 0) {
        const { error: deleteExistingEventsError } = await supabase
          .from("lecture_timeline_events")
          .delete()
          .eq("lecture_session_id", sessionId)
          .in("transcript_chunk_index", touchedChunkIndexes);

        if (deleteExistingEventsError) {
          console.error("Existing event cleanup error:", deleteExistingEventsError);
          return NextResponse.json(
            {
              error: "Failed to clear previous timeline events for updated chunks.",
              details: deleteExistingEventsError.message,
            },
            { status: 500 }
          );
        }
      }

      const eventRows = events.map((event) => {
        const transcriptChunkId =
          typeof event.transcript_chunk_index === "number"
            ? chunkMap.get(event.transcript_chunk_index) ?? null
            : null;

        return {
          lecture_session_id: sessionId,
          event_type: event.event_type || "lecture_signal",
          label: event.label ?? null,
          description: event.description ?? null,
          confidence: event.confidence ?? null,
          started_at_seconds: event.started_at_seconds ?? null,
          ended_at_seconds: event.ended_at_seconds ?? null,
          transcript_chunk_index: event.transcript_chunk_index ?? null,
          transcript_chunk_id: transcriptChunkId,
        };
      });

      if (eventRows.length > 0) {
        const { error: eventInsertError } = await supabase
          .from("lecture_timeline_events")
          .insert(eventRows);

        if (eventInsertError) {
          console.error("Event insert error:", eventInsertError);
          return NextResponse.json(
            { error: "Failed to save timeline events.", details: eventInsertError.message },
            { status: 500 }
          );
        }
      }
    }

    if (chunks.length > 0) {
      const { data: allChunks, error: allChunksError } = await supabase
        .from("lecture_transcript_chunks")
        .select("chunk_index, body, heading")
        .eq("lecture_session_id", sessionId)
        .order("chunk_index", { ascending: true });

      if (allChunksError) {
        console.error("Chunk reload error:", allChunksError);
        return NextResponse.json(
          { error: "Chunks saved, but failed to rebuild session transcript." },
          { status: 500 }
        );
      }

      const rebuiltTranscript = ((allChunks ?? []) as ReloadedChunkRow[])
        .map((chunk) => (typeof chunk.body === "string" ? chunk.body.trim() : ""))
        .filter((text): text is string => text.length > 0)
        .join("\n\n")
        .trim();

      const newestChunk = [...chunks].sort((a, b) => b.chunk_index - a.chunk_index)[0];

      const nextSummary =
        newestChunk?.heading ??
        newestChunk?.body?.slice(0, 240) ??
        sessionRow.summary ??
        null;

      const { error: sessionUpdateError } = await supabase
        .from("lecture_sessions")
        .update({
          transcript: rebuiltTranscript || sessionRow.transcript || null,
          summary: nextSummary,
        })
        .eq("id", sessionId);

      if (sessionUpdateError) {
        console.error("Session update error:", sessionUpdateError);
        return NextResponse.json(
          {
            error: "Chunks saved, but failed to update lecture session summary/transcript.",
            details: sessionUpdateError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      savedChunks: chunks.length,
      savedEvents: events.length,
    });
  } catch (error) {
    console.error("lecture-save-timeline error:", error);

    return NextResponse.json(
      { error: "Failed to save lecture timeline." },
      { status: 500 }
    );
  }
}