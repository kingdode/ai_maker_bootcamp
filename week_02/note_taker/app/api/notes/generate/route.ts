import { auth, currentUser } from "@clerk/nextjs/server";
import { generateNote } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/notes/generate - Generate a note using AI
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get user's folders for AI folder suggestion
    const userFolders = await prisma.folder.findMany({
      where: {
        userId: userId,
      },
      select: {
        name: true,
      },
    });

    const availableFolderNames = userFolders.map(f => f.name);
    const generatedNote = await generateNote(prompt.trim(), availableFolderNames);

    return NextResponse.json(generatedNote, { status: 200 });
  } catch (error) {
    console.error("Error generating note:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate note" },
      { status: 500 }
    );
  }
}

