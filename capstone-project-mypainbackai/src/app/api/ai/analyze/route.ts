import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import {
  prisma,
  getUploadedFileById,
  updateFileAnalysis,
  addToPatientAnalysis,
  getPatientAnalysis,
} from "@/lib/db";

// =============================================================================
// Helper Functions
// =============================================================================

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
    return { type: "image", content: `[Image file: ${filename}]` };
  }
  
  if (ext === ".dcm" || filename.toLowerCase().includes("dicom")) {
    return { type: "dicom", content: `[DICOM medical imaging file: ${filename}]` };
  }
  
  return { type: "unknown", content: `[File: ${filename}]` };
}

// Analyze content with OpenAI
async function analyzeWithOpenAI(
  openai: OpenAI,
  filename: string,
  fileContent: { type: string; content: string }
): Promise<{
  category: string;
  confidence: number;
  extractedDate: string | null;
  provider: string | null;
  bodyRegion: string | null;
  summary: string;
  suggestedTitle: string;
  keywords: string[];
}> {
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
    };
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    throw error;
  }
}

// =============================================================================
// POST /api/ai/analyze
// Analyze a single file with OpenAI and store results in database
// =============================================================================
export async function POST(request: Request) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    // Use server-side environment variable only (secure)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured. Add OPENAI_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    // Get file from database
    const file = await getUploadedFileById(fileId);
    
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if already analyzed
    if (file.analyzedAt && file.summary) {
      return NextResponse.json({
        message: "File already analyzed",
        analysis: {
          fileId: file.id,
          originalFilename: file.originalFilename,
          analyzedAt: file.analyzedAt.toISOString(),
          category: file.aiCategory,
          confidence: file.aiConfidence,
          extractedDate: file.extractedDate,
          provider: file.extractedProvider,
          bodyRegion: file.extractedBodyRegion,
          summary: file.summary,
          suggestedTitle: file.suggestedTitle,
          keywords: file.keywords ? JSON.parse(file.keywords) : [],
        },
        analyzed: true,
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.storagePath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    // Skip analysis for certain file types that won't have useful medical info
    const ext = path.extname(file.originalFilename).toLowerCase();
    const skipExtensions = [".dll", ".exe", ".dylib", ".so", ".bin", ".pak", ".asar", ".dat"];
    if (skipExtensions.includes(ext)) {
      const updatedFile = await updateFileAnalysis(fileId, {
        category: "other",
        confidence: 1.0,
        summary: "System file - not a medical document",
        suggestedTitle: file.originalFilename,
        keywords: ["system", "non-medical"],
      });

      return NextResponse.json({
        message: "File skipped (non-medical file type)",
        analysis: {
          fileId: updatedFile.id,
          originalFilename: updatedFile.originalFilename,
          analyzedAt: updatedFile.analyzedAt?.toISOString(),
          category: updatedFile.aiCategory,
          confidence: updatedFile.aiConfidence,
          summary: updatedFile.summary,
          suggestedTitle: updatedFile.suggestedTitle,
        },
        analyzed: true,
      });
    }

    // Extract file content
    const fileContent = await getFileContent(file.storagePath, file.originalFilename);

    // Update status to processing
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { aiStatus: "processing" },
    });

    // Analyze with OpenAI
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const analysisResult = await analyzeWithOpenAI(openai, file.originalFilename, fileContent);

    // Update file with analysis results
    const updatedFile = await updateFileAnalysis(fileId, {
      category: analysisResult.category,
      confidence: analysisResult.confidence,
      extractedDate: analysisResult.extractedDate,
      provider: analysisResult.provider,
      bodyRegion: analysisResult.bodyRegion,
      summary: analysisResult.summary,
      suggestedTitle: analysisResult.suggestedTitle,
      keywords: analysisResult.keywords,
      extractedText: fileContent.content.slice(0, 1000),
    });

    // Update cumulative patient analysis
    await addToPatientAnalysis({
      extractedDate: analysisResult.extractedDate,
      provider: analysisResult.provider,
      bodyRegion: analysisResult.bodyRegion,
    });

    // Get updated stats
    const patientAnalysis = await getPatientAnalysis();

    return NextResponse.json({
      message: "File analyzed successfully",
      analysis: {
        fileId: updatedFile.id,
        originalFilename: updatedFile.originalFilename,
        analyzedAt: updatedFile.analyzedAt?.toISOString(),
        category: updatedFile.aiCategory,
        confidence: updatedFile.aiConfidence,
        extractedDate: updatedFile.extractedDate,
        provider: updatedFile.extractedProvider,
        bodyRegion: updatedFile.extractedBodyRegion,
        summary: updatedFile.summary,
        suggestedTitle: updatedFile.suggestedTitle,
        keywords: updatedFile.keywords ? JSON.parse(updatedFile.keywords) : [],
      },
      analyzed: true,
      cumulativeStats: {
        totalFilesAnalyzed: patientAnalysis.totalFilesAnalyzed,
        providers: patientAnalysis.providers ? JSON.parse(patientAnalysis.providers) : [],
        dateRange: {
          earliest: patientAnalysis.earliestDate,
          latest: patientAnalysis.latestDate,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error analyzing file with AI:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze file with AI";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/ai/analyze?fileId=xxx
// Get analysis result for a specific file or all analysis data
// =============================================================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      // Return all analysis data (patient analysis stats + all analyzed files)
      const patientAnalysis = await getPatientAnalysis();
      const analyzedFiles = await prisma.uploadedFile.findMany({
        where: {
          analyzedAt: { not: null },
        },
        orderBy: { analyzedAt: "desc" },
      });

      return NextResponse.json({
        lastUpdated: patientAnalysis.lastUpdated.toISOString(),
        totalFilesAnalyzed: patientAnalysis.totalFilesAnalyzed,
        analyses: analyzedFiles.reduce((acc, file) => {
          acc[file.id] = {
            fileId: file.id,
            originalFilename: file.originalFilename,
            analyzedAt: file.analyzedAt?.toISOString(),
            category: file.aiCategory,
            confidence: file.aiConfidence,
            extractedDate: file.extractedDate,
            provider: file.extractedProvider,
            bodyRegion: file.extractedBodyRegion,
            summary: file.summary,
            suggestedTitle: file.suggestedTitle,
            keywords: file.keywords ? JSON.parse(file.keywords) : [],
          };
          return acc;
        }, {} as Record<string, unknown>),
        patientSummary: {
          conditions: patientAnalysis.conditions ? JSON.parse(patientAnalysis.conditions) : [],
          providers: patientAnalysis.providers ? JSON.parse(patientAnalysis.providers) : [],
          bodyRegions: patientAnalysis.bodyRegions ? JSON.parse(patientAnalysis.bodyRegions) : [],
          dateRange: {
            earliest: patientAnalysis.earliestDate,
            latest: patientAnalysis.latestDate,
          },
          medicationsFound: patientAnalysis.medicationsFound ? JSON.parse(patientAnalysis.medicationsFound) : [],
          treatmentsFound: patientAnalysis.treatmentsFound ? JSON.parse(patientAnalysis.treatmentsFound) : [],
        },
        analyzed: true,
      });
    }

    // Return specific file analysis
    const file = await getUploadedFileById(fileId);
    
    if (!file || !file.analyzedAt) {
      return NextResponse.json({ analyzed: false }, { status: 404 });
    }

    return NextResponse.json({
      analysis: {
        fileId: file.id,
        originalFilename: file.originalFilename,
        analyzedAt: file.analyzedAt.toISOString(),
        category: file.aiCategory,
        confidence: file.aiConfidence,
        extractedDate: file.extractedDate,
        provider: file.extractedProvider,
        bodyRegion: file.extractedBodyRegion,
        summary: file.summary,
        suggestedTitle: file.suggestedTitle,
        keywords: file.keywords ? JSON.parse(file.keywords) : [],
      },
      analyzed: true,
    });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 }
    );
  }
}
