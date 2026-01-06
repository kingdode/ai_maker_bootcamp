import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";

// =============================================================================
// POST /api/upload
// AI-First File Upload: Accept files with NO required metadata
// Files uploaded together or from same ZIP are grouped with a shared batchId
// =============================================================================
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Get all uploaded files (supports multi-file upload)
    const files = formData.getAll("files") as File[];
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads", "pending");
    const batchesDir = path.join(process.cwd(), "uploads", "batches");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(batchesDir)) {
      fs.mkdirSync(batchesDir, { recursive: true });
    }

    // Generate a batch ID for this upload session
    const uploadTimestamp = Date.now();
    const batchId = `batch-${uploadTimestamp}`;
    const uploadedFiles = [];

    for (const file of files) {
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      
      // Check if it's a ZIP file
      const isZip = file.name.toLowerCase().endsWith(".zip") || 
                    file.type === "application/zip" ||
                    file.type === "application/x-zip-compressed";

      if (isZip) {
        // Handle ZIP file - extracted files share a sub-batch (grouped by ZIP)
        const zipBatchId = `${batchId}-zip-${safeFilename}`;
        const extractedFiles = await handleZipFile(file, uploadsDir, uploadTimestamp, zipBatchId);
        uploadedFiles.push(...extractedFiles);
      } else {
        // Handle regular file
        const processedFile = await handleRegularFile(file, uploadsDir, uploadTimestamp, safeFilename, batchId);
        uploadedFiles.push(processedFile);
      }
    }

    // Save batch metadata
    const batchMetadata = {
      batchId,
      createdAt: new Date().toISOString(),
      fileCount: uploadedFiles.length,
      files: uploadedFiles.map(f => f.id),
      // Group files by their sub-batch (for ZIP contents)
      groups: groupFilesByBatch(uploadedFiles),
    };
    fs.writeFileSync(
      path.join(batchesDir, `${batchId}.json`),
      JSON.stringify(batchMetadata, null, 2)
    );

    return NextResponse.json(
      {
        batchId,
        files: uploadedFiles,
        groups: batchMetadata.groups,
        message: `${uploadedFiles.length} file(s) uploaded and queued for AI processing`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

// Group files by their batch/group ID
function groupFilesByBatch(files: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const file of files) {
    const groupId = file.groupId || file.batchId;
    if (!groups[groupId]) {
      groups[groupId] = [];
    }
    groups[groupId].push(file);
  }
  return groups;
}

// Handle regular (non-ZIP) file upload
async function handleRegularFile(
  file: File, 
  uploadsDir: string, 
  timestamp: number,
  safeFilename: string,
  batchId: string
) {
  const uniqueFilename = `${timestamp}-${safeFilename}`;
  const filePath = path.join(uploadsDir, uniqueFilename);

  // Save file to disk
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  fs.writeFileSync(filePath, buffer);

  // Determine category based on filename/extension
  const category = guessCategory(file.name);

  return {
    id: uniqueFilename,
    originalFilename: file.name,
    storagePath: filePath,
    mimeType: file.type || null,
    fileSize: file.size,
    aiStatus: "pending",
    aiCategory: category,
    extractedFromZip: false,
    batchId: batchId,
    groupId: batchId, // Regular files share the main batch ID
    uploadedAt: new Date().toISOString(),
  };
}

// Handle ZIP file - extract and process each file inside
async function handleZipFile(
  file: File, 
  uploadsDir: string, 
  timestamp: number,
  zipBatchId: string
): Promise<Array<{
  id: string;
  originalFilename: string;
  storagePath: string;
  mimeType: string | null;
  fileSize: number;
  aiStatus: string;
  aiCategory: string;
  extractedFromZip: boolean;
  zipSourceName: string;
  batchId: string;
  groupId: string;
  uploadedAt: string;
}>> {
  const extractedFiles = [];

  // Save ZIP to temp location first
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      // Skip directories and hidden files
      if (entry.isDirectory) continue;
      if (entry.entryName.startsWith("__MACOSX")) continue;
      if (entry.entryName.startsWith(".")) continue;
      if (path.basename(entry.entryName).startsWith(".")) continue;

      // Get the file content
      const fileBuffer = entry.getData();
      const originalName = path.basename(entry.entryName);
      const safeFilename = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFilename = `${timestamp}-zip-${safeFilename}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Save extracted file
      fs.writeFileSync(filePath, fileBuffer);

      // Determine category and mime type
      const category = guessCategory(originalName);
      const mimeType = getMimeType(originalName);

      extractedFiles.push({
        id: uniqueFilename,
        originalFilename: originalName,
        storagePath: filePath,
        mimeType: mimeType,
        fileSize: fileBuffer.length,
        aiStatus: "pending",
        aiCategory: category,
        extractedFromZip: true,
        zipSourceName: file.name,
        batchId: zipBatchId.split("-zip-")[0], // Parent batch ID
        groupId: zipBatchId, // Files from same ZIP share this group ID
        uploadedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Error extracting ZIP:", err);
    // If ZIP extraction fails, save the ZIP file itself
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `${timestamp}-${safeFilename}`;
    const filePath = path.join(uploadsDir, uniqueFilename);
    fs.writeFileSync(filePath, buffer);
    
    extractedFiles.push({
      id: uniqueFilename,
      originalFilename: file.name,
      storagePath: filePath,
      mimeType: "application/zip",
      fileSize: file.size,
      aiStatus: "pending",
      aiCategory: "other",
      extractedFromZip: false,
      zipSourceName: file.name,
      batchId: zipBatchId.split("-zip-")[0],
      groupId: zipBatchId,
      uploadedAt: new Date().toISOString(),
    });
  }

  return extractedFiles;
}

// Guess file category based on filename and extension
function guessCategory(filename: string): string {
  const lower = filename.toLowerCase();
  const ext = path.extname(lower);
  
  // Imaging
  if (lower.includes("mri") || lower.includes("xray") || lower.includes("x-ray") || 
      lower.includes("ct") || lower.includes("scan") || lower.includes("dicom") ||
      ext === ".dcm") {
    return "imaging";
  }
  
  // Physical Therapy
  if (lower.includes("pt") || lower.includes("therapy") || lower.includes("physical") ||
      lower.includes("exercise") || lower.includes("rehab")) {
    return "physical_therapy";
  }
  
  // Medication
  if (lower.includes("rx") || lower.includes("prescription") || lower.includes("medication") ||
      lower.includes("med") || lower.includes("pharmacy")) {
    return "medication";
  }
  
  // Lab Results
  if (lower.includes("lab") || lower.includes("blood") || lower.includes("test") ||
      lower.includes("result")) {
    return "lab_results";
  }
  
  // Billing
  if (lower.includes("bill") || lower.includes("invoice") || lower.includes("statement") ||
      lower.includes("insurance") || lower.includes("claim") || lower.includes("eob")) {
    return "billing";
  }
  
  // Visit Notes / Medical Records
  if (lower.includes("visit") || lower.includes("notes") || lower.includes("doctor") ||
      lower.includes("chart") || lower.includes("record") || lower.includes("consult") ||
      lower.includes("ucsd") || lower.includes("hospital")) {
    return "visit_notes";
  }
  
  // Images (likely imaging if medical context)
  if ([".png", ".jpg", ".jpeg", ".gif", ".tiff", ".tif", ".bmp"].includes(ext)) {
    return "imaging";
  }
  
  // PDFs are often visit notes or reports
  if (ext === ".pdf") {
    return "visit_notes";
  }
  
  return "other";
}

// Get MIME type from filename
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".bmp": "image/bmp",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".xml": "application/xml",
    ".json": "application/json",
    ".dcm": "application/dicom",
    ".zip": "application/zip",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// =============================================================================
// GET /api/upload
// Returns all pending files grouped by batch
// =============================================================================
export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads", "pending");
    const batchesDir = path.join(process.cwd(), "uploads", "batches");
    
    // Create directories if they don't exist
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ files: [], batches: [] }, { status: 200 });
    }

    // Read all batch files
    const batches: any[] = [];
    if (fs.existsSync(batchesDir)) {
      const batchFiles = fs.readdirSync(batchesDir);
      for (const batchFile of batchFiles) {
        try {
          const content = fs.readFileSync(path.join(batchesDir, batchFile), "utf-8");
          batches.push(JSON.parse(content));
        } catch (e) {
          // Skip invalid batch files
        }
      }
    }

    // Read all files in the pending directory
    const filenames = fs.readdirSync(uploadsDir);
    
    const files = filenames.map((filename) => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      // Extract original filename from the unique filename (after timestamp-)
      let originalFilename = filename.replace(/^\d+-/, "");
      // Handle zip-extracted files
      originalFilename = originalFilename.replace(/^zip-/, "");
      originalFilename = originalFilename.replace(/_/g, " ");
      
      const category = guessCategory(originalFilename);
      
      // Try to find batch info for this file
      const batch = batches.find(b => b.files?.includes(filename));
      
      return {
        id: filename,
        originalFilename,
        storagePath: filePath,
        mimeType: getMimeType(filename),
        fileSize: stats.size,
        aiStatus: "pending",
        aiCategory: category,
        batchId: batch?.batchId || null,
        uploadedAt: stats.birthtime.toISOString(),
      };
    });

    // Sort batches by creation date (newest first)
    batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ files, batches }, { status: 200 });
  } catch (error) {
    console.error("Error fetching uploads:", error);
    return NextResponse.json(
      { error: "Failed to fetch uploads" },
      { status: 500 }
    );
  }
}
