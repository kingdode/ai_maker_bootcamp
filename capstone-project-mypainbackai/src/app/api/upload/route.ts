import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import AdmZip from "adm-zip";
import { extractDicomPackageMetadata, DicomPackageMetadata } from "@/lib/dicom-parser";
import {
  prisma,
  createBatch,
  createFileGroup,
  createUploadedFile,
  findFileByHash,
  getUploadedFiles,
  getBatches,
  saveDicomMetadata,
  guessCategory,
  getMimeType,
  FileCategory,
} from "@/lib/db";

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
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create a new batch for this upload session
    const batch = await createBatch();
    const uploadTimestamp = Date.now();
    const uploadedFiles = [];
    const skippedDuplicates: Array<{ filename: string; existingFile: string }> = [];
    const groups: Record<string, string> = {}; // groupId -> group name

    for (const file of files) {
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      
      // Check if it's a ZIP file
      const isZip = file.name.toLowerCase().endsWith(".zip") || 
                    file.type === "application/zip" ||
                    file.type === "application/x-zip-compressed";

      if (isZip) {
        // Handle ZIP file - create a group for extracted files
        const zipGroup = await createFileGroup({
          name: file.name,
          isZipGroup: true,
          batchId: batch.id,
        });
        groups[zipGroup.id] = file.name;

        const { files: extractedFiles, duplicates } = await handleZipFile(
          file, uploadsDir, uploadTimestamp, batch.id, zipGroup.id
        );
        uploadedFiles.push(...extractedFiles);
        skippedDuplicates.push(...duplicates);
      } else {
        // Handle regular file - create or use default group
        const result = await handleRegularFile(
          file, uploadsDir, uploadTimestamp, safeFilename, batch.id
        );
        if (result.isDuplicate) {
          skippedDuplicates.push({
            filename: file.name,
            existingFile: result.existingFilename!,
          });
        } else if (result.file) {
          uploadedFiles.push(result.file);
        }
      }
    }

    const duplicateMessage = skippedDuplicates.length > 0 
      ? ` (${skippedDuplicates.length} duplicate(s) skipped)`
      : "";

    return NextResponse.json(
      {
        batchId: batch.id,
        files: uploadedFiles,
        groups,
        skippedDuplicates,
        message: `${uploadedFiles.length} file(s) uploaded and queued for AI processing${duplicateMessage}`,
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

// Handle regular (non-ZIP) file upload
async function handleRegularFile(
  file: File, 
  uploadsDir: string, 
  timestamp: number,
  safeFilename: string,
  batchId: string,
): Promise<{ isDuplicate: boolean; existingFilename?: string; file?: any }> {
  // Read file content
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Compute content hash for duplicate detection
  const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
  
  // Check for duplicate
  const existingFile = await findFileByHash(contentHash);
  if (existingFile) {
    return {
      isDuplicate: true,
      existingFilename: existingFile.originalFilename,
    };
  }

  const uniqueFilename = `${timestamp}-${safeFilename}`;
  const filePath = path.join(uploadsDir, uniqueFilename);

  // Save file to disk
  fs.writeFileSync(filePath, buffer);

  // Determine category based on filename/extension
  const category = guessCategory(file.name);

  // Create database record
  const dbFile = await createUploadedFile({
    originalFilename: file.name,
    storagePath: filePath,
    mimeType: file.type || getMimeType(file.name),
    fileSize: file.size,
    contentHash,
    aiStatus: "pending",
    aiCategory: category,
    batchId: batchId,
    extractedFromZip: false,
  });

  return {
    isDuplicate: false,
    file: {
      id: dbFile.id,
      originalFilename: dbFile.originalFilename,
      storagePath: dbFile.storagePath,
      mimeType: dbFile.mimeType,
      fileSize: dbFile.fileSize,
      aiStatus: dbFile.aiStatus,
      aiCategory: dbFile.aiCategory,
      batchId: dbFile.batchId,
      groupId: dbFile.groupId,
      uploadedAt: dbFile.uploadedAt.toISOString(),
    },
  };
}

// Handle ZIP file - extract and process each file inside
async function handleZipFile(
  file: File, 
  uploadsDir: string, 
  timestamp: number,
  batchId: string,
  groupId: string,
): Promise<{
  files: Array<any>;
  duplicates: Array<{ filename: string; existingFile: string }>;
}> {
  const extractedFiles = [];
  const duplicates: Array<{ filename: string; existingFile: string }> = [];

  // Read ZIP content
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // Collect DICOM files for metadata extraction
    const dicomFiles: Array<{ name: string; buffer: Buffer }> = [];
    let dicomMetadata: DicomPackageMetadata | null = null;

    // First pass: collect DICOM files for metadata extraction
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const originalName = path.basename(entry.entryName);
      const lowerName = originalName.toLowerCase();
      
      // Check for DICOMDIR or DICOM files
      if (lowerName === "dicomdir" || lowerName.endsWith(".dcm") || lowerName.includes("dicom")) {
        dicomFiles.push({
          name: originalName,
          buffer: entry.getData(),
        });
      }
    }

    // Extract DICOM metadata if we have DICOM files
    if (dicomFiles.length > 0) {
      try {
        dicomMetadata = extractDicomPackageMetadata(dicomFiles);
        console.log("Extracted DICOM metadata:", dicomMetadata);
        
        // Save DICOM metadata to database
        await saveDicomMetadata({
          groupId,
          patientName: dicomMetadata.patientName,
          patientId: dicomMetadata.patientId,
          studyDate: dicomMetadata.studyDate,
          studyDescription: dicomMetadata.studyDescription,
          seriesDescriptions: dicomMetadata.seriesDescriptions,
          referringPhysician: dicomMetadata.referringPhysician,
          institution: dicomMetadata.institution,
          modalities: dicomMetadata.modalities,
          bodyParts: dicomMetadata.bodyParts,
          imageCount: dicomMetadata.imageCount,
          seriesCount: dicomMetadata.seriesCount,
          summary: dicomMetadata.summary,
        });
      } catch (err) {
        console.error("Error extracting DICOM metadata:", err);
      }
    }

    // Second pass: extract and save files
    for (const entry of zipEntries) {
      // Skip directories and hidden files
      if (entry.isDirectory) continue;
      if (entry.entryName.startsWith("__MACOSX")) continue;
      if (entry.entryName.startsWith(".")) continue;
      if (path.basename(entry.entryName).startsWith(".")) continue;

      // Get the file content
      const fileBuffer = entry.getData();
      const originalName = path.basename(entry.entryName);

      // Compute content hash for duplicate detection
      const contentHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
      
      // Check for duplicate
      const existingFile = await findFileByHash(contentHash);
      if (existingFile) {
        duplicates.push({
          filename: originalName,
          existingFile: existingFile.originalFilename,
        });
        continue; // Skip this file
      }

      const safeFilename = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFilename = `${timestamp}-zip-${safeFilename}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Save extracted file
      fs.writeFileSync(filePath, fileBuffer);

      // Determine category and mime type
      let category: FileCategory = guessCategory(originalName);
      const mimeType = getMimeType(originalName);
      
      // If we have DICOM metadata and this is an imaging file, use that info
      if (dicomMetadata && (originalName.toLowerCase().endsWith(".dcm") || originalName.toLowerCase() === "dicomdir")) {
        category = "imaging";
      }

      // Create database record
      const dbFile = await createUploadedFile({
        originalFilename: originalName,
        storagePath: filePath,
        mimeType: mimeType,
        fileSize: fileBuffer.length,
        contentHash,
        aiStatus: "pending",
        aiCategory: category,
        batchId: batchId,
        groupId: groupId,
        extractedFromZip: true,
        zipSourceName: file.name,
      });

      extractedFiles.push({
        id: dbFile.id,
        originalFilename: dbFile.originalFilename,
        storagePath: dbFile.storagePath,
        mimeType: dbFile.mimeType,
        fileSize: dbFile.fileSize,
        aiStatus: dbFile.aiStatus,
        aiCategory: dbFile.aiCategory,
        extractedFromZip: true,
        zipSourceName: file.name,
        batchId: dbFile.batchId,
        groupId: dbFile.groupId,
        uploadedAt: dbFile.uploadedAt.toISOString(),
        // Include DICOM metadata summary if available
        ...(dicomMetadata && {
          dicomMetadata: {
            studyDate: dicomMetadata.studyDate,
            referringPhysician: dicomMetadata.referringPhysician,
            institution: dicomMetadata.institution,
            modalities: dicomMetadata.modalities,
            bodyParts: dicomMetadata.bodyParts,
            summary: dicomMetadata.summary,
          },
        }),
      });
    }
  } catch (err) {
    console.error("Error extracting ZIP:", err);
    
    // If ZIP extraction fails, save the ZIP file itself
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const existingFile = await findFileByHash(contentHash);
    
    if (!existingFile) {
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFilename = `${timestamp}-${safeFilename}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      fs.writeFileSync(filePath, buffer);
      
      const dbFile = await createUploadedFile({
        originalFilename: file.name,
        storagePath: filePath,
        mimeType: "application/zip",
        fileSize: file.size,
        contentHash,
        aiStatus: "pending",
        aiCategory: "other",
        batchId: batchId,
        groupId: groupId,
        extractedFromZip: false,
        zipSourceName: file.name,
      });

      extractedFiles.push({
        id: dbFile.id,
        originalFilename: dbFile.originalFilename,
        storagePath: dbFile.storagePath,
        mimeType: dbFile.mimeType,
        fileSize: dbFile.fileSize,
        aiStatus: dbFile.aiStatus,
        aiCategory: dbFile.aiCategory,
        extractedFromZip: false,
        zipSourceName: file.name,
        batchId: dbFile.batchId,
        groupId: dbFile.groupId,
        uploadedAt: dbFile.uploadedAt.toISOString(),
      });
    } else {
      duplicates.push({
        filename: file.name,
        existingFile: existingFile.originalFilename,
      });
    }
  }

  return { files: extractedFiles, duplicates };
}

// =============================================================================
// GET /api/upload
// Returns all pending files grouped by batch
// =============================================================================
export async function GET() {
  try {
    // Get all files from database
    const files = await getUploadedFiles();
    const batches = await getBatches();

    // Transform files for API response
    const fileList = files.map((file: typeof files[number]) => ({
      id: file.id,
      originalFilename: file.originalFilename,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      aiStatus: file.aiStatus,
      aiCategory: file.aiCategory,
      batchId: file.batchId,
      groupId: file.groupId,
      extractedFromZip: file.extractedFromZip,
      zipSourceName: file.zipSourceName,
      uploadedAt: file.uploadedAt.toISOString(),
      // Include analysis results if available
      ...(file.summary && {
        summary: file.summary,
        suggestedTitle: file.suggestedTitle,
        extractedDate: file.extractedDate,
        extractedProvider: file.extractedProvider,
        extractedBodyRegion: file.extractedBodyRegion,
      }),
    }));

    // Transform batches for API response
    const batchList = batches.map((batch: typeof batches[number]) => ({
      batchId: batch.id,
      createdAt: batch.createdAt.toISOString(),
      fileCount: batch.files.length,
      files: batch.files.map((f: typeof batch.files[number]) => f.id),
      groups: batch.groups.reduce((acc: Record<string, string[]>, g: typeof batch.groups[number]) => {
        acc[g.id] = g.files.map((f: typeof g.files[number]) => f.id);
        return acc;
      }, {} as Record<string, string[]>),
    }));

    return NextResponse.json({ files: fileList, batches: batchList }, { status: 200 });
  } catch (error) {
    console.error("Error fetching uploads:", error);
    return NextResponse.json(
      { error: "Failed to fetch uploads" },
      { status: 500 }
    );
  }
}
