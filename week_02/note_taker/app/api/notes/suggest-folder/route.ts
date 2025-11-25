import { auth } from "@clerk/nextjs/server";
import { suggestFolder } from "@/lib/openai";
import { NextResponse } from "next/server";

// POST /api/notes/suggest-folder - Suggest a folder for a note
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, availableFolders } = body;

    if (!title && !content) {
      return NextResponse.json(
        { error: "Title or content is required" },
        { status: 400 }
      );
    }

    const suggestedFolder = await suggestFolder(
      title || "",
      content || null,
      availableFolders || []
    );

    return NextResponse.json({ suggestedFolder }, { status: 200 });
  } catch (error) {
    console.error("Error suggesting folder:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to suggest folder" },
      { status: 500 }
    );
  }
}

