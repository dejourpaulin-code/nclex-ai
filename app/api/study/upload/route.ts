import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUDY_BUCKET = "study-uploads";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(req: Request) {
  try {
    const { userId, fileName, folder } = await req.json();

    if (!userId || !fileName || !folder) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const safeName = sanitizeFileName(fileName);
    const path = `${userId}/${folder}/${Date.now()}-${safeName}`;

    const { data, error } = await supabase.storage
      .from(STUDY_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Failed to create upload URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl, path });
  } catch (err) {
    console.error("UPLOAD URL ERROR:", err);
    return NextResponse.json({ error: "Failed to generate upload URL." }, { status: 500 });
  }
}
