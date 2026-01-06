import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// GET /api/review
// Returns files that need user review (pending AI processing)
// =============================================================================
export async function GET() {
  try {
    const pendingDir = path.join(process.cwd(), "uploads", "pending");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(pendingDir)) {
      return NextResponse.json(
        {
          files: [],
          totalReview: 0,
          totalPending: 0,
          totalProcessing: 0,
        },
        { status: 200 }
      );
    }

    // Read all files in the pending directory
    const filenames = fs.readdirSync(pendingDir);
    
    const files = filenames.map((filename) => {
      const filePath = path.join(pendingDir, filename);
      const stats = fs.statSync(filePath);
      
      // Extract original filename from the unique filename (after timestamp-)
      const originalFilename = filename.replace(/^\d+-/, "").replace(/_/g, " ");
      
      // Determine mime type from extension
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      
      return {
        id: filename,
        originalFilename,
        storagePath: filePath,
        mimeType: mimeTypes[ext] || "application/octet-stream",
        fileSize: stats.size,
        aiStatus: "review", // Mark as ready for review
        aiCategory: guessCategory(originalFilename, ext),
        aiConfidence: 0.75, // Placeholder confidence
        extractedDate: null,
        extractedProvider: null,
        extractedBodyRegion: null,
        extractedText: null,
        suggestedEvent: null,
        uploadedAt: stats.birthtime.toISOString(),
      };
    });

    return NextResponse.json(
      {
        files,
        totalReview: files.length,
        totalPending: 0,
        totalProcessing: 0,
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

// Simple category guessing based on filename/extension
function guessCategory(filename: string, ext: string): string {
  const lower = filename.toLowerCase();
  
  if (lower.includes("mri") || lower.includes("xray") || lower.includes("ct") || lower.includes("scan")) {
    return "imaging";
  }
  if (lower.includes("pt") || lower.includes("therapy") || lower.includes("physical")) {
    return "physical_therapy";
  }
  if (lower.includes("rx") || lower.includes("prescription") || lower.includes("medication")) {
    return "medication";
  }
  if (lower.includes("lab") || lower.includes("blood") || lower.includes("test")) {
    return "lab_results";
  }
  if (lower.includes("bill") || lower.includes("invoice") || lower.includes("statement")) {
    return "billing";
  }
  if (lower.includes("visit") || lower.includes("notes") || lower.includes("doctor")) {
    return "visit_notes";
  }
  if ([".png", ".jpg", ".jpeg", ".gif"].includes(ext)) {
    return "imaging";
  }
  
  return "other";
}
