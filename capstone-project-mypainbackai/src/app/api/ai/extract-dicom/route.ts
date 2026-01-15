import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { parseDicomDir, parseDicomFile, DicomPackageMetadata } from "@/lib/dicom-parser";

const PENDING_DIR = path.join(process.cwd(), "uploads", "pending");
const DICOM_METADATA_DIR = path.join(process.cwd(), "uploads", "dicom-metadata");

// =============================================================================
// POST /api/ai/extract-dicom
// Retroactively extract DICOM metadata from existing files in pending
// =============================================================================
export async function POST() {
  try {
    // Ensure metadata directory exists
    if (!fs.existsSync(DICOM_METADATA_DIR)) {
      fs.mkdirSync(DICOM_METADATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(PENDING_DIR)) {
      return NextResponse.json({ message: "No pending files found" });
    }

    const files = fs.readdirSync(PENDING_DIR);
    
    // Find all DICOMDIR files
    const dicomDirFiles = files.filter(f => f.toUpperCase().includes("DICOMDIR"));
    
    // Group files by their timestamp (batch/group ID)
    const groups: Record<string, { dicomDir?: string; dicomFiles: string[] }> = {};
    
    for (const file of files) {
      // Extract timestamp from filename (e.g., "1767659354812-zip-DICOMDIR")
      const match = file.match(/^(\d+)/);
      if (match) {
        const groupId = match[1];
        if (!groups[groupId]) {
          groups[groupId] = { dicomFiles: [] };
        }
        
        if (file.toUpperCase().includes("DICOMDIR")) {
          groups[groupId].dicomDir = file;
        } else if (file.toLowerCase().endsWith(".dcm")) {
          groups[groupId].dicomFiles.push(file);
        }
      }
    }
    
    const results: Array<{
      groupId: string;
      metadata: DicomPackageMetadata;
      saved: boolean;
    }> = [];
    
    // Process each group that has DICOM content
    for (const [groupId, group] of Object.entries(groups)) {
      if (!group.dicomDir && group.dicomFiles.length === 0) {
        continue; // No DICOM content
      }
      
      let metadata: DicomPackageMetadata | null = null;
      
      // Prefer DICOMDIR for metadata extraction
      if (group.dicomDir) {
        const dicomDirPath = path.join(PENDING_DIR, group.dicomDir);
        const buffer = fs.readFileSync(dicomDirPath);
        metadata = parseDicomDir(buffer);
      } else if (group.dicomFiles.length > 0) {
        // Parse individual DICOM files
        const dicomBuffers = group.dicomFiles.map(f => ({
          name: f,
          buffer: fs.readFileSync(path.join(PENDING_DIR, f)),
        }));
        
        // Aggregate metadata from all files
        metadata = {
          extractedAt: new Date().toISOString(),
          seriesDescriptions: [],
          modalities: [],
          bodyParts: [],
          imageCount: dicomBuffers.length,
          seriesCount: 0,
          summary: "",
        };
        
        for (const { name, buffer } of dicomBuffers) {
          const fileMeta = parseDicomFile(buffer);
          if (fileMeta.studyDate && !metadata.studyDate) {
            metadata.studyDate = fileMeta.studyDate;
          }
          if (fileMeta.referringPhysician && !metadata.referringPhysician) {
            metadata.referringPhysician = fileMeta.referringPhysician;
          }
          if (fileMeta.institution && !metadata.institution) {
            metadata.institution = fileMeta.institution;
          }
          if (fileMeta.modality && !metadata.modalities.includes(fileMeta.modality)) {
            metadata.modalities.push(fileMeta.modality);
          }
          if (fileMeta.bodyPartExamined && !metadata.bodyParts.includes(fileMeta.bodyPartExamined.toLowerCase())) {
            metadata.bodyParts.push(fileMeta.bodyPartExamined.toLowerCase());
          }
          if (fileMeta.studyDescription && !metadata.studyDescription) {
            metadata.studyDescription = fileMeta.studyDescription;
          }
        }
      }
      
      if (metadata) {
        // Save metadata using only the simple timestamp ID (no batch- prefix)
        const metadataPath = path.join(DICOM_METADATA_DIR, `${groupId}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        results.push({
          groupId,
          metadata,
          saved: true,
        });
      }
    }
    
    return NextResponse.json({
      message: `Extracted DICOM metadata for ${results.length} groups`,
      groups: results,
    });
  } catch (error: any) {
    console.error("Error extracting DICOM metadata:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract DICOM metadata" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/ai/extract-dicom
// Get all extracted DICOM metadata
// =============================================================================
export async function GET() {
  try {
    if (!fs.existsSync(DICOM_METADATA_DIR)) {
      return NextResponse.json({
        message: "No DICOM metadata found",
        metadata: [],
      });
    }
    
    const files = fs.readdirSync(DICOM_METADATA_DIR);
    const metadata = files.map(file => {
      const content = fs.readFileSync(path.join(DICOM_METADATA_DIR, file), "utf-8");
      return {
        groupId: file.replace(".json", ""),
        metadata: JSON.parse(content),
      };
    });
    
    return NextResponse.json({
      message: `Found ${metadata.length} DICOM metadata files`,
      metadata,
    });
  } catch (error: any) {
    console.error("Error fetching DICOM metadata:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

