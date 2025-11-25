import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  const note = await prisma.note.findUnique({
    where: { id },
  });

  if (!note) {
    return {
      title: "Note Not Found",
    };
  }

  return {
    title: note.title,
    description: note.content ? note.content.substring(0, 160) : "Shared note",
    openGraph: {
      title: note.title,
      description: note.content ? note.content.substring(0, 160) : "Shared note",
      type: "article",
    },
    twitter: {
      card: "summary",
      title: note.title,
      description: note.content ? note.content.substring(0, 160) : "Shared note",
    },
  };
}

export default async function ShareNotePage({ params }: PageProps) {
  const { id } = await params;

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      folder: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!note) {
    notFound();
  }

  const formatDate = (date: Date) => {
    try {
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateOnly = (date: Date) => {
    try {
      return format(date, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
        <div className="bg-white rounded-lg border border-[#E4E6EB] shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-2 text-[#050505]">{note.title}</h1>
            {note.folder && (
              <div className="flex items-center gap-2 text-sm mb-4">
                <span className="px-2 py-1 bg-[#E7F3FF] text-[#1877F2] rounded-md font-medium">
                  {note.folder.name}
                </span>
              </div>
            )}
          </div>

          {note.content && (
            <div className="mb-6">
              <div className="whitespace-pre-wrap text-[#050505] leading-relaxed">
                {note.content}
              </div>
            </div>
          )}

          <div className="border-t border-[#E4E6EB] pt-4 mt-6 space-y-2 text-sm text-[#65676B]">
            {note.date && (
              <div className="flex items-center gap-2">
                <strong className="text-[#050505] font-medium">Date:</strong>
                <span>{formatDateOnly(note.date)}</span>
              </div>
            )}
            {note.isAppointment && note.appointmentDate && (
              <div className="flex items-center gap-2">
                <strong className="text-[#050505] font-medium">Appointment:</strong>
                <span>{formatDate(note.appointmentDate)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <strong className="text-[#050505] font-medium">Created:</strong>
              <span>{formatDate(note.createdAt)}</span>
            </div>
            {note.updatedAt.getTime() !== note.createdAt.getTime() && (
              <div className="flex items-center gap-2">
                <strong className="text-[#050505] font-medium">Updated:</strong>
                <span>{formatDate(note.updatedAt)}</span>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-[#E4E6EB]">
            <p className="text-xs text-[#65676B] text-center">
              Shared from Note Taker
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

