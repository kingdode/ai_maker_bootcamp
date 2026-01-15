import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import {
  getUploadedFileById,
  confirmFile,
  deleteFile,
} from "@/lib/db";
import { prisma } from "@/lib/db";

// =============================================================================
// GET /api/review/[fileId]
// Returns detailed info for a single file under review
// =============================================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    // Get file from database
    const file = await getUploadedFileById(fileId);
    
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: file.id,
        originalFilename: file.originalFilename,
        storagePath: file.storagePath,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        aiStatus: file.aiStatus,
        aiCategory: file.aiCategory,
        aiConfidence: file.aiConfidence,
        extractedDate: file.extractedDate,
        extractedProvider: file.extractedProvider,
        extractedBodyRegion: file.extractedBodyRegion,
        summary: file.summary,
        suggestedTitle: file.suggestedTitle,
        keywords: file.keywords ? JSON.parse(file.keywords) : null,
        batchId: file.batchId,
        groupId: file.groupId,
        uploadedAt: file.uploadedAt.toISOString(),
        analyzedAt: file.analyzedAt?.toISOString() || null,
        dicomMetadata: file.dicomMetadata,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/review/[fileId]
// Confirm or reject a file
// =============================================================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const body = await request.json();
    const { action, category, extractedDate, provider, bodyRegion } = body;

    // Validate action
    if (!["confirm", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'confirm' or 'reject'" },
        { status: 400 }
      );
    }

    // Get file from database
    const file = await getUploadedFileById(fileId);
    
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    if (action === "confirm") {
      // Update file status to confirmed with any user edits
      const updatedFile = await confirmFile(fileId, {
        category: category || file.aiCategory,
        extractedDate: extractedDate || file.extractedDate,
        provider: provider || file.extractedProvider,
        bodyRegion: bodyRegion || file.extractedBodyRegion,
      });

      // Move file to confirmed folder
      const confirmedDir = path.join(process.cwd(), "uploads", "confirmed");
      if (!fs.existsSync(confirmedDir)) {
        fs.mkdirSync(confirmedDir, { recursive: true });
      }

      const newPath = path.join(confirmedDir, path.basename(file.storagePath));
      if (fs.existsSync(file.storagePath)) {
        fs.renameSync(file.storagePath, newPath);
        
        // Update storage path in database
        await prisma.uploadedFile.update({
          where: { id: fileId },
          data: { storagePath: newPath },
        });
      }

      return NextResponse.json(
        {
          message: "File confirmed successfully",
          file: {
            id: updatedFile.id,
            aiStatus: updatedFile.aiStatus,
            aiCategory: updatedFile.aiCategory,
            storagePath: newPath,
          },
        },
        { status: 200 }
      );
    } else {
      // Reject: update status and move to rejected folder
      const rejectedDir = path.join(process.cwd(), "uploads", "rejected");
      if (!fs.existsSync(rejectedDir)) {
        fs.mkdirSync(rejectedDir, { recursive: true });
      }

      const newPath = path.join(rejectedDir, path.basename(file.storagePath));
      if (fs.existsSync(file.storagePath)) {
        fs.renameSync(file.storagePath, newPath);
      }

      // Update status in database
      const updatedFile = await prisma.uploadedFile.update({
        where: { id: fileId },
        data: { 
          aiStatus: "failed",
          storagePath: newPath,
        },
      });

      return NextResponse.json(
        {
          message: "File rejected successfully",
          file: {
            id: updatedFile.id,
            aiStatus: updatedFile.aiStatus,
            storagePath: newPath,
          },
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error processing review action:", error);
    return NextResponse.json(
      { error: "Failed to process review action" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/review/[fileId]
// Delete a file
// =============================================================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    // Get file from database
    const file = await getUploadedFileById(fileId);
    
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Delete from filesystem
    if (fs.existsSync(file.storagePath)) {
      fs.unlinkSync(file.storagePath);
    }

    // Delete from database
    await deleteFile(fileId);

    return NextResponse.json(
      { message: "File deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
