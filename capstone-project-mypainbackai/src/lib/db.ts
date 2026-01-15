// =============================================================================
// Database Service Layer
// Centralizes all database operations and shared utilities
// =============================================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as path from "path";

// =============================================================================
// Prisma Client Singleton
// =============================================================================

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// =============================================================================
// Type Definitions
// =============================================================================

export type AIStatus = "pending" | "processing" | "review" | "confirmed" | "failed";

export type FileCategory = 
  | "imaging" 
  | "visit_notes" 
  | "physical_therapy" 
  | "medication" 
  | "lab_results" 
  | "billing" 
  | "other";

export interface FileUploadData {
  originalFilename: string;
  storagePath: string;
  mimeType?: string | null;
  fileSize?: number | null;
  contentHash?: string | null;
  aiStatus?: AIStatus;
  aiCategory?: FileCategory | null;
  batchId?: string | null;
  groupId?: string | null;
  extractedFromZip?: boolean;
  zipSourceName?: string | null;
}

export interface AnalysisResult {
  category?: string | null;
  confidence?: number | null;
  extractedDate?: string | null;
  provider?: string | null;
  bodyRegion?: string | null;
  summary?: string | null;
  suggestedTitle?: string | null;
  keywords?: string[] | null;
  extractedText?: string | null;
}

export interface DicomData {
  patientName?: string | null;
  patientId?: string | null;
  studyDate?: string | null;
  studyDescription?: string | null;
  seriesDescriptions?: string[] | null;
  referringPhysician?: string | null;
  institution?: string | null;
  modalities?: string[] | null;
  bodyParts?: string[] | null;
  imageCount?: number;
  seriesCount?: number;
  summary?: string | null;
}

// =============================================================================
// File Utilities (Shared across API routes)
// =============================================================================

/**
 * Guess file category based on filename and extension
 */
export function guessCategory(filename: string): FileCategory {
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

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string {
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
// File Operations
// =============================================================================

/**
 * Create a new uploaded file record
 */
export async function createUploadedFile(data: FileUploadData) {
  return prisma.uploadedFile.create({
    data: {
      originalFilename: data.originalFilename,
      storagePath: data.storagePath,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      contentHash: data.contentHash,
      aiStatus: data.aiStatus || "pending",
      aiCategory: data.aiCategory,
      batchId: data.batchId,
      groupId: data.groupId,
      extractedFromZip: data.extractedFromZip || false,
      zipSourceName: data.zipSourceName,
    },
  });
}

/**
 * Check if a file with the given content hash already exists
 */
export async function findFileByHash(contentHash: string) {
  return prisma.uploadedFile.findUnique({
    where: { contentHash },
  });
}

/**
 * Get all uploaded files with optional filters
 */
export async function getUploadedFiles(options?: {
  aiStatus?: AIStatus;
  aiCategory?: FileCategory;
  batchId?: string;
  groupId?: string;
}) {
  const where: Prisma.UploadedFileWhereInput = {};
  
  if (options?.aiStatus) where.aiStatus = options.aiStatus;
  if (options?.aiCategory) where.aiCategory = options.aiCategory;
  if (options?.batchId) where.batchId = options.batchId;
  if (options?.groupId) where.groupId = options.groupId;
  
  return prisma.uploadedFile.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    include: {
      batch: true,
      group: true,
      dicomMetadata: true,
    },
  });
}

/**
 * Get a single file by ID
 */
export async function getUploadedFileById(id: string) {
  return prisma.uploadedFile.findUnique({
    where: { id },
    include: {
      batch: true,
      group: true,
      dicomMetadata: true,
    },
  });
}

/**
 * Update file with analysis results
 */
export async function updateFileAnalysis(fileId: string, analysis: AnalysisResult) {
  return prisma.uploadedFile.update({
    where: { id: fileId },
    data: {
      aiStatus: "review",
      aiCategory: analysis.category,
      aiConfidence: analysis.confidence,
      extractedDate: analysis.extractedDate,
      extractedProvider: analysis.provider,
      extractedBodyRegion: analysis.bodyRegion,
      summary: analysis.summary,
      suggestedTitle: analysis.suggestedTitle,
      keywords: analysis.keywords ? JSON.stringify(analysis.keywords) : null,
      extractedText: analysis.extractedText,
      analyzedAt: new Date(),
    },
  });
}

/**
 * Confirm a file (mark as confirmed)
 */
export async function confirmFile(fileId: string, updates?: Partial<AnalysisResult>) {
  return prisma.uploadedFile.update({
    where: { id: fileId },
    data: {
      aiStatus: "confirmed",
      confirmedAt: new Date(),
      ...(updates?.category && { aiCategory: updates.category }),
      ...(updates?.extractedDate && { extractedDate: updates.extractedDate }),
      ...(updates?.provider && { extractedProvider: updates.provider }),
      ...(updates?.bodyRegion && { extractedBodyRegion: updates.bodyRegion }),
    },
  });
}

/**
 * Delete a file
 */
export async function deleteFile(fileId: string) {
  return prisma.uploadedFile.delete({
    where: { id: fileId },
  });
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Create a new batch
 */
export async function createBatch() {
  return prisma.batch.create({
    data: {},
  });
}

/**
 * Get all batches with their files
 */
export async function getBatches() {
  return prisma.batch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      files: true,
      groups: {
        include: {
          files: true,
        },
      },
    },
  });
}

// =============================================================================
// File Group Operations
// =============================================================================

/**
 * Create a new file group
 */
export async function createFileGroup(data: {
  name?: string;
  isZipGroup?: boolean;
  batchId?: string;
}) {
  return prisma.fileGroup.create({
    data: {
      name: data.name,
      isZipGroup: data.isZipGroup || false,
      batchId: data.batchId,
    },
  });
}

/**
 * Get file group by ID with all related data
 */
export async function getFileGroupById(id: string) {
  return prisma.fileGroup.findUnique({
    where: { id },
    include: {
      files: true,
      groupAnalysis: true,
      dicomMetadata: true,
    },
  });
}

/**
 * Update group analysis
 */
export async function updateGroupAnalysis(groupId: string, analysis: {
  category?: string;
  date?: string;
  provider?: string;
  bodyRegion?: string;
  summary?: string;
  suggestedTitle?: string;
  confidence?: number;
  hasImaging?: boolean;
  imagingSummary?: string;
  imagingFiles?: string[];
}) {
  return prisma.groupAnalysis.upsert({
    where: { groupId },
    create: {
      groupId,
      category: analysis.category,
      date: analysis.date,
      provider: analysis.provider,
      bodyRegion: analysis.bodyRegion,
      summary: analysis.summary,
      suggestedTitle: analysis.suggestedTitle,
      confidence: analysis.confidence,
      hasImaging: analysis.hasImaging || false,
      imagingSummary: analysis.imagingSummary,
      imagingFiles: analysis.imagingFiles ? JSON.stringify(analysis.imagingFiles) : null,
    },
    update: {
      category: analysis.category,
      date: analysis.date,
      provider: analysis.provider,
      bodyRegion: analysis.bodyRegion,
      summary: analysis.summary,
      suggestedTitle: analysis.suggestedTitle,
      confidence: analysis.confidence,
      hasImaging: analysis.hasImaging || false,
      imagingSummary: analysis.imagingSummary,
      imagingFiles: analysis.imagingFiles ? JSON.stringify(analysis.imagingFiles) : null,
      analyzedAt: new Date(),
    },
  });
}

// =============================================================================
// DICOM Metadata Operations
// =============================================================================

/**
 * Create or update DICOM metadata for a file or group
 */
export async function saveDicomMetadata(data: DicomData & { fileId?: string; groupId?: string }) {
  const createData = {
    fileId: data.fileId,
    groupId: data.groupId,
    patientName: data.patientName,
    patientId: data.patientId,
    studyDate: data.studyDate,
    studyDescription: data.studyDescription,
    seriesDescriptions: data.seriesDescriptions ? JSON.stringify(data.seriesDescriptions) : null,
    referringPhysician: data.referringPhysician,
    institution: data.institution,
    modalities: data.modalities ? JSON.stringify(data.modalities) : null,
    bodyParts: data.bodyParts ? JSON.stringify(data.bodyParts) : null,
    imageCount: data.imageCount || 0,
    seriesCount: data.seriesCount || 0,
    summary: data.summary,
  };

  if (data.fileId) {
    return prisma.dicomMetadata.upsert({
      where: { fileId: data.fileId },
      create: createData,
      update: createData,
    });
  } else if (data.groupId) {
    return prisma.dicomMetadata.upsert({
      where: { groupId: data.groupId },
      create: createData,
      update: createData,
    });
  }
  
  throw new Error("Either fileId or groupId must be provided");
}

/**
 * Get DICOM metadata for a group
 */
export async function getDicomMetadataByGroupId(groupId: string) {
  return prisma.dicomMetadata.findUnique({
    where: { groupId },
  });
}

/**
 * Get all DICOM metadata
 */
export async function getAllDicomMetadata() {
  return prisma.dicomMetadata.findMany({
    orderBy: { extractedAt: "desc" },
  });
}

// =============================================================================
// Patient Summary Operations
// =============================================================================

/**
 * Get or create patient summary (singleton pattern)
 */
export async function getPatientSummary() {
  let summary = await prisma.patientSummary.findFirst();
  
  if (!summary) {
    summary = await prisma.patientSummary.create({
      data: {},
    });
  }
  
  return summary;
}

/**
 * Update patient summary
 */
export async function updatePatientSummary(data: {
  summary?: string;
  painHistory?: string;
  currentSymptoms?: string;
  treatments?: string;
  goals?: string;
}) {
  const existing = await getPatientSummary();
  
  return prisma.patientSummary.update({
    where: { id: existing.id },
    data: {
      summary: data.summary,
      painHistory: data.painHistory,
      currentSymptoms: data.currentSymptoms,
      treatments: data.treatments,
      goals: data.goals,
    },
  });
}

// =============================================================================
// Imaging Report Operations
// =============================================================================

/**
 * Get latest imaging report
 */
export async function getLatestImagingReport() {
  return prisma.imagingReport.findFirst({
    orderBy: { generatedAt: "desc" },
  });
}

/**
 * Save imaging report
 */
export async function saveImagingReport(data: {
  quickSummary?: string;
  primaryDiagnosis?: string;
  keyPoints?: string[];
  lastImagingDate?: string;
  imagingList?: any[];
  patientTimeline?: any[];
  bodyRegionProgression?: Record<string, any>;
}) {
  return prisma.imagingReport.create({
    data: {
      quickSummary: data.quickSummary,
      primaryDiagnosis: data.primaryDiagnosis,
      keyPoints: data.keyPoints ? JSON.stringify(data.keyPoints) : null,
      lastImagingDate: data.lastImagingDate,
      imagingList: data.imagingList ? JSON.stringify(data.imagingList) : null,
      patientTimeline: data.patientTimeline ? JSON.stringify(data.patientTimeline) : null,
      bodyRegionProgression: data.bodyRegionProgression ? JSON.stringify(data.bodyRegionProgression) : null,
    },
  });
}

// =============================================================================
// Patient Analysis (Cumulative Stats) Operations
// =============================================================================

/**
 * Get or create patient analysis stats
 */
export async function getPatientAnalysis() {
  let analysis = await prisma.patientAnalysis.findFirst();
  
  if (!analysis) {
    analysis = await prisma.patientAnalysis.create({
      data: {},
    });
  }
  
  return analysis;
}

/**
 * Update patient analysis stats
 */
export async function updatePatientAnalysis(data: {
  totalFilesAnalyzed?: number;
  conditions?: string[];
  providers?: string[];
  bodyRegions?: string[];
  medicationsFound?: string[];
  treatmentsFound?: string[];
  earliestDate?: string;
  latestDate?: string;
}) {
  const existing = await getPatientAnalysis();
  
  return prisma.patientAnalysis.update({
    where: { id: existing.id },
    data: {
      totalFilesAnalyzed: data.totalFilesAnalyzed,
      conditions: data.conditions ? JSON.stringify(data.conditions) : undefined,
      providers: data.providers ? JSON.stringify(data.providers) : undefined,
      bodyRegions: data.bodyRegions ? JSON.stringify(data.bodyRegions) : undefined,
      medicationsFound: data.medicationsFound ? JSON.stringify(data.medicationsFound) : undefined,
      treatmentsFound: data.treatmentsFound ? JSON.stringify(data.treatmentsFound) : undefined,
      earliestDate: data.earliestDate,
      latestDate: data.latestDate,
    },
  });
}

/**
 * Increment file count and add extracted data to cumulative stats
 */
export async function addToPatientAnalysis(analysis: AnalysisResult) {
  const existing = await getPatientAnalysis();
  
  // Parse existing arrays
  const providers = existing.providers ? JSON.parse(existing.providers) : [];
  const bodyRegions = existing.bodyRegions ? JSON.parse(existing.bodyRegions) : [];
  
  // Add new values if not already present
  if (analysis.provider && !providers.includes(analysis.provider)) {
    providers.push(analysis.provider);
  }
  if (analysis.bodyRegion && !bodyRegions.includes(analysis.bodyRegion)) {
    bodyRegions.push(analysis.bodyRegion);
  }
  
  // Update date range
  let earliestDate = existing.earliestDate;
  let latestDate = existing.latestDate;
  
  if (analysis.extractedDate) {
    if (!earliestDate || analysis.extractedDate < earliestDate) {
      earliestDate = analysis.extractedDate;
    }
    if (!latestDate || analysis.extractedDate > latestDate) {
      latestDate = analysis.extractedDate;
    }
  }
  
  return prisma.patientAnalysis.update({
    where: { id: existing.id },
    data: {
      totalFilesAnalyzed: existing.totalFilesAnalyzed + 1,
      providers: JSON.stringify(providers),
      bodyRegions: JSON.stringify(bodyRegions),
      earliestDate,
      latestDate,
    },
  });
}

