import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Cumulative analysis storage file
const ANALYSIS_FILE = path.join(process.cwd(), "uploads", "analysis-results.json");
const IMAGING_SUMMARY_FILE = path.join(process.cwd(), "uploads", "imaging-summary.json");
const DICOM_METADATA_DIR = path.join(process.cwd(), "uploads", "dicom-metadata");

interface DicomPackageMetadata {
  extractedAt: string;
  patientName?: string;
  studyDate?: string;
  studyDescription?: string;
  seriesDescriptions: string[];
  referringPhysician?: string;
  institution?: string;
  modalities: string[];
  bodyParts: string[];
  imageCount: number;
  seriesCount: number;
  summary: string;
}

// =============================================================================
// Types
// =============================================================================
interface GroupAnalysisResult {
  groupId: string;
  groupName: string;
  analyzedAt: string;
  fileCount: number;
  fileIds: string[];
  category: string;
  date: string | null;
  provider: string | null;
  bodyRegion: string | null;
  summary: string;
  suggestedTitle: string;
  hasImaging: boolean;
  imagingSummary?: string;
  imagingFiles?: string[];
  keywords: string[];
  confidence: number;
}

interface ImagingSummary {
  lastUpdated: string;
  totalImagingStudies: number;
  studies: Array<{
    groupId: string;
    date: string | null;
    bodyRegion: string | null;
    provider: string | null;
    description: string;
    fileCount: number;
    files: string[];
  }>;
}

// =============================================================================
// Helper Functions
// =============================================================================

// Load existing analysis data
function loadAnalysisData(): any {
  try {
    if (fs.existsSync(ANALYSIS_FILE)) {
      return JSON.parse(fs.readFileSync(ANALYSIS_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading analysis data:", error);
  }
  return {
    lastUpdated: new Date().toISOString(),
    totalFilesAnalyzed: 0,
    analyses: {},
    groupAnalyses: {},
    patientSummary: {
      conditions: [],
      providers: [],
      bodyRegions: [],
      dateRange: { earliest: null, latest: null },
      medicationsFound: [],
      treatmentsFound: [],
    },
  };
}

// Save analysis data
function saveAnalysisData(data: any): void {
  const dir = path.dirname(ANALYSIS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(data, null, 2));
}

// Load imaging summary
function loadImagingSummary(): ImagingSummary {
  try {
    if (fs.existsSync(IMAGING_SUMMARY_FILE)) {
      return JSON.parse(fs.readFileSync(IMAGING_SUMMARY_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Error loading imaging summary:", error);
  }
  return {
    lastUpdated: new Date().toISOString(),
    totalImagingStudies: 0,
    studies: [],
  };
}

// Save imaging summary
function saveImagingSummary(data: ImagingSummary): void {
  fs.writeFileSync(IMAGING_SUMMARY_FILE, JSON.stringify(data, null, 2));
}

// Extract text from PDF
async function extractPdfText(filePath: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || "";
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return "";
  }
}

// Get content from a file
async function getFileContent(filePath: string, filename: string): Promise<{ type: string; content: string; isImaging: boolean }> {
  const ext = path.extname(filename).toLowerCase();
  
  // Check if it's an imaging file
  const isImaging = ext === ".dcm" || 
    filename.toLowerCase().includes("dicom") ||
    filename.toLowerCase().includes("img") ||
    filename.toLowerCase().includes("xray") ||
    filename.toLowerCase().includes("mri") ||
    filename.toLowerCase().includes("ct");

  if (ext === ".pdf") {
    const text = await extractPdfText(filePath);
    return { type: "pdf", content: text, isImaging: false };
  }
  
  if ([".txt", ".html", ".xml", ".json", ".csv"].includes(ext)) {
    try {
      const text = fs.readFileSync(filePath, "utf-8");
      return { type: "text", content: text, isImaging: false };
    } catch {
      return { type: "text", content: "", isImaging: false };
    }
  }
  
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    return { type: "image", content: `[Image file: ${filename}]`, isImaging: isImaging };
  }
  
  if (ext === ".dcm") {
    return { type: "dicom", content: `[DICOM medical imaging file: ${filename}]`, isImaging: true };
  }
  
  // Skip system/binary files
  const skipExtensions = [".dll", ".exe", ".dylib", ".so", ".bin", ".pak", ".asar", ".dat", 
    ".eot", ".ttf", ".woff", ".woff2", ".otf", ".icns", ".ico", ".lnk"];
  if (skipExtensions.includes(ext)) {
    return { type: "skip", content: "", isImaging: false };
  }
  
  return { type: "unknown", content: `[File: ${filename}]`, isImaging: isImaging };
}

// =============================================================================
// POST /api/ai/analyze-group
// Analyze a group of files (from same ZIP) together
// =============================================================================
export async function POST(request: Request) {
  try {
    const { groupId, fileIds, groupName } = await request.json();

    if (!groupId || !fileIds || fileIds.length === 0) {
      return NextResponse.json(
        { error: "groupId and fileIds are required" },
        { status: 400 }
      );
    }

    // Use server-side environment variable only (secure)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured. Add OPENAI_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    // Check if already analyzed
    const analysisData = loadAnalysisData();
    if (analysisData.groupAnalyses && analysisData.groupAnalyses[groupId]) {
      return NextResponse.json({
        message: "Group already analyzed",
        analysis: analysisData.groupAnalyses[groupId],
        analyzed: true,
      });
    }

    // Load DICOM metadata if available
    let dicomMetadata: DicomPackageMetadata | null = null;
    const dicomMetadataPath = path.join(DICOM_METADATA_DIR, `${groupId}.json`);
    if (fs.existsSync(dicomMetadataPath)) {
      try {
        dicomMetadata = JSON.parse(fs.readFileSync(dicomMetadataPath, "utf-8"));
        console.log("Loaded DICOM metadata for group:", groupId, dicomMetadata);
      } catch (err) {
        console.error("Error loading DICOM metadata:", err);
      }
    }

    // Collect content from all files in the group
    const fileContents: Array<{ filename: string; content: string; type: string; isImaging: boolean }> = [];
    const imagingFiles: string[] = [];
    const pendingDir = path.join(process.cwd(), "uploads", "pending");

    for (const fileId of fileIds) {
      const filePath = path.join(pendingDir, fileId);
      if (!fs.existsSync(filePath)) continue;

      // Extract original filename
      const match = fileId.match(/^\d+-(zip-)?(.+)$/);
      const originalFilename = match ? match[2].replace(/_/g, " ") : fileId;

      const content = await getFileContent(filePath, originalFilename);
      
      if (content.type === "skip") continue;
      
      if (content.isImaging) {
        imagingFiles.push(originalFilename);
      }
      
      fileContents.push({
        filename: originalFilename,
        content: content.content,
        type: content.type,
        isImaging: content.isImaging,
      });
    }

    // Build combined content for analysis
    const combinedContent = fileContents
      .filter(f => f.content && f.type !== "skip")
      .map(f => `--- File: ${f.filename} (${f.type}) ---\n${f.content.slice(0, 2000)}`)
      .join("\n\n");

    const hasImaging = imagingFiles.length > 0;

    // Build DICOM metadata context if available
    let dicomContext = "";
    if (dicomMetadata) {
      dicomContext = `
DICOM METADATA EXTRACTED FROM FILES:
- Study Date: ${dicomMetadata.studyDate || "Unknown"}
- Referring Physician: ${dicomMetadata.referringPhysician || "Unknown"}
- Institution: ${dicomMetadata.institution || "Unknown"}
- Modalities: ${dicomMetadata.modalities.join(", ") || "Unknown"}
- Body Parts: ${dicomMetadata.bodyParts.join(", ") || "Unknown"}
- Image Count: ${dicomMetadata.imageCount}
- DICOM Summary: ${dicomMetadata.summary}
`;
    }

    // Analyze with OpenAI
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const systemPrompt = `You are a medical document analyzer. You are analyzing a group of related medical files that were uploaded together (from a ZIP archive or same upload session).

${dicomContext}

Your job is to:
1. Analyze ALL the files together as a single medical event/visit
2. Extract the DATE of the medical event (use DICOM metadata if available, otherwise look in documents)
3. Identify the healthcare PROVIDER or facility (use DICOM metadata if available)
4. Determine the BODY REGION being examined/treated (use DICOM metadata if available)
5. Create a comprehensive SUMMARY of what this collection represents
6. Suggest a clear TITLE for this medical event

${hasImaging ? `This group contains ${imagingFiles.length} imaging files (DICOM/medical images). Please also provide an IMAGING SUMMARY describing what the imaging likely shows based on the DICOM metadata and context from other documents.` : ""}

Respond with JSON containing:
{
  "category": "imaging" | "visit_notes" | "physical_therapy" | "medication" | "lab_results" | "billing" | "other",
  "date": "YYYY-MM-DD" or null,
  "provider": "provider/facility name" or null,
  "bodyRegion": "spine" | "back" | "neck" | "shoulder" | "knee" | "hip" | "general" or null,
  "summary": "comprehensive summary of this medical event",
  "suggestedTitle": "clear title for this event",
  "keywords": ["keyword1", "keyword2", ...],
  "confidence": 0.0-1.0,
  ${hasImaging ? '"imagingSummary": "description of the imaging study and what it likely shows",' : ""}
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this group of ${fileContents.length} related medical files:\n\n${combinedContent.slice(0, 8000)}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    // Use DICOM metadata as fallback/override for key fields
    if (dicomMetadata) {
      if (!result.date && dicomMetadata.studyDate) {
        result.date = dicomMetadata.studyDate;
      }
      if (!result.provider && dicomMetadata.referringPhysician) {
        result.provider = dicomMetadata.referringPhysician;
      }
      if (!result.provider && dicomMetadata.institution) {
        result.provider = dicomMetadata.institution;
      }
      if (!result.bodyRegion && dicomMetadata.bodyParts.length > 0) {
        result.bodyRegion = dicomMetadata.bodyParts[0];
      }
    }

    // Create group analysis result
    const groupAnalysis: GroupAnalysisResult = {
      groupId,
      groupName: groupName || `Medical Records Group`,
      analyzedAt: new Date().toISOString(),
      fileCount: fileIds.length,
      fileIds,
      category: result.category || "other",
      date: result.date || null,
      provider: result.provider || null,
      bodyRegion: result.bodyRegion || null,
      summary: result.summary || "Unable to extract summary",
      suggestedTitle: result.suggestedTitle || groupName || "Medical Records",
      hasImaging,
      imagingSummary: result.imagingSummary || undefined,
      imagingFiles: hasImaging ? imagingFiles : undefined,
      keywords: result.keywords || [],
      confidence: result.confidence || 0.5,
    };

    // Save to analysis data
    if (!analysisData.groupAnalyses) {
      analysisData.groupAnalyses = {};
    }
    analysisData.groupAnalyses[groupId] = groupAnalysis;
    analysisData.lastUpdated = new Date().toISOString();

    // Update patient summary
    if (result.provider && !analysisData.patientSummary.providers.includes(result.provider)) {
      analysisData.patientSummary.providers.push(result.provider);
    }
    if (result.bodyRegion && !analysisData.patientSummary.bodyRegions.includes(result.bodyRegion)) {
      analysisData.patientSummary.bodyRegions.push(result.bodyRegion);
    }
    if (result.date) {
      if (!analysisData.patientSummary.dateRange.earliest || result.date < analysisData.patientSummary.dateRange.earliest) {
        analysisData.patientSummary.dateRange.earliest = result.date;
      }
      if (!analysisData.patientSummary.dateRange.latest || result.date > analysisData.patientSummary.dateRange.latest) {
        analysisData.patientSummary.dateRange.latest = result.date;
      }
    }

    saveAnalysisData(analysisData);

    // Update imaging summary if this group has imaging
    if (hasImaging && result.imagingSummary) {
      const imagingSummary = loadImagingSummary();
      
      // Check if this group is already in imaging summary
      const existingIndex = imagingSummary.studies.findIndex(s => s.groupId === groupId);
      const imagingStudy = {
        groupId,
        date: result.date || null,
        bodyRegion: result.bodyRegion || null,
        provider: result.provider || null,
        description: result.imagingSummary,
        fileCount: imagingFiles.length,
        files: imagingFiles,
      };

      if (existingIndex >= 0) {
        imagingSummary.studies[existingIndex] = imagingStudy;
      } else {
        imagingSummary.studies.push(imagingStudy);
        imagingSummary.totalImagingStudies++;
      }
      
      imagingSummary.lastUpdated = new Date().toISOString();
      saveImagingSummary(imagingSummary);
    }

    return NextResponse.json({
      message: "Group analyzed successfully",
      analysis: groupAnalysis,
      analyzed: true,
    });
  } catch (error: any) {
    console.error("Error analyzing group:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze group" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/ai/analyze-group?groupId=xxx
// Get group analysis result
// =============================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    const analysisData = loadAnalysisData();

    if (!groupId) {
      // Return all group analyses
      return NextResponse.json({
        groupAnalyses: analysisData.groupAnalyses || {},
        totalGroups: Object.keys(analysisData.groupAnalyses || {}).length,
      });
    }

    const groupAnalysis = analysisData.groupAnalyses?.[groupId];
    if (!groupAnalysis) {
      return NextResponse.json({ analyzed: false }, { status: 404 });
    }

    return NextResponse.json({
      analysis: groupAnalysis,
      analyzed: true,
    });
  } catch (error) {
    console.error("Error fetching group analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch group analysis" },
      { status: 500 }
    );
  }
}

