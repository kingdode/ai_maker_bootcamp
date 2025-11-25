"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Folder {
  id: string;
  name: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (folder: { name: string }) => Promise<void>;
  folder?: Folder | null;
  isSaving?: boolean;
}

export function FolderDialog({
  open,
  onOpenChange,
  onSave,
  folder,
  isSaving,
}: FolderDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      if (folder) {
        setName(folder.name);
      } else {
        setName("");
      }
    }
  }, [folder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    try {
      await onSave({ name: name.trim() });
    } catch (error) {
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
            <DialogTitle>{folder ? "Edit Folder" : "Create New Folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="folder-name" className="block text-sm font-medium mb-2 text-[#050505]">
                Folder Name <span className="text-[#E41E3F]">*</span>
              </label>
              <input
                id="folder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Fitness, Work, Personal..."
                className="w-full px-4 py-3 border border-[#E4E6EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-[#1877F2] bg-[#F0F2F5] text-[#050505] placeholder:text-[#65676B]"
                required
                disabled={isSaving}
                autoFocus
              />
            </div>
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
              disabled={isSaving || !name.trim()}
              className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium"
            >
              {isSaving ? "Saving..." : folder ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

