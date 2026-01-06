import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const ANALYSIS_FILE = path.join(process.cwd(), "uploads", "analysis-results.json");

// =============================================================================
// GET /api/ai/summary
// Get cumulative patient summary from all analyzed files
// =============================================================================
export async function GET() {
  try {
    if (!fs.existsSync(ANALYSIS_FILE)) {
      return NextResponse.json({
        totalFilesAnalyzed: 0,
        patientSummary: null,
        analyses: [],
      });
    }

    const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, "utf-8"));

    // Group analyses by category
    const byCategory: Record<string, any[]> = {};
    for (const analysis of Object.values(data.analyses || {})) {
      const a = analysis as any;
      if (!byCategory[a.category]) {
        byCategory[a.category] = [];
      }
      byCategory[a.category].push({
        title: a.suggestedTitle,
        date: a.extractedDate,
        provider: a.provider,
        summary: a.summary,
        bodyRegion: a.bodyRegion,
      });
    }

    // Sort analyses by date within each category
    for (const category of Object.keys(byCategory)) {
      byCategory[category].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }

    return NextResponse.json({
      lastUpdated: data.lastUpdated,
      totalFilesAnalyzed: data.totalFilesAnalyzed,
      patientSummary: data.patientSummary,
      byCategory,
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/ai/summary
// Generate a comprehensive doctor-ready summary using AI
// =============================================================================
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json().catch(() => ({}));

    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key is required" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(ANALYSIS_FILE)) {
      return NextResponse.json(
        { error: "No analyzed files found. Please analyze files first." },
        { status: 400 }
      );
    }

    const data = JSON.parse(fs.readFileSync(ANALYSIS_FILE, "utf-8"));
    const analyses = Object.values(data.analyses || {});

    if (analyses.length === 0) {
      return NextResponse.json(
        { error: "No analyzed files found." },
        { status: 400 }
      );
    }

    // Build context from all analyses
    const analysisContext = analyses
      .map((a: any) => {
        return `
Document: ${a.suggestedTitle}
Date: ${a.extractedDate || "Unknown"}
Provider: ${a.provider || "Unknown"}
Category: ${a.category}
Body Region: ${a.bodyRegion || "Not specified"}
Summary: ${a.summary}
${a.rawExtractedText ? `Key Excerpt: ${a.rawExtractedText.slice(0, 500)}...` : ""}
---`;
      })
      .join("\n");

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a medical records summarizer. Create a comprehensive, doctor-ready summary from the patient's medical records. 

The summary should include:
1. Patient Overview: A brief overview of the patient's medical history based on the records
2. Chronological History: Key events in chronological order
3. Conditions/Diagnoses: Any conditions or diagnoses mentioned
4. Treatments: Treatments, medications, and procedures
5. Providers: List of healthcare providers
6. Recommendations: Any recommended follow-ups or ongoing treatments

Format the response as a professional medical summary that could be handed to a new doctor.`,
        },
        {
          role: "user",
          content: `Please create a comprehensive medical summary from these ${analyses.length} documents:\n\n${analysisContext}`,
        },
      ],
      max_tokens: 2000,
    });

    const summary = response.choices[0].message.content;

    // Save the generated summary
    const summaryFile = path.join(process.cwd(), "uploads", "doctor-summary.json");
    const summaryData = {
      generatedAt: new Date().toISOString(),
      filesIncluded: analyses.length,
      summary,
      patientSummary: data.patientSummary,
    };
    fs.writeFileSync(summaryFile, JSON.stringify(summaryData, null, 2));

    return NextResponse.json({
      message: "Summary generated successfully",
      summary,
      filesIncluded: analyses.length,
      patientSummary: data.patientSummary,
    });
  } catch (error: any) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}

