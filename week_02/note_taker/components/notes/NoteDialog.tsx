"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface Folder {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  folderId: string | null;
  date: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: { title: string; content: string; folderId?: string | null; date?: string | null }) => Promise<void>;
  note?: Note | null;
  isSaving?: boolean;
  defaultAIMode?: boolean;
  folders?: Folder[];
}

export function NoteDialog({
  open,
  onOpenChange,
  onSave,
  note,
  isSaving,
  defaultAIMode = false,
  folders = [],
}: NoteDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [useAI, setUseAI] = useState(defaultAIMode);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (note) {
        setTitle(note.title);
        setContent(note.content || "");
        setFolderId(note.folderId || null);
        // Format date for input field (YYYY-MM-DD)
        if (note.date) {
          const dateObj = typeof note.date === "string" ? new Date(note.date) : note.date;
          setDate(dateObj.toISOString().split("T")[0]);
        } else {
          setDate("");
        }
        setUseAI(false);
        setAiPrompt("");
      } else {
        setTitle("");
        setContent("");
        setFolderId(null);
        // Set default date to today
        const today = new Date();
        setDate(today.toISOString().split("T")[0]);
        setUseAI(defaultAIMode);
        setAiPrompt("");
      }
      setAiError(null);
    }
  }, [note, open, defaultAIMode]);

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim() || isGenerating) return;

    try {
      setIsGenerating(true);
      setAiError(null);

      const response = await fetch("/api/notes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate note");
      }

      const generated = await response.json();
      setTitle(generated.title);
      setContent(generated.content);
      
      // If AI suggested a folder, try to match it to an existing folder
      if (generated.suggestedFolder && folders.length > 0) {
        const matchedFolder = folders.find(
          f => f.name.toLowerCase() === generated.suggestedFolder.toLowerCase()
        );
        if (matchedFolder) {
          setFolderId(matchedFolder.id);
        }
      }
      
      setUseAI(false); // Switch to manual mode to show the generated content
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed to generate note");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    try {
      await onSave({ 
        title: title.trim(), 
        content: content.trim(),
        folderId: folderId || null,
        date: date || null,
      });
      // Don't reset here - let the parent handle closing
    } catch (error) {
      // Error is handled by parent component
      throw error;
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{note ? "Edit Note" : "Create New Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!note && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#F0F2F5] rounded-lg">
                <span className="text-sm font-medium text-[#050505] flex-1">Create mode:</span>
                <Button
                  type="button"
                  variant={useAI ? "default" : "outline"}
                  onClick={() => setUseAI(!useAI)}
                  className={`flex items-center gap-2 ${useAI ? "bg-[#1877F2] hover:bg-[#166FE5] text-white" : "bg-white hover:bg-[#F0F2F5] border-[#E4E6EB] text-[#050505]"}`}
                  disabled={isSaving || isGenerating}
                  size="sm"
                >
                  <Sparkles className="h-4 w-4" />
                  {useAI ? "AI Mode" : "Manual Mode"}
                </Button>
              </div>
            )}

            {useAI && !note ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ai-prompt" className="block text-sm font-medium mb-2">
                    What would you like to create? <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., 'Write a grocery list for this week' or 'Meeting with John on Friday at 2pm'"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] resize-none bg-[#F0F2F5] text-[#050505] placeholder:text-[#65676B]"
                    disabled={isGenerating || isSaving}
                    autoFocus
                  />
                </div>
                {aiError && (
                  <div className="p-3 bg-[#FFF4E6] border border-[#FFD89C] rounded-lg text-sm text-[#E41E3F]">
                    {aiError}
                  </div>
                )}
                <Button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={!aiPrompt.trim() || isGenerating || isSaving}
                  className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Note
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-2 text-[#050505]">
                    Title <span className="text-[#E41E3F]">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title..."
                    className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] bg-[#F0F2F5] text-[#050505] placeholder:text-[#65676B]"
                    required
                    disabled={isSaving}
                    autoFocus={!useAI}
                  />
                </div>
                {folders.length > 0 && (
                  <div>
                    <label htmlFor="folder" className="block text-sm font-medium mb-2 text-[#050505]">
                      Folder (optional)
                    </label>
                    <select
                      id="folder"
                      value={folderId || ""}
                      onChange={(e) => setFolderId(e.target.value || null)}
                      className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] bg-[#F0F2F5] text-[#050505]"
                      disabled={isSaving}
                    >
                      <option value="">No folder</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium mb-2 text-[#050505]">
                    Date <span className="text-[#E41E3F]">*</span>
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] bg-[#F0F2F5] text-[#050505]"
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label htmlFor="content" className="block text-sm font-medium mb-2 text-[#050505]">
                    Content
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter note content..."
                    rows={6}
                    className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] resize-none bg-[#F0F2F5] text-[#050505] placeholder:text-[#65676B]"
                    disabled={isSaving}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className="bg-white hover:bg-[#F0F2F5] border-[#E4E6EB] text-[#050505]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !title.trim()}
              className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
            >
              {isSaving ? "Saving..." : note ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

