import { auth } from "@clerk/nextjs/server";
import { parseAICommand } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/notes/parse-command - Parse natural language commands using AI
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Get user's folders
    const userFolders = await prisma.folder.findMany({
      where: { userId },
      select: { name: true },
    });

    // Get user's notes with folder info
    const userNotes = await prisma.note.findMany({
      where: { userId },
      include: {
        folder: {
          select: {
            name: true,
          },
        },
      },
    });

    const availableFolders = userFolders.map(f => f.name);
    const availableNotes = userNotes.map(n => ({
      id: n.id,
      title: n.title,
      folderId: n.folderId,
      folderName: n.folder?.name || null,
    }));

    const parsed = await parseAICommand(text, availableFolders, availableNotes);

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("Error parsing command:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse command" },
      { status: 500 }
    );
  }
}

