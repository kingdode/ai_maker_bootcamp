import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper function to ensure user exists in database
async function ensureUser(userId: string, email: string, name?: string | null) {
  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          name: name || null,
        },
      });
    } else if (name !== undefined && user.name !== name) {
      user = await prisma.user.update({
        where: { id: userId },
        data: { name: name || null },
      });
    }

    return user;
  } catch (error) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return existingUser;
    }
    throw error;
  }
}

// GET /api/folders - Get all folders for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (user) {
      await ensureUser(userId, user.emailAddresses[0]?.emailAddress || "", user.firstName || user.username || null);
    }

    const folders = await prisma.folder.findMany({
      where: {
        userId: userId,
      },
      include: {
        _count: {
          select: { notes: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (user) {
      await ensureUser(userId, user.emailAddresses[0]?.emailAddress || "", user.firstName || user.username || null);
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Check if folder with same name already exists for this user
    const existingFolder = await prisma.folder.findUnique({
      where: {
        userId_name: {
          userId: userId,
          name: name.trim(),
        },
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: "A folder with this name already exists" },
        { status: 409 }
      );
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        userId: userId,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A folder with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}

