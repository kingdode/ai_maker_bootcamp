import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const IMAGING_SUMMARY_FILE = path.join(process.cwd(), "uploads", "imaging-summary.json");

// =============================================================================
// GET /api/ai/imaging
// Get the cumulative imaging summary
// =============================================================================
export async function GET() {
  try {
    if (!fs.existsSync(IMAGING_SUMMARY_FILE)) {
      return NextResponse.json({
        lastUpdated: null,
        totalImagingStudies: 0,
        studies: [],
      });
    }

    const data = JSON.parse(fs.readFileSync(IMAGING_SUMMARY_FILE, "utf-8"));
    
    // Sort studies by date (most recent first)
    if (data.studies) {
      data.studies.sort((a: any, b: any) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching imaging summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch imaging summary" },
      { status: 500 }
    );
  }
}

