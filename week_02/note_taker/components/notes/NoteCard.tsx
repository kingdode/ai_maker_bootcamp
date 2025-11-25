"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Calendar, Folder, Share2, Check } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface Note {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  isAppointment: boolean;
  appointmentDate: Date | string | null;
  date: Date | string | null;
  folderId: string | null;
  folder?: {
    id: string;
    name: string;
  } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function NoteCard({ note, onEdit, onDelete, isDeleting }: NoteCardProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      // Create shareable link
      const shareUrl = `${window.location.origin}/share/${note.id}`;
      const shareText = `${note.title}\n\n${note.content || ""}`;
      
      // Try Web Share API first (works on mobile and some desktop browsers)
      if (navigator.share) {
        try {
          await navigator.share({
            title: note.title,
            text: shareText,
            url: shareUrl,
          });
          return;
        } catch (err) {
          // User cancelled or share failed, fall through to copy
          if ((err as Error).name !== "AbortError") {
            console.error("Share failed:", err);
          }
        }
      }
      
      // Fallback: Copy link to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to share:", error);
      // Try fallback copy
      try {
        const shareUrl = `${window.location.origin}/share/${note.id}`;
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } catch (copyError) {
        console.error("Failed to copy link:", copyError);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return format(dateObj, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateOnly = (date: Date | string) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return format(dateObj, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const isUpdated = () => {
    const createdAt = typeof note.createdAt === "string" ? new Date(note.createdAt) : note.createdAt;
    const updatedAt = typeof note.updatedAt === "string" ? new Date(note.updatedAt) : note.updatedAt;
    return updatedAt.getTime() - createdAt.getTime() > 1000; // More than 1 second difference
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "groceries":
        return "bg-[#E7F3FF] text-[#1877F2]";
      case "crypto":
        return "bg-[#E7F3FF] text-[#1877F2]";
      case "workouts":
        return "bg-[#E7F3FF] text-[#1877F2]";
      default:
        return "bg-[#F0F2F5] text-[#65676B]";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col bg-white border border-[#E4E6EB]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-[#050505] line-clamp-2 mb-2">
              {note.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {note.folder && (
                <span className="text-xs px-2 py-1 rounded-md bg-[#E7F3FF] text-[#1877F2] font-medium flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {note.folder.name}
                </span>
              )}
              {note.category && (
                <span className={`text-xs px-2 py-1 rounded-md ${getCategoryColor(note.category)} font-medium`}>
                  {note.category}
                </span>
              )}
              {note.isAppointment && (
                <span className="text-xs px-2 py-1 rounded-md bg-[#FFF4E6] text-[#E41E3F] font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Appointment
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              disabled={isSharing}
              className="h-8 w-8 hover:bg-[#F0F2F5] text-[#65676B]"
              title="Share note"
            >
              {linkCopied ? (
                <Check className="h-4 w-4 text-[#1877F2]" />
              ) : (
                <Share2 className={`h-4 w-4 ${isSharing ? "animate-pulse" : ""}`} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(note)}
              className="h-8 w-8 hover:bg-[#F0F2F5] text-[#65676B]"
              title="Edit note"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(note.id)}
              disabled={isDeleting}
              className="h-8 w-8 text-[#E41E3F] hover:bg-[#FFE5E9]"
              title="Delete note"
            >
              <Trash2 className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {note.content ? (
          <p className="text-sm text-[#050505] line-clamp-4 mb-4 flex-1 leading-relaxed">
            {note.content}
          </p>
        ) : (
          <p className="text-sm text-[#65676B] italic mb-4 flex-1">No content</p>
        )}
        <div className="text-xs text-[#65676B] space-y-1 mt-auto pt-3 border-t border-[#E4E6EB]">
          {note.date && (
            <div className="font-medium text-[#050505] mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Date: {formatDateOnly(note.date)}
            </div>
          )}
          {note.isAppointment && note.appointmentDate && (
            <div className="font-medium text-[#050505] mb-1">
              <Calendar className="h-3 w-3 inline mr-1" />
              Appointment: {formatDate(note.appointmentDate)}
            </div>
          )}
          <div>Created: {formatDate(note.createdAt)}</div>
          {isUpdated() && (
            <div>Updated: {formatDate(note.updatedAt)}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

