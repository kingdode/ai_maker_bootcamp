import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

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
    const pendingDir = path.join(process.cwd(), "uploads", "pending");
    const filePath = path.join(pendingDir, fileId);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const stats = fs.statSync(filePath);
    const originalFilename = fileId.replace(/^\d+-/, "").replace(/_/g, " ");

    return NextResponse.json(
      {
        id: fileId,
        originalFilename,
        storagePath: filePath,
        fileSize: stats.size,
        aiStatus: "review",
        uploadedAt: stats.birthtime.toISOString(),
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
// Confirm or reject a file - moves it to confirmed or rejected folder
// =============================================================================
export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const body = await request.json();
    const { action } = body;

    // Validate action
    if (!["confirm", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'confirm' or 'reject'" },
        { status: 400 }
      );
    }

    const pendingDir = path.join(process.cwd(), "uploads", "pending");
    const sourcePath = path.join(pendingDir, fileId);

    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Determine destination based on action
    const destFolder = action === "confirm" ? "confirmed" : "rejected";
    const destDir = path.join(process.cwd(), "uploads", destFolder);
    
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, fileId);

    // Move the file
    fs.renameSync(sourcePath, destPath);

    return NextResponse.json(
      {
        message: `File ${action}ed successfully`,
        file: {
          id: fileId,
          aiStatus: action === "confirm" ? "confirmed" : "rejected",
          storagePath: destPath,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing review action:", error);
    return NextResponse.json(
      { error: "Failed to process review action" },
      { status: 500 }
    );
  }
}
