import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// GET /api/files/[fileId]
// Serves file content for preview
// =============================================================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Look for the file in pending, confirmed, or rejected directories
    const directories = ["pending", "confirmed", "rejected"];
    let filePath = null;

    for (const dir of directories) {
      const testPath = path.join(process.cwd(), "uploads", dir, fileId);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    if (!filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath);

    // Determine content type from file extension
    const ext = path.extname(fileId).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".tiff": "image/tiff",
      ".tif": "image/tiff",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".txt": "text/plain",
      ".html": "text/html",
      ".xml": "application/xml",
      ".json": "application/json",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".dcm": "application/dicom",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}

