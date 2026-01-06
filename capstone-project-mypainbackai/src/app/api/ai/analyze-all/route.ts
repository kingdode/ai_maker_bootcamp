import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// =============================================================================
// POST /api/ai/analyze-all
// Trigger AI analysis for all pending files
// =============================================================================
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json().catch(() => ({}));

    // Use provided API key or fall back to environment variable
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key is required" },
        { status: 400 }
      );
    }

    const pendingDir = path.join(process.cwd(), "uploads", "pending");
    if (!fs.existsSync(pendingDir)) {
      return NextResponse.json(
        { message: "No pending files to analyze", analyzed: 0 },
        { status: 200 }
      );
    }

    const filesToAnalyze = fs.readdirSync(pendingDir);
    const analysisResults: Array<{
      fileId: string;
      status: string;
      error?: string;
    }> = [];

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process files sequentially to avoid rate limiting
    for (const fileId of filesToAnalyze) {
      try {
        // Call the single file analysis API
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/api/ai/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId, apiKey: openaiApiKey }),
        });

        const result = await response.json();

        if (response.ok) {
          if (result.message?.includes("skipped") || result.message?.includes("already")) {
            skippedCount++;
            analysisResults.push({ fileId, status: "skipped" });
          } else {
            successCount++;
            analysisResults.push({ fileId, status: "success" });
          }
        } else {
          errorCount++;
          analysisResults.push({
            fileId,
            status: "error",
            error: result.error || "Unknown error",
          });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error: any) {
        errorCount++;
        analysisResults.push({
          fileId,
          status: "error",
          error: error.message || "Analysis failed",
        });
      }
    }

    return NextResponse.json({
      message: `Analysis complete: ${successCount} succeeded, ${skippedCount} skipped, ${errorCount} errors`,
      total: filesToAnalyze.length,
      success: successCount,
      skipped: skippedCount,
      errors: errorCount,
      results: analysisResults,
    });
  } catch (error: any) {
    console.error("Error triggering AI analysis for all files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger AI analysis" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/ai/analyze-all
// Get analysis status for all files
// =============================================================================
export async function GET() {
  try {
    const analysisFile = path.join(process.cwd(), "uploads", "analysis-results.json");

    if (!fs.existsSync(analysisFile)) {
      return NextResponse.json({
        totalFilesAnalyzed: 0,
        analyses: {},
        patientSummary: null,
      });
    }

    const data = JSON.parse(fs.readFileSync(analysisFile, "utf-8"));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching analysis data:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis data" },
      { status: 500 }
    );
  }
}
