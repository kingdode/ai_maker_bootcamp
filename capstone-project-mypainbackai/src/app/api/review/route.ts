import { NextResponse } from "next/server";
import {
  getUploadedFiles,
  guessCategory,
  getMimeType,
} from "@/lib/db";

// =============================================================================
// GET /api/review
// Returns files that need user review (pending AI processing)
// =============================================================================
export async function GET() {
  try {
    // Get all files from database
    const files = await getUploadedFiles();
    
    // Filter to files needing review (pending or review status)
    const reviewFiles = files.filter(
      (f: typeof files[number]) => f.aiStatus === "pending" || f.aiStatus === "review" || f.aiStatus === "processing"
    );

    // Transform for API response
    const fileList = reviewFiles.map((file: typeof files[number]) => ({
      id: file.id,
      originalFilename: file.originalFilename,
      storagePath: file.storagePath,
      mimeType: file.mimeType || getMimeType(file.originalFilename),
      fileSize: file.fileSize,
      aiStatus: file.aiStatus,
      aiCategory: file.aiCategory || guessCategory(file.originalFilename),
      aiConfidence: file.aiConfidence || 0.75,
      extractedDate: file.extractedDate,
      extractedProvider: file.extractedProvider,
      extractedBodyRegion: file.extractedBodyRegion,
      extractedText: file.extractedText,
      summary: file.summary,
      suggestedTitle: file.suggestedTitle,
      keywords: file.keywords ? JSON.parse(file.keywords) : null,
      batchId: file.batchId,
      groupId: file.groupId,
      extractedFromZip: file.extractedFromZip,
      zipSourceName: file.zipSourceName,
      suggestedEvent: null, // TODO: Add event suggestions when timeline is implemented
      uploadedAt: file.uploadedAt.toISOString(),
      analyzedAt: file.analyzedAt?.toISOString() || null,
    }));

    // Count by status
    const totalPending = files.filter((f: typeof files[number]) => f.aiStatus === "pending").length;
    const totalProcessing = files.filter((f: typeof files[number]) => f.aiStatus === "processing").length;
    const totalReview = files.filter((f: typeof files[number]) => f.aiStatus === "review").length;

    return NextResponse.json(
      {
        files: fileList,
        totalReview,
        totalPending,
        totalProcessing,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching review queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch review queue" },
      { status: 500 }
    );
  }
}
