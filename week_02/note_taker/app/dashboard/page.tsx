"use client";

import { useState, useEffect, useMemo } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteDialog } from "@/components/notes/NoteDialog";
import { FolderDialog } from "@/components/folders/FolderDialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, AlertCircle, Calendar, Sparkles, FolderPlus, Folder } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    notes: number;
  };
}

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

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [useAIMode, setUseAIMode] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState("");
  const [quickNoteFolderId, setQuickNoteFolderId] = useState<string | null>(null);
  const [isSubmittingQuickNote, setIsSubmittingQuickNote] = useState(false);
  const [suggestedNewFolder, setSuggestedNewFolder] = useState<string | null>(null);
  const [autoAssignedFolder, setAutoAssignedFolder] = useState<string | null>(null);
  const [isAnalyzingFolder, setIsAnalyzingFolder] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/notes", {
        cache: "no-store",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch notes");
      }

      const data = await response.json();
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/folders", {
        cache: "no-store",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch folders");
      }

      const data = await response.json();
      setFolders(data);
    } catch (err) {
      console.error("Error fetching folders:", err);
    }
  };

  const parseCommand = (text: string): { command: string | null; folderName: string | null; items: string } => {
    const trimmedText = text.trim();
    const lowerText = trimmedText.toLowerCase();
    
    // Check for "Add to [folder]" command - flexible format
    // Matches: "Add to groceries", "Add to groceries:", "Add to groceries: item1, item2", etc.
    const addToMatch = lowerText.match(/^add\s+to\s+([^\n:]+?)(?:\s*:|\s*$|\n)/i);
    if (addToMatch) {
      const folderName = addToMatch[1].trim();
      // Extract items after the command
      const commandEnd = trimmedText.toLowerCase().indexOf(addToMatch[0]) + addToMatch[0].length;
      const items = trimmedText.substring(commandEnd).trim();
      return { command: "add", folderName, items };
    }
    
    // Check for "Clear the [folder] list" command - flexible format
    // Matches: "Clear the groceries list", "Clear groceries list", "Clear groceries", etc.
    const clearMatch = lowerText.match(/^clear\s+(?:the\s+)?([^\n]+?)(?:\s+list)?\s*$/i);
    if (clearMatch) {
      const folderName = clearMatch[1].trim();
      return { command: "clear", folderName, items: "" };
    }
    
    return { command: null, folderName: null, items: text };
  };

  const handleQuickNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteContent.trim() || isSubmittingQuickNote || isAnalyzingFolder) return;

    try {
      setIsSubmittingQuickNote(true);
      setError(null);

      // First try AI command parsing for natural language commands
      try {
        const aiCommandResponse = await fetch("/api/notes/parse-command", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: quickNoteContent }),
        });

        if (aiCommandResponse.ok) {
          const aiCommand = await aiCommandResponse.json();
          
          // Handle AI-parsed delete command for folders
          if (aiCommand.command === "delete" && aiCommand.targetType === "folder" && aiCommand.targetName) {
            const matchedFolder = folders.find(
              f => f.name.toLowerCase() === aiCommand.targetName.toLowerCase()
            );

            if (!matchedFolder) {
              setError(`Folder "${aiCommand.targetName}" not found.`);
              setIsSubmittingQuickNote(false);
              return;
            }

            // Get all notes in the folder
            const folderNotes = notes.filter(n => n.folderId === matchedFolder.id);
            
            if (folderNotes.length === 0) {
              setError(`No notes found in "${matchedFolder.name}" folder.`);
              setIsSubmittingQuickNote(false);
              return;
            }

            // Delete all notes in the folder
            const deletePromises = folderNotes.map(note =>
              fetch(`/api/notes/${note.id}`, { method: "DELETE" })
            );

            await Promise.all(deletePromises);

            setQuickNoteContent("");
            setQuickNoteFolderId(null);
            setSuccessMessage(`Deleted ${folderNotes.length} note(s) from "${matchedFolder.name}" folder`);
            setTimeout(() => setSuccessMessage(null), 3000);
            await fetchNotes();
            setIsSubmittingQuickNote(false);
            return;
          }

          // Handle AI-parsed delete command for specific note
          if (aiCommand.command === "delete" && aiCommand.targetType === "note" && aiCommand.targetName) {
            // Find note by title (fuzzy match)
            const matchedNote = notes.find(n =>
              n.title.toLowerCase().includes(aiCommand.targetName.toLowerCase()) ||
              aiCommand.targetName.toLowerCase().includes(n.title.toLowerCase())
            );

            if (!matchedNote) {
              setError(`Note "${aiCommand.targetName}" not found.`);
              setIsSubmittingQuickNote(false);
              return;
            }

            const response = await fetch(`/api/notes/${matchedNote.id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || "Failed to delete note");
            }

            setQuickNoteContent("");
            setQuickNoteFolderId(null);
            setSuccessMessage(`Deleted note "${matchedNote.title}"`);
            setTimeout(() => setSuccessMessage(null), 3000);
            await fetchNotes();
            setIsSubmittingQuickNote(false);
            return;
          }

          // Handle AI-parsed add command for specific note
          if (aiCommand.command === "add" && aiCommand.targetType === "note" && aiCommand.targetName) {
            // Extract items from the original text if not provided by AI
            let itemsToAdd = aiCommand.items;
            if (!itemsToAdd) {
              // Try to extract items after the note name
              const noteNameIndex = quickNoteContent.toLowerCase().indexOf(aiCommand.targetName.toLowerCase());
              if (noteNameIndex !== -1) {
                const afterNoteName = quickNoteContent.substring(noteNameIndex + aiCommand.targetName.length).trim();
                // Extract items after colon or on new lines
                const colonIndex = afterNoteName.indexOf(":");
                itemsToAdd = colonIndex !== -1 
                  ? afterNoteName.substring(colonIndex + 1).trim()
                  : afterNoteName;
              }
            }

            // Find note by title (fuzzy match)
            const matchedNote = notes.find(n =>
              n.title.toLowerCase().includes(aiCommand.targetName.toLowerCase()) ||
              aiCommand.targetName.toLowerCase().includes(n.title.toLowerCase())
            );

            if (!matchedNote) {
              setError(`Note "${aiCommand.targetName}" not found.`);
              setIsSubmittingQuickNote(false);
              return;
            }

            if (!itemsToAdd || itemsToAdd.trim() === "") {
              setError("No items provided to add.");
              setIsSubmittingQuickNote(false);
              return;
            }

            // Parse items
            const itemsList = itemsToAdd
              .split(/[,\n]/)
              .map(item => item.trim())
              .filter(Boolean)
              .filter(item => item.length > 0);

            if (itemsList.length === 0) {
              setError("No items provided to add.");
              setIsSubmittingQuickNote(false);
              return;
            }

            const currentContent = matchedNote.content || "";
            const newContent = currentContent
              ? `${currentContent}\n${itemsList.join("\n")}`
              : itemsList.join("\n");

            const response = await fetch(`/api/notes/${matchedNote.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title: matchedNote.title,
                content: newContent,
                folderId: matchedNote.folderId,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || "Failed to update note");
            }

            setQuickNoteContent("");
            setQuickNoteFolderId(null);
            setSuccessMessage(`Added items to "${matchedNote.title}"`);
            setTimeout(() => setSuccessMessage(null), 3000);
            await fetchNotes();
            setIsSubmittingQuickNote(false);
            return;
          }
        }
      } catch (aiError) {
        console.error("Error parsing AI command:", aiError);
        // Continue with regular command parsing if AI fails
      }

      // Fall back to regular command parsing
      const { command, folderName, items } = parseCommand(quickNoteContent);

      // Handle "Add to [folder]" command
      if (command === "add" && folderName && items) {
        // Find the folder
        const matchedFolder = folders.find(
          f => f.name.toLowerCase() === folderName.toLowerCase()
        );

        if (!matchedFolder) {
          setError(`Folder "${folderName}" not found. Available folders: ${folders.map(f => f.name).join(", ")}`);
          setIsSubmittingQuickNote(false);
          return;
        }

        // Find the note in that folder (get the most recent one or create if none exists)
        const folderNotes = notes.filter(n => n.folderId === matchedFolder.id);
        let targetNote = folderNotes.length > 0 ? folderNotes[0] : null;

        if (targetNote) {
          // Append items to existing note
          const currentContent = targetNote.content || "";
          // Parse items - handle commas, newlines, and spaces
          const itemsList = items
            .split(/[,\n]/)
            .map(item => item.trim())
            .filter(Boolean)
            .filter(item => item.length > 0);
          
          if (itemsList.length === 0) {
            setError("No items provided to add.");
            setIsSubmittingQuickNote(false);
            return;
          }
          
          const newContent = currentContent 
            ? `${currentContent}\n${itemsList.join("\n")}`
            : itemsList.join("\n");

          const response = await fetch(`/api/notes/${targetNote.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: targetNote.title,
              content: newContent,
              folderId: targetNote.folderId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update note");
          }
        } else {
          // Create new note in the folder
          const today = new Date().toISOString().split("T")[0];
          // Parse items - handle commas, newlines, and spaces
          const itemsList = items
            .split(/[,\n]/)
            .map(item => item.trim())
            .filter(Boolean)
            .filter(item => item.length > 0);
          
          if (itemsList.length === 0) {
            setError("No items provided to add.");
            setIsSubmittingQuickNote(false);
            return;
          }
          
          const response = await fetch("/api/notes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: `${matchedFolder.name} List`,
              content: itemsList.join("\n"),
              date: today,
              folderId: matchedFolder.id,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to create note");
          }
        }

        // Clear the form and show success message
        setQuickNoteContent("");
        setQuickNoteFolderId(null);
        setSuccessMessage(`Items added to "${matchedFolder.name}" folder`);
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchNotes();
        setIsSubmittingQuickNote(false);
        return;
      }

      // Handle "Clear the [folder] list" command
      if (command === "clear" && folderName) {
        // Find the folder
        const matchedFolder = folders.find(
          f => f.name.toLowerCase() === folderName.toLowerCase()
        );

        if (!matchedFolder) {
          setError(`Folder "${folderName}" not found. Available folders: ${folders.map(f => f.name).join(", ")}`);
          setIsSubmittingQuickNote(false);
          return;
        }

        // Find the note in that folder
        const folderNotes = notes.filter(n => n.folderId === matchedFolder.id);
        const targetNote = folderNotes.length > 0 ? folderNotes[0] : null;

        if (!targetNote) {
          setError(`No note found in "${folderName}" folder to clear.`);
          setIsSubmittingQuickNote(false);
          return;
        }

        // Clear the note content
        const response = await fetch(`/api/notes/${targetNote.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: targetNote.title,
            content: "",
            folderId: targetNote.folderId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to clear note");
        }

        // Clear the form and show success message
        setQuickNoteContent("");
        setQuickNoteFolderId(null);
        setSuccessMessage(`"${matchedFolder.name}" list cleared`);
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchNotes();
        setIsSubmittingQuickNote(false);
        return;
      }

      // Regular note creation (no command detected)
      setIsAnalyzingFolder(true);
      setSuggestedNewFolder(null);

      // Generate title from content (first line or first 50 chars)
      const contentLines = quickNoteContent.trim().split("\n");
      const autoTitle = contentLines[0] || "Untitled Note";
      const title = autoTitle.length > 50 ? autoTitle.substring(0, 50) + "..." : autoTitle;

      // If no folder is selected, use AI to suggest one
      let finalFolderId = quickNoteFolderId;
      
      if (!finalFolderId && folders.length > 0) {
        try {
          const availableFolderNames = folders.map(f => f.name);
          const response = await fetch("/api/notes/suggest-folder", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: title,
              content: quickNoteContent.trim(),
              availableFolders: availableFolderNames,
            }),
          });

          if (response.ok) {
            const { suggestedFolder } = await response.json();
            
            if (suggestedFolder) {
              // Check if it matches an existing folder
              const matchedFolder = folders.find(
                f => f.name.toLowerCase() === suggestedFolder.toLowerCase()
              );
              
              if (matchedFolder) {
                // Auto-assign to existing folder
                finalFolderId = matchedFolder.id;
                setQuickNoteFolderId(matchedFolder.id);
                setAutoAssignedFolder(matchedFolder.name);
                // Clear the message after 3 seconds
                setTimeout(() => setAutoAssignedFolder(null), 3000);
              } else {
                // Suggest creating a new folder
                setSuggestedNewFolder(suggestedFolder);
                setIsAnalyzingFolder(false);
                return; // Wait for user to confirm folder creation
              }
            }
          }
        } catch (error) {
          console.error("Error suggesting folder:", error);
          // Continue without folder suggestion if it fails
        }
      }

      setIsAnalyzingFolder(false);
      setIsSubmittingQuickNote(true);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          content: quickNoteContent.trim() || null,
          date: today,
          folderId: finalFolderId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create note");
      }

      // Clear the form
      setQuickNoteContent("");
      setQuickNoteFolderId(null);
      setSuggestedNewFolder(null);
      setAutoAssignedFolder(null);
      
      // Refresh notes and folders
      await fetchNotes();
      await fetchFolders();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsSubmittingQuickNote(false);
      setIsAnalyzingFolder(false);
    }
  };

  const handleCreateSuggestedFolder = async () => {
    if (!suggestedNewFolder || !quickNoteContent.trim()) return;

    try {
      setIsSavingFolder(true);
      setError(null);

      // Create the folder
      const folderResponse = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: suggestedNewFolder }),
      });

      if (!folderResponse.ok) {
        const errorData = await folderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create folder");
      }

      const newFolder = await folderResponse.json();
      
      // Refresh folders list
      await fetchFolders();
      
      // Now create the note with the new folder
      setIsSavingFolder(false);
      setIsSubmittingQuickNote(true);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Generate title from content (first line or first 50 chars)
      const contentLines = quickNoteContent.trim().split("\n");
      const autoTitle = contentLines[0] || "Untitled Note";
      const title = autoTitle.length > 50 ? autoTitle.substring(0, 50) + "..." : autoTitle;

      const noteResponse = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          content: quickNoteContent.trim() || null,
          date: today,
          folderId: newFolder.id,
        }),
      });

      if (!noteResponse.ok) {
        const errorData = await noteResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create note");
      }

      // Clear the form
      setQuickNoteContent("");
      setQuickNoteFolderId(null);
      setSuggestedNewFolder(null);
      
      // Refresh notes
      await fetchNotes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsSavingFolder(false);
      setIsSubmittingQuickNote(false);
    }
  };

  const handleSkipFolderSuggestion = async () => {
    setSuggestedNewFolder(null);
    setIsAnalyzingFolder(false);
    
    // Continue with note submission without folder
    if (!quickNoteContent.trim() || isSubmittingQuickNote) return;

    try {
      setIsSubmittingQuickNote(true);
      setError(null);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Generate title from content (first line or first 50 chars)
      const contentLines = quickNoteContent.trim().split("\n");
      const autoTitle = contentLines[0] || "Untitled Note";
      const title = autoTitle.length > 50 ? autoTitle.substring(0, 50) + "..." : autoTitle;

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          content: quickNoteContent.trim() || null,
          date: today,
          folderId: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create note");
      }

      // Clear the form
      setQuickNoteContent("");
      setQuickNoteFolderId(null);
      setAutoAssignedFolder(null);
      
      // Refresh notes
      await fetchNotes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsSubmittingQuickNote(false);
    }
  };

  const handleCreateWithAI = () => {
    setEditingNote(null);
    setUseAIMode(true);
    setDialogOpen(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  const handleSave = async (noteData: { title: string; content: string; folderId?: string | null; date?: string | null }) => {
    try {
      setIsSaving(true);
      setError(null);

      const url = editingNote
        ? `/api/notes/${editingNote.id}`
        : "/api/notes";
      const method = editingNote ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          (editingNote ? "Failed to update note" : "Failed to create note")
        );
      }

      await fetchNotes();
      setDialogOpen(false);
      setEditingNote(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderDialogOpen(true);
  };

  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async (folderData: { name: string }) => {
    try {
      setIsSavingFolder(true);
      setError(null);

      const url = editingFolder
        ? `/api/folders/${editingFolder.id}`
        : "/api/folders";
      const method = editingFolder ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(folderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          (editingFolder ? "Failed to update folder" : "Failed to create folder")
        );
      }

      await fetchFolders();
      setFolderDialogOpen(false);
      setEditingFolder(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this folder? Notes in this folder will not be deleted, but will be moved to 'No folder'.")) {
      return;
    }

    try {
      setDeletingFolderId(id);
      setError(null);

      const response = await fetch(`/api/folders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete folder");
      }

      await fetchFolders();
      await fetchNotes(); // Refresh notes to update folder references
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingFolderId(null);
    }
  };

  // Organize notes by folders, then by category, and separate appointments
  const { appointments, notesByFolder, notesWithoutFolder } = useMemo(() => {
    const appointmentsList: Note[] = [];
    const byFolder: Record<string, Note[]> = {};
    const withoutFolder: Note[] = [];

    notes.forEach((note) => {
      if (note.isAppointment) {
        appointmentsList.push(note);
      } else if (note.folderId && note.folder) {
        const folderId = note.folderId;
        if (!byFolder[folderId]) {
          byFolder[folderId] = [];
        }
        byFolder[folderId].push(note);
      } else {
        withoutFolder.push(note);
      }
    });

    // Sort appointments by date
    appointmentsList.sort((a, b) => {
      const dateA = a.appointmentDate ? (typeof a.appointmentDate === "string" ? new Date(a.appointmentDate) : a.appointmentDate) : new Date(0);
      const dateB = b.appointmentDate ? (typeof b.appointmentDate === "string" ? new Date(b.appointmentDate) : b.appointmentDate) : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

    return {
      appointments: appointmentsList,
      notesByFolder: byFolder,
      notesWithoutFolder: withoutFolder,
    };
  }, [notes]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);

      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete note");
      }

      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg mb-4">Please sign in to view your notes.</p>
            <Button onClick={() => window.location.href = "/sign-in"}>
              Sign In
            </Button>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="min-h-screen bg-[#F0F2F5]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-semibold text-[#050505] mb-1">
                    Notes
                  </h1>
                  <p className="text-[#65676B] text-sm mt-1">
                    {notes.length} {notes.length === 1 ? "note" : "notes"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateFolder} 
                    variant="outline"
                    className="bg-white hover:bg-[#F0F2F5] text-[#050505] border-[#E4E6EB] font-medium"
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                  <Button 
                    onClick={handleCreateWithAI} 
                    className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                </div>
              </div>

              {/* Quick Note Input */}
              <form onSubmit={handleQuickNoteSubmit} className="bg-gradient-to-br from-[#FFF4E6] to-[#FFE5CC] rounded-lg p-6 shadow-sm border border-[#FFD89C] mb-8">
                {successMessage && (
                  <div className="mb-3 p-3 bg-[#E7F3FF] border border-[#B3D9FF] rounded-lg">
                    <p className="text-sm text-[#1877F2]">
                      {successMessage}
                    </p>
                  </div>
                )}
                {autoAssignedFolder && (
                  <div className="mb-3 p-3 bg-[#E7F3FF] border border-[#B3D9FF] rounded-lg">
                    <p className="text-sm text-[#1877F2]">
                      Auto-assigned to <strong>"{autoAssignedFolder}"</strong> folder
                    </p>
                  </div>
                )}
                {suggestedNewFolder && (
                  <div className="mb-3 p-3 bg-[#E7F3FF] border border-[#B3D9FF] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#050505] mb-1">
                          AI Suggestion
                        </p>
                        <p className="text-sm text-[#65676B]">
                          This note might belong in a new folder: <strong className="text-[#050505]">"{suggestedNewFolder}"</strong>
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          type="button"
                          onClick={handleCreateSuggestedFolder}
                          disabled={isSavingFolder}
                          size="sm"
                          className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
                        >
                          {isSavingFolder ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create & Use"
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSkipFolderSuggestion}
                          disabled={isSavingFolder}
                          size="sm"
                          variant="outline"
                          className="bg-white hover:bg-[#F0F2F5] border-[#E4E6EB]"
                        >
                          Skip
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    {folders.length > 0 && (
                      <select
                        value={quickNoteFolderId || ""}
                        onChange={(e) => setQuickNoteFolderId(e.target.value || null)}
                        className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] bg-[#F0F2F5] text-[#050505]"
                        disabled={isSubmittingQuickNote || isAnalyzingFolder}
                      >
                        <option value="">Select folder (optional)</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <textarea
                      value={quickNoteContent}
                      onChange={(e) => setQuickNoteContent(e.target.value)}
                      placeholder={`Write your note here...\n\nCommands:\n- "Add to groceries: pineapple, bread"\n- "Add to weekly grocery notes: milk, eggs"\n- "Clear the groceries list"\n- "Delete existing grocery notes"\n- "Delete weekly grocery notes"`}
                      rows={5}
                      className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] resize-none bg-[#F0F2F5] text-[#050505] placeholder:text-[#65676B]"
                      required
                      disabled={isSubmittingQuickNote || isAnalyzingFolder}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!quickNoteContent.trim() || isSubmittingQuickNote || isAnalyzingFolder}
                    className="mt-0 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium px-6"
                  >
                    {isAnalyzingFolder ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : isSubmittingQuickNote ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Folders Section */}
            {folders.length > 0 && (
              <div className="mb-8 bg-gradient-to-br from-[#E7F3FF] to-[#D0E7FF] rounded-lg p-6">
                <h2 className="text-xl font-semibold text-[#050505] mb-4">
                  Folders
                </h2>
                <div className="flex flex-wrap gap-2">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-[#E4E6EB] hover:shadow-md transition-all"
                    >
                      <Folder className="h-4 w-4 text-[#1877F2]" />
                      <span className="font-medium text-[#050505]">{folder.name}</span>
                      <span className="text-sm text-[#65676B]">
                        ({folder._count?.notes || 0})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditFolder(folder)}
                        className="h-6 w-6 p-0 hover:bg-[#E4E6EB]"
                        title="Edit folder"
                      >
                        <svg className="h-3 w-3 text-[#65676B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFolder(folder.id)}
                        disabled={deletingFolderId === folder.id}
                        className="h-6 w-6 p-0 text-[#E41E3F] hover:bg-[#FFE5E9]"
                        title="Delete folder"
                      >
                        {deletingFolderId === folder.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-[#FFF4E6] border border-[#FFD89C] rounded-lg flex items-center gap-2 text-[#E41E3F]">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#65676B]" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-[#E4E6EB]">
                <p className="text-[#65676B] text-base mb-4">
                  No notes yet. Create your first note!
                </p>
                <Button 
                  onClick={handleCreate}
                  className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Appointments Section */}
                {appointments.length > 0 && (
                  <div className="bg-gradient-to-br from-[#FFF4E6] to-[#FFE5CC] rounded-lg p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-xl font-semibold text-[#050505]">
                        Appointments
                      </h2>
                      <span className="text-sm text-[#65676B]">({appointments.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {appointments.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isDeleting={deletingId === note.id}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes by Folder */}
                {Object.entries(notesByFolder).map(([folderId, folderNotes], index) => {
                  const folder = folders.find(f => f.id === folderId);
                  const backgroundColors = [
                    "bg-gradient-to-br from-[#E7F3FF] to-[#D0E7FF]",
                    "bg-gradient-to-br from-[#F0E7FF] to-[#E0D0FF]",
                    "bg-gradient-to-br from-[#E7FFF0] to-[#D0FFE0]",
                    "bg-gradient-to-br from-[#FFF0E7] to-[#FFE0D0]",
                    "bg-gradient-to-br from-[#FFE7F0] to-[#FFD0E0]",
                  ];
                  const bgColor = backgroundColors[index % backgroundColors.length];
                  
                  return (
                    <div key={folderId} className={`${bgColor} rounded-lg p-6 mb-8`}>
                      <h2 className="text-xl font-semibold mb-4 text-[#050505]">
                        {folder?.name || "Unknown Folder"}
                        <span className="text-sm text-[#65676B] font-normal ml-2">({folderNotes.length})</span>
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {folderNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isDeleting={deletingId === note.id}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Notes without Folder */}
                {notesWithoutFolder.length > 0 && (
                  <div className="bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-[#050505]">
                      No Folder
                      <span className="text-sm text-[#65676B] font-normal ml-2">({notesWithoutFolder.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {notesWithoutFolder.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          isDeleting={deletingId === note.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <NoteDialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setUseAIMode(false);
                }
              }}
              onSave={handleSave}
              note={editingNote}
              isSaving={isSaving}
              defaultAIMode={useAIMode}
              folders={folders}
            />

            <FolderDialog
              open={folderDialogOpen}
              onOpenChange={setFolderDialogOpen}
              onSave={handleSaveFolder}
              folder={editingFolder}
              isSaving={isSavingFolder}
            />
          </div>
        </div>
      </SignedIn>
    </>
  );
}

