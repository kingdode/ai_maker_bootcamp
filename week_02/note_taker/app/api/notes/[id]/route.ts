import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/notes/[id] - Get a single note
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const note = await prisma.note.findFirst({
      where: {
        id: id,
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

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}

// PUT /api/notes/[id] - Update a note
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, category, isAppointment, appointmentDate, date, folderId } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Verify the note belongs to the user
    const existingNote = await prisma.note.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Verify folder belongs to user if folderId is provided
    if (folderId !== undefined) {
      if (folderId !== null) {
        const folder = await prisma.folder.findFirst({
          where: {
            id: folderId,
            userId: userId,
          },
        });

        if (!folder) {
          return NextResponse.json(
            { error: "Folder not found" },
            { status: 404 }
          );
        }
      }
    }

    const note = await prisma.note.update({
      where: {
        id: id,
      },
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        category: category || existingNote.category || "general",
        isAppointment: isAppointment ?? existingNote.isAppointment ?? false,
        appointmentDate: appointmentDate
          ? new Date(appointmentDate)
          : existingNote.appointmentDate,
        date: date !== undefined 
          ? (date ? new Date(date) : null)
          : existingNote.date,
        folderId: folderId !== undefined ? folderId : existingNote.folderId,
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

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[id] - Delete a note
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the note belongs to the user
    const existingNote = await prisma.note.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await prisma.note.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}

