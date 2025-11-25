import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { categorizeNote, suggestFolder } from "@/lib/openai";
import { NextResponse } from "next/server";

// Helper function to ensure user exists in database
async function ensureUser(userId: string, email: string, name?: string | null) {
  try {
    // Try to find user by Clerk userId
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Create new user with Clerk userId
      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          name: name || null,
        },
      });
    } else if (name !== undefined && user.name !== name) {
      // Update name if provided and different
      user = await prisma.user.update({
        where: { id: userId },
        data: { name: name || null },
      });
    }

    return user;
  } catch (error) {
    // If user already exists (e.g., by email), just return it
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return existingUser;
    }
    throw error;
  }
}

// GET /api/notes - Get all notes for the authenticated user
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

    const notes = await prisma.note.findMany({
      where: {
        userId: userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
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
    const { title, content, category, isAppointment, appointmentDate, date, folderId } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Get user's folders for AI folder suggestion
    const userFolders = await prisma.folder.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Verify folder belongs to user if folderId is provided
    let finalFolderId = folderId || null;
    if (finalFolderId) {
      const folder = userFolders.find(f => f.id === finalFolderId);
      if (!folder) {
        return NextResponse.json(
          { error: "Folder not found" },
          { status: 404 }
        );
      }
    }

    // If no folder was explicitly provided, use AI to suggest one
    if (!finalFolderId) {
      try {
        const availableFolderNames = userFolders.map(f => f.name);
        const suggestedFolderName = await suggestFolder(title, content || null, availableFolderNames);
        
        if (suggestedFolderName) {
          // Try to find an exact match (case-insensitive)
          const matchedFolder = userFolders.find(
            f => f.name.toLowerCase() === suggestedFolderName.toLowerCase()
          );
          
          if (matchedFolder) {
            finalFolderId = matchedFolder.id;
          } else {
            // No exact match found - create the suggested folder
            try {
              const newFolder = await prisma.folder.create({
                data: {
                  name: suggestedFolderName,
                  userId: userId,
                },
              });
              finalFolderId = newFolder.id;
            } catch (createError) {
              // If folder creation fails (e.g., duplicate), try to find it again
              const existingFolder = await prisma.folder.findUnique({
                where: {
                  userId_name: {
                    userId: userId,
                    name: suggestedFolderName,
                  },
                },
              });
              if (existingFolder) {
                finalFolderId = existingFolder.id;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error suggesting folder:", error);
        // Continue without folder assignment if suggestion fails
      }
    }

    // If category/appointment info not provided, use AI to categorize
    let finalCategory = category;
    let finalIsAppointment = isAppointment ?? false;
    let finalAppointmentDate = appointmentDate ? new Date(appointmentDate) : null;

    if (!finalCategory || finalIsAppointment === undefined) {
      try {
        const categorization = await categorizeNote(title, content || null);
        finalCategory = finalCategory || categorization.category;
        finalIsAppointment = finalIsAppointment || categorization.isAppointment;
        finalAppointmentDate = finalAppointmentDate || categorization.appointmentDate;
      } catch (error) {
        console.error("Error categorizing note:", error);
        // Continue with defaults if categorization fails
        finalCategory = finalCategory || "general";
      }
    }

    const note = await prisma.note.create({
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        category: finalCategory || "general",
        isAppointment: finalIsAppointment,
        appointmentDate: finalAppointmentDate,
        date: date ? new Date(date) : null,
        folderId: finalFolderId,
        userId: userId,
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

