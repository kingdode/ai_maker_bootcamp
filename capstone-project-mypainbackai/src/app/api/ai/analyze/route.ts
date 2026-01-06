import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Cumulative analysis storage file
const ANALYSIS_FILE = path.join(process.cwd(), "uploads", "analysis-results.json");

// =============================================================================
// Types
// =============================================================================
interface AnalysisResult {
  fileId: string;
  originalFilename: string;
  analyzedAt: string;
  category: string;
  confidence: number;
  extractedDate: string | null;
  provider: string | null;
  bodyRegion: string | null;
  summary: string;
  suggestedTitle: string;
  rawExtractedText?: string;
  keywords?: string[];
}

interface CumulativeAnalysis {
  lastUpdated: string;
  totalFilesAnalyzed: number;
  analyses: Record<string, AnalysisResult>;
  // Cumulative patient summary
  patientSummary: {
    conditions: string[];
    providers: string[];
    bodyRegions: string[];
    dateRange: { earliest: string | null; latest: string | null };
    medicationsFound: string[];
    treatmentsFound: string[];
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

// Load existing analysis data
function loadAnalysisData(): CumulativeAnalysis {
  try {
    if (fs.existsSync(ANALYSIS_FILE)) {
      const data = fs.readFileSync(ANALYSIS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading analysis data:", error);
  }
  
  return {
    lastUpdated: new Date().toISOString(),
    totalFilesAnalyzed: 0,
    analyses: {},
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
function saveAnalysisData(data: CumulativeAnalysis): void {
  const dir = path.dirname(ANALYSIS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(data, null, 2));
}

// Update cumulative patient summary
function updatePatientSummary(
  summary: CumulativeAnalysis["patientSummary"],
  analysis: AnalysisResult
): void {
  // Add provider if new
  if (analysis.provider && !summary.providers.includes(analysis.provider)) {
    summary.providers.push(analysis.provider);
  }

  // Add body region if new
  if (analysis.bodyRegion && !summary.bodyRegions.includes(analysis.bodyRegion)) {
    summary.bodyRegions.push(analysis.bodyRegion);
  }

  // Update date range
  if (analysis.extractedDate) {
    if (!summary.dateRange.earliest || analysis.extractedDate < summary.dateRange.earliest) {
      summary.dateRange.earliest = analysis.extractedDate;
    }
    if (!summary.dateRange.latest || analysis.extractedDate > summary.dateRange.latest) {
      summary.dateRange.latest = analysis.extractedDate;
    }
  }
}

// Extract text from PDF using pdf-parse
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

// Extract text from text-based files
function extractTextFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error("Error reading text file:", error);
    return "";
  }
}

// Get file content for analysis
async function getFileContent(filePath: string, filename: string): Promise<{ type: string; content: string }> {
  const ext = path.extname(filename).toLowerCase();
  
  if (ext === ".pdf") {
    const text = await extractPdfText(filePath);
    return { type: "pdf", content: text };
  }
  
  if ([".txt", ".html", ".xml", ".json", ".csv"].includes(ext)) {
    const text = extractTextFile(filePath);
    return { type: "text", content: text };
  }
  
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
    // For images, we'll use the filename and let OpenAI know it's an image
    return { type: "image", content: `[Image file: ${filename}]` };
  }
  
  if (ext === ".dcm" || filename.toLowerCase().includes("dicom")) {
    return { type: "dicom", content: `[DICOM medical imaging file: ${filename}]` };
  }
  
  // For other files, just provide filename info
  return { type: "unknown", content: `[File: ${filename}]` };
}

// Analyze content with OpenAI
async function analyzeWithOpenAI(
  openai: OpenAI,
  filename: string,
  fileContent: { type: string; content: string }
): Promise<Omit<AnalysisResult, "fileId" | "originalFilename" | "analyzedAt">> {
  const systemPrompt = `You are a medical document analyzer. Your job is to extract key information from medical records, imaging reports, visit notes, and other healthcare documents.

Analyze the provided content and extract:
1. Category: One of [imaging, visit_notes, physical_therapy, medication, lab_results, billing, other]
2. Date: The date of the visit, procedure, or document (YYYY-MM-DD format)
3. Provider: The doctor, clinic, or facility name
4. Body Region: The part of the body discussed (e.g., spine, back, neck, shoulder, knee, hip, general)
5. Summary: A brief 1-2 sentence summary of the document
6. Suggested Title: A clear, descriptive title for this document
7. Keywords: 3-5 keywords describing the content
8. Confidence: How confident you are in your analysis (0.0 to 1.0)

If you cannot determine a field, use null. Always provide your best analysis based on available information.`;

  const userPrompt = `Analyze this medical document:

Filename: ${filename}
File Type: ${fileContent.type}

Content:
${fileContent.content.slice(0, 4000)}${fileContent.content.length > 4000 ? "\n\n[Content truncated...]" : ""}

Respond with a JSON object containing: category, date, provider, bodyRegion, summary, suggestedTitle, keywords, confidence`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      category: result.category || "other",
      confidence: result.confidence || 0.5,
      extractedDate: result.date || null,
      provider: result.provider || null,
      bodyRegion: result.bodyRegion || null,
      summary: result.summary || "Unable to extract summary",
      suggestedTitle: result.suggestedTitle || filename,
      keywords: result.keywords || [],
      rawExtractedText: fileContent.content.slice(0, 1000),
    };
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    throw error;
  }
}

// =============================================================================
// POST /api/ai/analyze
// Analyze a single file with OpenAI and store results
// =============================================================================
export async function POST(request: Request) {
  try {
    const { fileId, apiKey } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    // Use provided API key or fall back to environment variable
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured" },
        { status: 400 }
      );
    }

    // Find the file
    const directories = ["pending", "confirmed", "rejected"];
    let filePath = null;
    let originalFilename = fileId;

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

    // Extract original filename from fileId
    const match = fileId.match(/^\d+-(zip-)?(.+)$/);
    if (match) {
      originalFilename = match[2].replace(/_/g, " ");
    }

    // Check if already analyzed
    const analysisData = loadAnalysisData();
    if (analysisData.analyses[fileId]) {
      return NextResponse.json({
        message: "File already analyzed",
        analysis: analysisData.analyses[fileId],
        analyzed: true,
      });
    }

    // Extract file content
    const fileContent = await getFileContent(filePath, originalFilename);

    // Skip analysis for certain file types that won't have useful medical info
    const ext = path.extname(originalFilename).toLowerCase();
    const skipExtensions = [".dll", ".exe", ".dylib", ".so", ".bin", ".pak", ".asar", ".dat"];
    if (skipExtensions.includes(ext)) {
      const skippedResult: AnalysisResult = {
        fileId,
        originalFilename,
        analyzedAt: new Date().toISOString(),
        category: "other",
        confidence: 1.0,
        extractedDate: null,
        provider: null,
        bodyRegion: null,
        summary: "System file - not a medical document",
        suggestedTitle: originalFilename,
        keywords: ["system", "non-medical"],
      };

      analysisData.analyses[fileId] = skippedResult;
      analysisData.totalFilesAnalyzed++;
      analysisData.lastUpdated = new Date().toISOString();
      saveAnalysisData(analysisData);

      return NextResponse.json({
        message: "File skipped (non-medical file type)",
        analysis: skippedResult,
        analyzed: true,
      });
    }

    // Analyze with OpenAI
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const analysisResult = await analyzeWithOpenAI(openai, originalFilename, fileContent);

    // Create full analysis result
    const fullResult: AnalysisResult = {
      fileId,
      originalFilename,
      analyzedAt: new Date().toISOString(),
      ...analysisResult,
    };

    // Update cumulative data
    analysisData.analyses[fileId] = fullResult;
    analysisData.totalFilesAnalyzed++;
    analysisData.lastUpdated = new Date().toISOString();
    updatePatientSummary(analysisData.patientSummary, fullResult);

    // Save to cumulative file
    saveAnalysisData(analysisData);

    return NextResponse.json({
      message: "File analyzed successfully",
      analysis: fullResult,
      analyzed: true,
      cumulativeStats: {
        totalFilesAnalyzed: analysisData.totalFilesAnalyzed,
        providers: analysisData.patientSummary.providers,
        dateRange: analysisData.patientSummary.dateRange,
      },
    });
  } catch (error: any) {
    console.error("Error analyzing file with AI:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze file with AI" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/ai/analyze?fileId=xxx
// Get analysis result for a specific file
// =============================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      // Return all analysis data
      const analysisData = loadAnalysisData();
      return NextResponse.json({
        ...analysisData,
        analyzed: true,
      });
    }

    // Return specific file analysis
    const analysisData = loadAnalysisData();
    const analysis = analysisData.analyses[fileId];

    if (!analysis) {
      return NextResponse.json({ analyzed: false }, { status: 404 });
    }

    return NextResponse.json({
      analysis,
      analyzed: true,
      patientSummary: analysisData.patientSummary,
    });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}
